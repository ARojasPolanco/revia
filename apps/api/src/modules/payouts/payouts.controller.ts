import type { Request, Response } from 'express';
import { payoutListQuerySchema, uuidSchema } from '@revia/shared';
import { catchAsync } from '../../errors/catchAsync.js';
import { AppError } from '../../errors/appError.js';
import * as payoutRecords from './payoutRecords.service.js';
import * as payoutsService from './payouts.service.js';

function parseId(value: string | undefined): string {
  const parsed = uuidSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError('No encontramos ese payout.', 404);
  }

  return parsed.data;
}

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

export const listPayouts = catchAsync(async (req: Request, res: Response) => {
  const payouts = await payoutRecords.listSellerPayouts(req.user!.id);

  res.status(200).json({
    status: 'success',
    payouts,
  });
});

export const getSummary = catchAsync(async (req: Request, res: Response) => {
  const summary = await payoutRecords.getSellerSummary(req.user!.id);

  res.status(200).json({
    status: 'success',
    summary,
  });
});

export const getReceipt = catchAsync(async (req: Request, res: Response) => {
  const payoutId = parseId(req.params.id);
  const receipt = await payoutRecords.getPayoutReceipt(req.user!.id, payoutId);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="revia-payout-${payoutId}.txt"`);
  res.status(200).send(receipt);
});

export const listFinance = catchAsync(async (req: Request, res: Response) => {
  const parsed = payoutListQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new AppError('Elegí un estado de payout válido.', 422);
  }

  const payouts = await payoutRecords.listFinancePayouts(parsed.data.status);

  res.status(200).json({
    status: 'success',
    payouts,
  });
});

export const getFinanceSummary = catchAsync(async (_req: Request, res: Response) => {
  const summary = await payoutRecords.getFinanceSummary();

  res.status(200).json({
    status: 'success',
    summary,
  });
});

export const markProcessing = catchAsync(async (req: Request, res: Response) => {
  const payout = await payoutRecords.markPayoutProcessing(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    payout,
  });
});

export const markPaid = catchAsync(async (req: Request, res: Response) => {
  const payout = await payoutRecords.markPayoutPaid(
    req.user!.id,
    parseId(req.params.id),
    req.body as { operationId: string; receiptUrl?: string; note?: string }
  );

  res.status(200).json({
    status: 'success',
    payout,
  });
});

export const markFailed = catchAsync(async (req: Request, res: Response) => {
  const payout = await payoutRecords.markPayoutFailed(
    req.user!.id,
    parseId(req.params.id),
    (req.body as { reason: string }).reason
  );

  res.status(200).json({
    status: 'success',
    payout,
  });
});

export const reconcile = catchAsync(async (_req: Request, res: Response) => {
  const result = await payoutRecords.reconcileTaloPayments();

  res.status(200).json({
    status: 'success',
    reconciliation: result,
  });
});
