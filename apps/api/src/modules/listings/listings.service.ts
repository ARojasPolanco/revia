import { Op } from 'sequelize';
import type { Includeable, Order, WhereOptions } from 'sequelize';
import type { z } from 'zod';
import {
  DEFAULTS,
  createListingSchema,
  listListingsQuerySchema,
  updateListingSchema,
} from '@revia/shared';
import { AppError } from '../../errors/appError.js';
import { User } from '../users/user.model.js';
import { toPublicUser, type PublicUser } from '../auth/auth.service.js';
import { Category } from '../categories/category.model.js';
import { CategoryAttribute } from '../categories/categoryAttribute.model.js';
import { getFollowingIds } from '../users/follows.service.js';
import { Favorite } from './favorite.model.js';
import { Listing } from './listing.model.js';
import { ListingPhoto } from './listingPhoto.model.js';
import { ListingReport } from './listingReport.model.js';
import { countActivePhotos, removeListingPhoto, saveListingPhotos } from './photos.service.js';

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;

export interface ListingPhotoView {
  id: string;
  url: string;
  thumbnailUrl: string;
  sortOrder: number;
}

export interface ListingView {
  id: string;
  title: string;
  description: string;
  condition: string;
  priceArs: number;
  deliveryModes: string[];
  midpointFeeArs: number;
  allowOffers: boolean;
  location: string;
  attributes: Record<string, unknown>;
  status: string;
  rejectionReason: string | null;
  submittedAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  photos: ListingPhotoView[];
  category: {
    id: string;
    name: string;
    slug: string;
    parent: { id: string; name: string; slug: string } | null;
  } | null;
  seller: PublicUser | null;
}

type ListingWithRelations = Listing & {
  seller?: User | null;
  category?: (Category & { parent?: Category | null }) | null;
  photos?: ListingPhoto[];
};

const sellerInclude: Includeable = {
  model: User,
  as: 'seller',
  attributes: ['id', 'fullName', 'bio', 'location', 'avatarUrl', 'sellerVerifiedAt', 'createdAt'],
};

const categoryInclude: Includeable = {
  model: Category,
  as: 'category',
  attributes: ['id', 'name', 'slug', 'parentId'],
  include: [
    {
      model: Category,
      as: 'parent',
      attributes: ['id', 'name', 'slug'],
    },
  ],
};

const photosInclude: Includeable = {
  model: ListingPhoto,
  as: 'photos',
  where: { isDeleted: false },
  required: false,
  separate: true,
  order: [['sortOrder', 'ASC']],
};

const listingIncludes: Includeable[] = [sellerInclude, categoryInclude, photosInclude];

function toPhotoView(photo: ListingPhoto): ListingPhotoView {
  return {
    id: photo.id,
    url: photo.url,
    thumbnailUrl: photo.thumbnailUrl,
    sortOrder: photo.sortOrder,
  };
}

export function toListingView(listing: Listing): ListingView {
  const related = listing as ListingWithRelations;
  const seller = related.seller ? toPublicUser(related.seller) : null;
  const category = related.category
    ? {
        id: related.category.id,
        name: related.category.name,
        slug: related.category.slug,
        parent: related.category.parent
          ? {
              id: related.category.parent.id,
              name: related.category.parent.name,
              slug: related.category.parent.slug,
            }
          : null,
      }
    : null;

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    condition: listing.condition,
    priceArs: listing.priceArs,
    deliveryModes: listing.deliveryModes,
    midpointFeeArs: listing.midpointFeeArs,
    allowOffers: listing.allowOffers,
    location: listing.location,
    attributes: listing.attributes,
    status: listing.status,
    rejectionReason: listing.rejectionReason,
    submittedAt: listing.submittedAt,
    publishedAt: listing.publishedAt,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    photos: (related.photos ?? [])
      .filter((photo) => !photo.isDeleted)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(toPhotoView),
    category,
    seller,
  };
}

async function findWithRelations(listingId: string): Promise<Listing | null> {
  return Listing.findByPk(listingId, {
    include: listingIncludes,
  });
}

async function getOwnedListing(userId: string, listingId: string): Promise<Listing> {
  const listing = await Listing.findByPk(listingId);

  if (!listing || listing.isDeleted || listing.sellerId !== userId) {
    throw new AppError('No encontramos esa publicación.', 404);
  }

  return listing;
}

function assertStatus(listing: Listing, allowed: string[], message: string): void {
  if (!allowed.includes(listing.status)) {
    throw new AppError(message, 409);
  }
}

async function normalizeAttributes(
  categoryId: string,
  attributes: Record<string, unknown> | undefined,
  requireAll: boolean
): Promise<{ category: Category; normalized: Record<string, unknown> }> {
  const category = await Category.findByPk(categoryId);

  if (!category || !category.isActive) {
    throw new AppError('Elegí una categoría válida.', 422);
  }

  if (!category.parentId) {
    throw new AppError('Elegí una subcategoría.', 422);
  }

  const definitions = await CategoryAttribute.findAll({
    where: { categoryId },
    order: [['sortOrder', 'ASC']],
  });
  const normalized: Record<string, unknown> = {};

  for (const definition of definitions) {
    const raw = attributes?.[definition.key];
    const missing = raw === undefined || raw === null || raw === '';

    if (missing) {
      if (requireAll && definition.required) {
        throw new AppError(`Falta completar: ${definition.label}.`, 422);
      }

      continue;
    }

    if (definition.type === 'number') {
      const numeric = typeof raw === 'number' ? raw : Number(raw);

      if (!Number.isFinite(numeric)) {
        throw new AppError(`Revisá el campo ${definition.label}.`, 422);
      }

      normalized[definition.key] = numeric;
      continue;
    }

    if (definition.type === 'boolean') {
      if (typeof raw !== 'boolean') {
        throw new AppError(`Revisá el campo ${definition.label}.`, 422);
      }

      normalized[definition.key] = raw;
      continue;
    }

    if (definition.type === 'select') {
      const options = Array.isArray(definition.options)
        ? definition.options.map((option) => String(option))
        : [];

      if (!options.includes(String(raw))) {
        throw new AppError(`Elegí una opción válida para ${definition.label}.`, 422);
      }

      normalized[definition.key] = String(raw);
      continue;
    }

    normalized[definition.key] = String(raw);
  }

  return { category, normalized };
}

function midpointFee(deliveryModes: readonly string[]): number {
  return deliveryModes.includes('midpoint') ? DEFAULTS.midpointFeeArs : 0;
}

export async function createListing(
  sellerId: string,
  input: CreateListingInput
): Promise<ListingView> {
  const { normalized } = await normalizeAttributes(input.categoryId, input.attributes, false);

  const listing = await Listing.create({
    sellerId,
    categoryId: input.categoryId,
    title: input.title,
    description: input.description,
    condition: input.condition,
    priceArs: input.priceArs,
    deliveryModes: input.deliveryModes,
    midpointFeeArs: midpointFee(input.deliveryModes),
    allowOffers: input.allowOffers,
    location: input.location,
    attributes: normalized,
    status: 'draft',
  });

  const withRelations = await findWithRelations(listing.id);

  return toListingView(withRelations ?? listing);
}

export async function updateListing(
  userId: string,
  listingId: string,
  input: UpdateListingInput
): Promise<ListingView> {
  const listing = await getOwnedListing(userId, listingId);

  assertStatus(
    listing,
    ['draft', 'rejected', 'paused'],
    'Pausá la publicación para poder editarla.'
  );

  const updates: Record<string, unknown> = {};

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.condition !== undefined) updates.condition = input.condition;
  if (input.priceArs !== undefined) updates.priceArs = input.priceArs;
  if (input.location !== undefined) updates.location = input.location;
  if (input.allowOffers !== undefined) updates.allowOffers = input.allowOffers;

  if (input.deliveryModes !== undefined) {
    updates.deliveryModes = input.deliveryModes;
    updates.midpointFeeArs = midpointFee(input.deliveryModes);
  }

  if (input.categoryId !== undefined || input.attributes !== undefined) {
    const categoryId = input.categoryId ?? listing.categoryId;
    const { normalized } = await normalizeAttributes(
      categoryId,
      input.attributes ?? listing.attributes,
      false
    );

    updates.categoryId = categoryId;
    updates.attributes = normalized;
  }

  await listing.update(updates);

  return getOwnerListing(userId, listingId);
}

export async function getPublicListing(listingId: string): Promise<ListingView> {
  const listing = await findWithRelations(listingId);

  if (!listing || listing.isDeleted || !['active', 'sold'].includes(listing.status)) {
    throw new AppError('No encontramos lo que buscabas.', 404);
  }

  return toListingView(listing);
}

export async function getOwnerListing(userId: string, listingId: string): Promise<ListingView> {
  await getOwnedListing(userId, listingId);
  const listing = await findWithRelations(listingId);

  if (!listing) {
    throw new AppError('No encontramos esa publicación.', 404);
  }

  return toListingView(listing);
}

export async function getOwnerListings(userId: string): Promise<ListingView[]> {
  const listings = await Listing.findAll({
    where: { sellerId: userId, isDeleted: false },
    include: listingIncludes,
    order: [['createdAt', 'DESC']],
  });

  return listings.map(toListingView);
}

export async function listPublicListings(query: ListListingsQuery): Promise<{
  listings: ListingView[];
  pagination: { page: number; limit: number; total: number };
}> {
  const where: Record<string | symbol, unknown> = {
    status: 'active',
    isDeleted: false,
  };

  if (query.q) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${query.q}%` } },
      { description: { [Op.iLike]: `%${query.q}%` } },
    ];
  }

  if (query.categoryId) {
    const category = await Category.findByPk(query.categoryId);

    if (!category) {
      throw new AppError('No encontramos esa categoría.', 404);
    }

    if (category.parentId) {
      where.categoryId = category.id;
    } else {
      const children = await Category.findAll({
        where: { parentId: category.id, isActive: true },
        attributes: ['id'],
      });

      where.categoryId = { [Op.in]: children.map((child) => child.id) };
    }
  }

  if (query.condition) {
    where.condition = query.condition;
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const price: Record<symbol, number> = {};

    if (query.minPrice !== undefined) price[Op.gte] = query.minPrice;
    if (query.maxPrice !== undefined) price[Op.lte] = query.maxPrice;

    where.priceArs = price;
  }

  if (query.delivery) {
    where.deliveryModes = { [Op.contains]: [query.delivery] };
  }

  const order: Order =
    query.sort === 'price_asc'
      ? [['priceArs', 'ASC']]
      : query.sort === 'price_desc'
        ? [['priceArs', 'DESC']]
        : [['createdAt', 'DESC']];

  const offset = (query.page - 1) * query.limit;

  const { rows, count } = await Listing.findAndCountAll({
    where: where as WhereOptions,
    include: listingIncludes,
    order,
    limit: query.limit,
    offset,
    distinct: true,
  });

  return {
    listings: rows.map(toListingView),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: count,
    },
  };
}

export async function submitListing(userId: string, listingId: string): Promise<ListingView> {
  const listing = await getOwnedListing(userId, listingId);

  assertStatus(listing, ['draft', 'rejected'], 'Esta publicación no se puede enviar a revisión.');

  const photos = await countActivePhotos(listingId);

  if (photos < 3) {
    throw new AppError('Subí al menos 3 fotos para enviar a revisión.', 422);
  }

  const { normalized } = await normalizeAttributes(listing.categoryId, listing.attributes, true);

  await listing.update({
    status: 'pending',
    submittedAt: new Date(),
    rejectionReason: null,
    attributes: normalized,
  });

  return getOwnerListing(userId, listingId);
}

export async function addListingPhotos(
  userId: string,
  listingId: string,
  files: Express.Multer.File[]
): Promise<ListingPhotoView[]> {
  const listing = await getOwnedListing(userId, listingId);

  assertStatus(
    listing,
    ['draft', 'rejected', 'paused'],
    'No podés cambiar las fotos en este estado.'
  );

  const photos = await saveListingPhotos(listingId, files);

  return photos.map(toPhotoView);
}

export async function deleteListingPhoto(
  userId: string,
  listingId: string,
  photoId: string
): Promise<void> {
  const listing = await getOwnedListing(userId, listingId);

  assertStatus(
    listing,
    ['draft', 'rejected', 'paused'],
    'No podés cambiar las fotos en este estado.'
  );

  await removeListingPhoto(listingId, photoId);
}

export async function pauseListing(userId: string, listingId: string): Promise<ListingView> {
  const listing = await getOwnedListing(userId, listingId);

  assertStatus(listing, ['active'], 'Solo podés pausar publicaciones activas.');

  await listing.update({ status: 'paused' });

  return getOwnerListing(userId, listingId);
}

export async function resumeListing(userId: string, listingId: string): Promise<ListingView> {
  const listing = await getOwnedListing(userId, listingId);

  assertStatus(listing, ['paused'], 'Solo podés reanudar publicaciones pausadas.');

  await listing.update({ status: 'active' });

  return getOwnerListing(userId, listingId);
}

export async function deleteListing(userId: string, listingId: string): Promise<void> {
  const listing = await getOwnedListing(userId, listingId);

  if (listing.status === 'sold') {
    throw new AppError('No podés eliminar una publicación vendida.', 409);
  }

  await listing.update({ status: 'deleted', isDeleted: true });
}

export async function reportListing(
  userId: string,
  listingId: string,
  reason: string
): Promise<void> {
  const listing = await Listing.findByPk(listingId);

  if (!listing || listing.isDeleted) {
    throw new AppError('No encontramos lo que buscabas.', 404);
  }

  if (listing.sellerId === userId) {
    throw new AppError('No podés denunciar tu propia publicación.', 400);
  }

  const existing = await ListingReport.findOne({
    where: { listingId, reporterId: userId, status: 'open' },
  });

  if (existing) {
    throw new AppError('Ya denunciaste esta publicación.', 409);
  }

  await ListingReport.create({
    listingId,
    reporterId: userId,
    reason,
  });
}

export async function listAdminListings(status?: string): Promise<ListingView[]> {
  const where: Record<string, unknown> = { isDeleted: false };

  if (status) {
    where.status = status;
  }

  const listings = await Listing.findAll({
    where: where as WhereOptions,
    include: listingIncludes,
    order: [['createdAt', 'DESC']],
  });

  return listings.map(toListingView);
}

export async function approveListing(adminId: string, listingId: string): Promise<ListingView> {
  const listing = await Listing.findByPk(listingId);

  if (!listing || listing.isDeleted) {
    throw new AppError('No encontramos esa publicación.', 404);
  }

  if (listing.status !== 'pending') {
    throw new AppError('Esta publicación no está pendiente de revisión.', 409);
  }

  await listing.update({
    status: 'active',
    publishedAt: new Date(),
    reviewedBy: adminId,
    reviewedAt: new Date(),
    rejectionReason: null,
  });

  const withRelations = await findWithRelations(listingId);

  return toListingView(withRelations ?? listing);
}

export async function rejectListing(
  adminId: string,
  listingId: string,
  reason: string
): Promise<ListingView> {
  const listing = await Listing.findByPk(listingId);

  if (!listing || listing.isDeleted) {
    throw new AppError('No encontramos esa publicación.', 404);
  }

  if (listing.status !== 'pending') {
    throw new AppError('Esta publicación no está pendiente de revisión.', 409);
  }

  await listing.update({
    status: 'rejected',
    rejectionReason: reason,
    reviewedBy: adminId,
    reviewedAt: new Date(),
  });

  const withRelations = await findWithRelations(listingId);

  return toListingView(withRelations ?? listing);
}

export async function listReports(status = 'open') {
  const reports = await ListingReport.findAll({
    where: { status },
    include: [
      {
        model: Listing,
        as: 'listing',
        attributes: ['id', 'title', 'status'],
      },
      {
        model: User,
        as: 'reporter',
        attributes: ['id', 'fullName'],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return reports.map((report) => {
    const related = report as ListingReport & {
      listing?: Listing | null;
      reporter?: User | null;
    };

    return {
      id: report.id,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt,
      listing: related.listing
        ? {
            id: related.listing.id,
            title: related.listing.title,
            status: related.listing.status,
          }
        : null,
      reporter: related.reporter
        ? {
            id: related.reporter.id,
            fullName: related.reporter.fullName,
          }
        : null,
    };
  });
}

export async function resolveReport(
  reportId: string,
  status: 'resolved' | 'dismissed'
): Promise<void> {
  const report = await ListingReport.findByPk(reportId);

  if (!report) {
    throw new AppError('No encontramos esa denuncia.', 404);
  }

  await report.update({ status });
}

export async function getActiveListingsBySeller(sellerId: string): Promise<ListingView[]> {
  const listings = await Listing.findAll({
    where: { sellerId, status: 'active', isDeleted: false },
    include: listingIncludes,
    order: [['createdAt', 'DESC']],
  });

  return listings.map(toListingView);
}

export async function getRecommendedFeed(limit = 12): Promise<ListingView[]> {
  const listings = await Listing.findAll({
    where: { status: 'active', isDeleted: false },
    include: listingIncludes,
    order: [['createdAt', 'DESC']],
    limit,
  });

  return listings.map(toListingView);
}

export async function getFollowingFeed(userId: string, limit = 20): Promise<ListingView[]> {
  const sellerIds = await getFollowingIds(userId);

  if (sellerIds.length === 0) {
    return [];
  }

  const listings = await Listing.findAll({
    where: {
      status: 'active',
      isDeleted: false,
      sellerId: { [Op.in]: sellerIds },
    },
    include: listingIncludes,
    order: [['createdAt', 'DESC']],
    limit,
  });

  return listings.map(toListingView);
}

export async function getFavoriteListings(userId: string): Promise<ListingView[]> {
  const favorites = await Favorite.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });

  const ids = favorites.map((favorite) => favorite.listingId);

  if (ids.length === 0) {
    return [];
  }

  const listings = await Listing.findAll({
    where: {
      id: { [Op.in]: ids },
      isDeleted: false,
      status: { [Op.in]: ['active', 'sold'] },
    },
    include: listingIncludes,
  });
  const listingsById = new Map(listings.map((listing) => [listing.id, listing]));

  return ids
    .map((id) => listingsById.get(id))
    .filter((listing): listing is Listing => Boolean(listing))
    .map(toListingView);
}

export async function favoriteListing(userId: string, listingId: string): Promise<void> {
  const listing = await Listing.findByPk(listingId);

  if (!listing || listing.isDeleted) {
    throw new AppError('No encontramos lo que buscabas.', 404);
  }

  await Favorite.findOrCreate({
    where: { userId, listingId },
  });
}

export async function unfavoriteListing(userId: string, listingId: string): Promise<void> {
  await Favorite.destroy({
    where: { userId, listingId },
  });
}

export async function isFavorite(userId: string, listingId: string): Promise<boolean> {
  const count = await Favorite.count({
    where: { userId, listingId },
  });

  return count > 0;
}
