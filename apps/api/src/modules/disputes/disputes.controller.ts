import type { Request, Response } from 'express';
import { z } from 'zod';
import { DISPUTE_STATUSES, uuidSchema } from '@revia/shared';
import { catchAsync } from '../../errors/catchAsync.js';
import { AppError } from '../../errors/appError.js';
import * as disputesService from './disputes.service.js';

function parseId(value: string | undefined, message = 'No encontramos esa disputa.'): string {
  const parsed = uuidSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError(message, 404);
  }

  return parsed.data;
}

export const openDispute = catchAsync(async (req: Request, res: Response) => {
  const dispute = await disputesService.openDispute(
    req.user!.id,
    parseId(req.params.id, 'No encontramos esa compra.'),
    req.body as { reason: string; description: string }
  );

  res.status(201).json({
    status: 'success',
    dispute,
  });
});

export const listMyDisputes = catchAsync(async (req: Request, res: Response) => {
  const disputes = await disputesService.listMyDisputes(req.user!.id);

  res.status(200).json({
    status: 'success',
    disputes,
  });
});

export const getDispute = catchAsync(async (req: Request, res: Response) => {
  const dispute = await disputesService.getDisputeView(
    req.user!.id,
    req.user!.role,
    parseId(req.params.id)
  );

  res.status(200).json({
    status: 'success',
    dispute,
  });
});

export const addMessage = catchAsync(async (req: Request, res: Response) => {
  const dispute = await disputesService.addDisputeMessage(
    req.user!.id,
    req.user!.role,
    parseId(req.params.id),
    (req.body as { body: string }).body
  );

  res.status(200).json({
    status: 'success',
    dispute,
  });
});

export const addEvidence = catchAsync(async (req: Request, res: Response) => {
  const dispute = await disputesService.addDisputeEvidence(
    req.user!.id,
    req.user!.role,
    parseId(req.params.id),
    req.body as { kind: string; url?: string; body?: string }
  );

  res.status(200).json({
    status: 'success',
    dispute,
  });
});

export const sellerOffer = catchAsync(async (req: Request, res: Response) => {
  const dispute = await disputesService.sellerDisputeOffer(
    req.user!.id,
    parseId(req.params.id),
    req.body as { type: 'partial_refund' | 'cover_return'; amountArs?: number }
  );

  res.status(200).json({
    status: 'success',
    dispute,
  });
});

export const listAdminDisputes = catchAsync(async (req: Request, res: Response) => {
  const rawStatus = typeof req.query.status === 'string' ? req.query.status : undefined;
  const parsedStatus = z.enum(DISPUTE_STATUSES).optional().safeParse(rawStatus);

  if (!parsedStatus.success) {
    throw new AppError('Elegí un estado de disputa válido.', 422);
  }

  const disputes = await disputesService.listAdminDisputes(parsedStatus.data);

  res.status(200).json({
    status: 'success',
    disputes,
  });
});

export const resolveDispute = catchAsync(async (req: Request, res: Response) => {
  const dispute = await disputesService.resolveDispute(
    req.user!.id,
    parseId(req.params.id),
    req.body as {
      resolution: 'refund_money' | 'refund_coupon' | 'reject';
      notes?: string;
      amountArs?: number;
    }
  );

  res.status(200).json({
    status: 'success',
    dispute,
  });
});
