import type { Request, Response } from 'express';
import { z } from 'zod';
import { uuidSchema } from '@revia/shared';
import { catchAsync } from '../../errors/catchAsync.js';
import { AppError } from '../../errors/appError.js';
import * as reviewsService from './reviews.service.js';

function parseId(value: string | undefined, message = 'No encontramos lo que buscabas.'): string {
  const parsed = uuidSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError(message, 404);
  }

  return parsed.data;
}

export const createReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewsService.createReview(
    req.user!.id,
    parseId(req.params.id, 'No encontramos esa compra.'),
    req.body as { rating: number; comment?: string }
  );

  res.status(201).json({
    status: 'success',
    review,
  });
});

export const getOrderReviews = catchAsync(async (req: Request, res: Response) => {
  const state = await reviewsService.getOrderReviewState(
    req.user!.id,
    parseId(req.params.id, 'No encontramos esa compra.')
  );

  res.status(200).json({
    status: 'success',
    ...state,
  });
});

export const listUserReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await reviewsService.listReviewsForUser(parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const reportReview = catchAsync(async (req: Request, res: Response) => {
  await reviewsService.reportReview(
    req.user!.id,
    parseId(req.params.id),
    (req.body as { reason: string }).reason
  );

  res.status(201).json({
    status: 'success',
    message: 'Recibimos tu denuncia. Gracias por avisarnos.',
  });
});

export const listReviewReports = catchAsync(async (req: Request, res: Response) => {
  const rawStatus = typeof req.query.status === 'string' ? req.query.status : 'open';
  const parsed = z.enum(['open', 'resolved', 'dismissed']).safeParse(rawStatus);

  if (!parsed.success) {
    throw new AppError('Elegí un estado válido.', 422);
  }

  const reports = await reviewsService.listReviewReports(parsed.data);

  res.status(200).json({
    status: 'success',
    reports,
  });
});

export const hideReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewsService.setReviewVisibility(parseId(req.params.id), false);

  res.status(200).json({
    status: 'success',
    review,
  });
});

export const showReview = catchAsync(async (req: Request, res: Response) => {
  const review = await reviewsService.setReviewVisibility(parseId(req.params.id), true);

  res.status(200).json({
    status: 'success',
    review,
  });
});

export const resolveReport = catchAsync(async (req: Request, res: Response) => {
  await reviewsService.resolveReviewReport(
    parseId(req.params.id),
    (req.body as { status: 'resolved' | 'dismissed' }).status
  );

  res.status(200).json({
    status: 'success',
    message: 'Denuncia de reseña actualizada.',
  });
});
