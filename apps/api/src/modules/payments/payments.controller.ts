import type { Request, Response } from 'express';
import { envs } from '../../config/envs.js';
import { logger } from '../../config/logger.js';
import { handleTaloWebhook } from './payments.service.js';

export async function taloWebhook(req: Request, res: Response): Promise<void> {
  const token = typeof req.query.token === 'string' ? req.query.token : '';

  if (envs.TALO_WEBHOOK_SECRET && token !== envs.TALO_WEBHOOK_SECRET) {
    res.status(403).json({
      status: 'fail',
      message: 'No autorizado.',
    });
    return;
  }

  try {
    await handleTaloWebhook(req.body as Record<string, unknown>);
  } catch (error) {
    logger.error('Falló el procesamiento del webhook de Talo', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  res.status(200).json({
    status: 'success',
  });
}
