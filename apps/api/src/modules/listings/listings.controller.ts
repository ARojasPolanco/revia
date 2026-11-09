import type { Request, Response } from 'express';
import { z } from 'zod';
import { LISTING_STATUSES, listListingsQuerySchema, uuidSchema } from '@revia/shared';
import { catchAsync } from '../../errors/catchAsync.js';
import { AppError } from '../../errors/appError.js';
import * as listingsService from './listings.service.js';

function parseId(value: string | undefined): string {
  const parsed = uuidSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError('No encontramos lo que buscabas.', 404);
  }

  return parsed.data;
}

export const listListings = catchAsync(async (req: Request, res: Response) => {
  const parsed = listListingsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw parsed.error;
  }

  const result = await listingsService.listPublicListings(parsed.data);

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const getPublicListing = catchAsync(async (req: Request, res: Response) => {
  const listing = await listingsService.getPublicListing(parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    listing,
  });
});

export const getFeed = catchAsync(async (_req: Request, res: Response) => {
  const listings = await listingsService.getRecommendedFeed();

  res.status(200).json({
    status: 'success',
    listings,
  });
});

export const getFollowingFeed = catchAsync(async (req: Request, res: Response) => {
  const listings = await listingsService.getFollowingFeed(req.user!.id);

  res.status(200).json({
    status: 'success',
    listings,
  });
});

export const getMyFavorites = catchAsync(async (req: Request, res: Response) => {
  const listings = await listingsService.getFavoriteListings(req.user!.id);

  res.status(200).json({
    status: 'success',
    listings,
  });
});

export const addFavorite = catchAsync(async (req: Request, res: Response) => {
  await listingsService.favoriteListing(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    message: 'Agregado a favoritos.',
  });
});

export const removeFavorite = catchAsync(async (req: Request, res: Response) => {
  await listingsService.unfavoriteListing(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    message: 'Quitado de favoritos.',
  });
});

export const getFavoriteStatus = catchAsync(async (req: Request, res: Response) => {
  const favorite = await listingsService.isFavorite(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    favorite,
  });
});

export const getMyListings = catchAsync(async (req: Request, res: Response) => {
  const listings = await listingsService.getOwnerListings(req.user!.id);

  res.status(200).json({
    status: 'success',
    listings,
  });
});

export const getMyListing = catchAsync(async (req: Request, res: Response) => {
  const listing = await listingsService.getOwnerListing(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    listing,
  });
});

export const createListing = catchAsync(async (req: Request, res: Response) => {
  const listing = await listingsService.createListing(
    req.user!.id,
    req.body as listingsService.CreateListingInput
  );

  res.status(201).json({
    status: 'success',
    listing,
  });
});

export const updateListing = catchAsync(async (req: Request, res: Response) => {
  const listing = await listingsService.updateListing(
    req.user!.id,
    parseId(req.params.id),
    req.body as listingsService.UpdateListingInput
  );

  res.status(200).json({
    status: 'success',
    listing,
  });
});

export const uploadPhotos = catchAsync(async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  if (files.length === 0) {
    throw new AppError('Seleccioná al menos una foto.', 422);
  }

  const photos = await listingsService.addListingPhotos(
    req.user!.id,
    parseId(req.params.id),
    files
  );

  res.status(201).json({
    status: 'success',
    photos,
  });
});

export const deletePhoto = catchAsync(async (req: Request, res: Response) => {
  await listingsService.deleteListingPhoto(
    req.user!.id,
    parseId(req.params.id),
    parseId(req.params.photoId)
  );

  res.status(200).json({
    status: 'success',
    message: 'Foto eliminada.',
  });
});

export const submitListing = catchAsync(async (req: Request, res: Response) => {
  const listing = await listingsService.submitListing(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    listing,
  });
});

export const pauseListing = catchAsync(async (req: Request, res: Response) => {
  const listing = await listingsService.pauseListing(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    listing,
  });
});

export const resumeListing = catchAsync(async (req: Request, res: Response) => {
  const listing = await listingsService.resumeListing(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    listing,
  });
});

export const deleteListing = catchAsync(async (req: Request, res: Response) => {
  await listingsService.deleteListing(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    message: 'Publicación eliminada.',
  });
});

export const reportListing = catchAsync(async (req: Request, res: Response) => {
  await listingsService.reportListing(
    req.user!.id,
    parseId(req.params.id),
    (req.body as { reason: string }).reason
  );

  res.status(201).json({
    status: 'success',
    message: 'Recibimos tu denuncia. Gracias por avisarnos.',
  });
});

export const adminListListings = catchAsync(async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const parsedStatus = z.enum(LISTING_STATUSES).optional().safeParse(status);

  if (!parsedStatus.success) {
    throw new AppError('Elegí un estado válido.', 422);
  }

  const listings = await listingsService.listAdminListings(parsedStatus.data);

  res.status(200).json({
    status: 'success',
    listings,
  });
});

export const approveListing = catchAsync(async (req: Request, res: Response) => {
  const listing = await listingsService.approveListing(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    listing,
  });
});

export const rejectListing = catchAsync(async (req: Request, res: Response) => {
  const listing = await listingsService.rejectListing(
    req.user!.id,
    parseId(req.params.id),
    (req.body as { reason: string }).reason
  );

  res.status(200).json({
    status: 'success',
    listing,
  });
});

export const adminListReports = catchAsync(async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : 'open';
  const parsedStatus = z.enum(['open', 'resolved', 'dismissed']).safeParse(status);

  if (!parsedStatus.success) {
    throw new AppError('Elegí un estado válido.', 422);
  }

  const reports = await listingsService.listReports(parsedStatus.data);

  res.status(200).json({
    status: 'success',
    reports,
  });
});

export const resolveReport = catchAsync(async (req: Request, res: Response) => {
  await listingsService.resolveReport(
    parseId(req.params.id),
    (req.body as { status: 'resolved' | 'dismissed' }).status
  );

  res.status(200).json({
    status: 'success',
    message: 'Denuncia actualizada.',
  });
});
