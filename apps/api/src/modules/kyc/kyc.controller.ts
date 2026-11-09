import type { Request, Response } from 'express';
import { logger } from '../../config/logger.js';
import { catchAsync } from '../../errors/catchAsync.js';
import {
  type DiditWebhookHeaders,
  type DiditWebhookPayload,
  verifyDiditSignature,
} from './didit.service.js';
import * as kycService from './kyc.service.js';

export const startSession = catchAsync(async (req: Request, res: Response) => {
  const result = await kycService.startSession(req.user!.id);

  res.status(200).json({
    status: 'success',
    verification: result,
  });
});

export const getStatus = catchAsync(async (req: Request, res: Response) => {
  const verification = await kycService.getStatus(req.user!.id);

  res.status(200).json({
    status: 'success',
    verification,
  });
});

export const devVerify = catchAsync(async (req: Request, res: Response) => {
  const body = req.body as { status: 'approved' | 'rejected' | 'manual_review' };
  await kycService.devSetStatus(req.user!.id, body.status);

  res.status(200).json({
    status: 'success',
    message: 'Estado de verificación actualizado.',
  });
});

export const diditWebhook = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body as DiditWebhookPayload;
  const headers: DiditWebhookHeaders = {
    signatureV2: req.get('x-signature-v2') ?? undefined,
    signatureV2Previous: req.get('x-signature-v2-previous') ?? undefined,
    signatureSimple: req.get('x-signature-simple') ?? undefined,
    signatureSimplePrevious: req.get('x-signature-simple-previous') ?? undefined,
    timestamp: req.get('x-timestamp') ?? undefined,
  };

  if (!verifyDiditSignature(payload, headers)) {
    res.status(401).json({
      status: 'fail',
      message: 'Firma inválida',
    });
    return;
  }

  try {
    await kycService.handleDiditWebhook(payload);
  } catch (error) {
    logger.error('Error procesando webhook KYC', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  res.status(200).json({
    status: 'success',
  });
});
