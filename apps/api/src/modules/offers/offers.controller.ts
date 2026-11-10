import type { Request, Response } from 'express';
import { uuidSchema } from '@revia/shared';
import { catchAsync } from '../../errors/catchAsync.js';
import { AppError } from '../../errors/appError.js';
import * as offersService from './offers.service.js';

function parseId(value: string | undefined): string {
  const parsed = uuidSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError('No encontramos esa oferta.', 404);
  }

  return parsed.data;
}

export const createOffer = catchAsync(async (req: Request, res: Response) => {
  const offer = await offersService.createOffer(
    req.user!.id,
    parseId(req.params.id),
    (req.body as { amountArs: number }).amountArs
  );

  res.status(201).json({
    status: 'success',
    offer,
  });
});

export const acceptOffer = catchAsync(async (req: Request, res: Response) => {
  const offer = await offersService.acceptOffer(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    offer,
  });
});

export const rejectOffer = catchAsync(async (req: Request, res: Response) => {
  const offer = await offersService.rejectOffer(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    offer,
  });
});

export const counterOffer = catchAsync(async (req: Request, res: Response) => {
  const offer = await offersService.counterOffer(
    req.user!.id,
    parseId(req.params.id),
    (req.body as { amountArs: number }).amountArs
  );

  res.status(200).json({
    status: 'success',
    offer,
  });
});

export const cancelOffer = catchAsync(async (req: Request, res: Response) => {
  await offersService.cancelOffer(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    message: 'Oferta cancelada.',
  });
});

export const getMyOffers = catchAsync(async (req: Request, res: Response) => {
  const offers = await offersService.getMyOffers(req.user!.id);

  res.status(200).json({
    status: 'success',
    ...offers,
  });
});
