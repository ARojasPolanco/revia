import { Op } from 'sequelize';
import type { Includeable } from 'sequelize';
import { DEFAULTS } from '@revia/shared';
import { AppError } from '../../errors/appError.js';
import { toPublicUser, type PublicUser } from '../auth/auth.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import { Listing } from '../listings/listing.model.js';
import { User } from '../users/user.model.js';
import { Offer } from './offer.model.js';

export interface OfferView {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPriceArs: number;
  buyer: PublicUser | null;
  seller: PublicUser | null;
  amountArs: number;
  status: string;
  direction: string;
  expiresAt: Date;
  paymentExpiresAt: Date | null;
  acceptedAt: Date | null;
  createdAt: Date;
}

type OfferWithRelations = Offer & {
  listing?: Listing | null;
  buyer?: User | null;
  seller?: User | null;
};

const userAttributes = [
  'id',
  'fullName',
  'bio',
  'location',
  'avatarUrl',
  'sellerVerifiedAt',
  'createdAt',
];

const offerIncludes: Includeable[] = [
  {
    model: Listing,
    as: 'listing',
    attributes: ['id', 'title', 'priceArs', 'status', 'sellerId', 'allowOffers'],
  },
  { model: User, as: 'buyer', attributes: userAttributes },
  { model: User, as: 'seller', attributes: userAttributes },
];

function formatArs(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function toOfferView(offer: Offer): OfferView {
  const related = offer as OfferWithRelations;

  return {
    id: offer.id,
    listingId: offer.listingId,
    listingTitle: related.listing?.title ?? 'Publicación',
    listingPriceArs: related.listing?.priceArs ?? 0,
    buyer: related.buyer ? toPublicUser(related.buyer) : null,
    seller: related.seller ? toPublicUser(related.seller) : null,
    amountArs: offer.amountArs,
    status: offer.status,
    direction: offer.direction,
    expiresAt: offer.expiresAt,
    paymentExpiresAt: offer.paymentExpiresAt,
    acceptedAt: offer.acceptedAt,
    createdAt: offer.createdAt,
  };
}

async function findOfferWithRelations(offerId: string): Promise<Offer | null> {
  return Offer.findByPk(offerId, { include: offerIncludes });
}

async function getListingForOffer(listingId: string): Promise<Listing> {
  const listing = await Listing.findByPk(listingId);

  if (!listing || listing.isDeleted) {
    throw new AppError('No encontramos lo que buscabas.', 404);
  }

  return listing;
}

function assertOfferAmount(listing: Listing, amountArs: number): void {
  if (amountArs > listing.priceArs) {
    throw new AppError('La oferta no puede superar el precio publicado.', 422);
  }

  const minimum = Math.ceil((listing.priceArs * (100 - DEFAULTS.offerMaxDiscountPercent)) / 100);

  if (amountArs < minimum) {
    throw new AppError(`La oferta mínima permitida es ${formatArs(minimum)} (30% menos).`, 422);
  }
}

async function getActionableOffer(userId: string, offerId: string): Promise<OfferWithRelations> {
  const offer = (await findOfferWithRelations(offerId)) as OfferWithRelations | null;

  if (!offer) {
    throw new AppError('No encontramos esa oferta.', 404);
  }

  const recipientId = offer.direction === 'buyer_to_seller' ? offer.sellerId : offer.buyerId;

  if (recipientId !== userId) {
    throw new AppError('No podés responder esta oferta.', 403);
  }

  if (offer.status !== 'pending') {
    throw new AppError('Esta oferta ya fue respondida o venció.', 409);
  }

  if (offer.expiresAt.getTime() < Date.now()) {
    await offer.update({ status: 'expired' });
    throw new AppError('La oferta venció.', 409);
  }

  return offer;
}

export async function createOffer(
  userId: string,
  listingId: string,
  amountArs: number
): Promise<OfferView> {
  const listing = await getListingForOffer(listingId);

  if (listing.status !== 'active') {
    throw new AppError('Esta publicación no está disponible para ofertas.', 409);
  }

  if (listing.sellerId === userId) {
    throw new AppError('No podés ofertar en tu propia publicación.', 400);
  }

  if (!listing.allowOffers) {
    throw new AppError('Esta publicación no acepta ofertas.', 422);
  }

  assertOfferAmount(listing, amountArs);

  const dailyCount = await Offer.count({
    where: {
      buyerId: userId,
      direction: 'buyer_to_seller',
      createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (dailyCount >= DEFAULTS.offersPerBuyerPerDay) {
    throw new AppError('Alcanzaste el límite de ofertas por hoy.', 429);
  }

  const existing = await Offer.findOne({
    where: { listingId, buyerId: userId, status: 'pending' },
  });

  if (existing) {
    throw new AppError('Ya tenés una oferta pendiente para esta publicación.', 409);
  }

  const offer = await Offer.create({
    listingId,
    buyerId: userId,
    sellerId: listing.sellerId,
    direction: 'buyer_to_seller',
    amountArs,
    status: 'pending',
    expiresAt: new Date(Date.now() + DEFAULTS.offerTtlHours * 60 * 60 * 1000),
  });

  const buyer = await User.findByPk(userId);

  await createNotification({
    userId: listing.sellerId,
    type: 'offer_received',
    title: 'Nueva oferta',
    body: `${buyer?.fullName ?? 'Un comprador'} ofreció ${formatArs(amountArs)} por "${listing.title}".`,
    data: { offerId: offer.id, listingId: listing.id },
  });

  const withRelations = await findOfferWithRelations(offer.id);

  return toOfferView(withRelations ?? offer);
}

export async function acceptOffer(userId: string, offerId: string): Promise<OfferView> {
  const offer = await getActionableOffer(userId, offerId);

  await offer.update({
    status: 'accepted',
    acceptedAt: new Date(),
    paymentExpiresAt: new Date(Date.now() + DEFAULTS.offerPaymentTtlHours * 60 * 60 * 1000),
  });

  const creatorId = offer.direction === 'buyer_to_seller' ? offer.buyerId : offer.sellerId;

  await createNotification({
    userId: creatorId,
    type: 'offer_accepted',
    title: 'Oferta aceptada',
    body: `Aceptaron tu oferta de ${formatArs(offer.amountArs)} por "${offer.listing?.title ?? 'la publicación'}".`,
    data: { offerId: offer.id, listingId: offer.listingId },
  });

  return toOfferView(offer);
}

export async function rejectOffer(userId: string, offerId: string): Promise<OfferView> {
  const offer = await getActionableOffer(userId, offerId);

  await offer.update({
    status: 'rejected',
    rejectedAt: new Date(),
  });

  const creatorId = offer.direction === 'buyer_to_seller' ? offer.buyerId : offer.sellerId;

  await createNotification({
    userId: creatorId,
    type: 'offer_rejected',
    title: 'Oferta rechazada',
    body: `Rechazaron tu oferta por "${offer.listing?.title ?? 'la publicación'}".`,
    data: { offerId: offer.id, listingId: offer.listingId },
  });

  return toOfferView(offer);
}

export async function counterOffer(
  userId: string,
  offerId: string,
  amountArs: number
): Promise<OfferView> {
  const offer = await getActionableOffer(userId, offerId);
  const listing = offer.listing;

  if (!listing) {
    throw new AppError('No encontramos la publicación.', 404);
  }

  assertOfferAmount(listing, amountArs);

  await offer.update({ status: 'countered' });

  const direction = offer.direction === 'buyer_to_seller' ? 'seller_to_buyer' : 'buyer_to_seller';

  const counter = await Offer.create({
    listingId: offer.listingId,
    buyerId: offer.buyerId,
    sellerId: offer.sellerId,
    parentOfferId: offer.id,
    direction,
    amountArs,
    status: 'pending',
    expiresAt: new Date(Date.now() + DEFAULTS.offerTtlHours * 60 * 60 * 1000),
  });

  const creatorId = offer.direction === 'buyer_to_seller' ? offer.buyerId : offer.sellerId;

  await createNotification({
    userId: creatorId,
    type: 'offer_countered',
    title: 'Contraoferta',
    body: `Recibiste una contraoferta de ${formatArs(amountArs)} por "${listing.title}".`,
    data: { offerId: counter.id, listingId: listing.id },
  });

  const withRelations = await findOfferWithRelations(counter.id);

  return toOfferView(withRelations ?? counter);
}

export async function cancelOffer(userId: string, offerId: string): Promise<void> {
  const offer = await Offer.findByPk(offerId);

  if (!offer) {
    throw new AppError('No encontramos esa oferta.', 404);
  }

  const creatorId = offer.direction === 'buyer_to_seller' ? offer.buyerId : offer.sellerId;

  if (creatorId !== userId) {
    throw new AppError('No podés cancelar esta oferta.', 403);
  }

  if (offer.status !== 'pending') {
    throw new AppError('Esta oferta ya no se puede cancelar.', 409);
  }

  await offer.update({ status: 'cancelled' });
}

export async function getMyOffers(userId: string): Promise<{
  sent: OfferView[];
  received: OfferView[];
}> {
  const [sent, received] = await Promise.all([
    Offer.findAll({
      where: { buyerId: userId },
      include: offerIncludes,
      order: [['createdAt', 'DESC']],
    }),
    Offer.findAll({
      where: { sellerId: userId },
      include: offerIncludes,
      order: [['createdAt', 'DESC']],
    }),
  ]);

  return {
    sent: sent.map(toOfferView),
    received: received.map(toOfferView),
  };
}

export async function expireOffers(): Promise<void> {
  await Offer.update(
    { status: 'expired' },
    {
      where: {
        status: 'pending',
        expiresAt: { [Op.lt]: new Date() },
      },
    }
  );
}
