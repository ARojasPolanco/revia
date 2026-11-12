import type { Request, Response } from 'express';
import { catchAsync } from '../../errors/catchAsync.js';
import * as couponsService from './coupons.service.js';

export const listCoupons = catchAsync(async (req: Request, res: Response) => {
  const coupons = await couponsService.listCoupons(req.user!.id);

  res.status(200).json({
    status: 'success',
    coupons,
  });
});

export const listActiveCoupons = catchAsync(async (req: Request, res: Response) => {
  const coupons = await couponsService.getActiveCoupons(req.user!.id);

  res.status(200).json({
    status: 'success',
    coupons,
  });
});
