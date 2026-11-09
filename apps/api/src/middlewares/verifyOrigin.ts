import type { NextFunction, Request, Response } from 'express';
import { corsOrigins, isProduction } from '../config/envs.js';
import { AppError } from '../errors/appError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function verifyOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || !isProduction) {
    next();
    return;
  }

  if (req.originalUrl.startsWith('/api/v1/webhooks/')) {
    next();
    return;
  }

  const origin = req.get('origin');

  if (!origin || !corsOrigins.includes(origin)) {
    next(new AppError('No pudimos procesar la solicitud desde este sitio.', 403));
    return;
  }

  next();
}
