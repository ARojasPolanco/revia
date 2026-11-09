import type { Request, Response } from 'express';
import { catchAsync } from '../../errors/catchAsync.js';
import * as payoutsService from './payouts.service.js';

export const getAccount = catchAsync(async (req: Request, res: Response) => {
  const payoutAccount = await payoutsService.getPayoutAccount(req.user!.id);

  res.status(200).json({
    status: 'success',
    payoutAccount,
  });
});

export const upsertAccount = catchAsync(async (req: Request, res: Response) => {
  const payoutAccount = await payoutsService.upsertPayoutAccount(
    req.user!.id,
    req.body as payoutsService.PayoutAccountInput
  );

  res.status(200).json({
    status: 'success',
    payoutAccount,
  });
});
