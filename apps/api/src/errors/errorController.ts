import type { NextFunction, Request, Response } from 'express';
import { envs } from '../config/envs.js';
import { logger } from '../config/logger.js';
import { AppError } from './appError.js';
import { matchError } from './errorMatchers.js';
import { logUnexpectedError } from '../modules/logs/errorLog.service.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  logger.warn('Ruta no encontrada', {
    method: req.method,
    path: req.originalUrl,
  });
  next(new AppError('No encontramos lo que buscabas.', 404));
}

export function globalErrorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const matched = matchError(error);
  const statusCode = matched?.statusCode ?? 500;
  const status = matched?.status ?? 'error';
  const technicalMessage = matched?.message ?? 'Algo salió mal. Probá de nuevo en unos minutos.';
  const message =
    statusCode === 503
      ? 'El servicio no está disponible en este momento. Probá en unos minutos.'
      : statusCode >= 500 && envs.NODE_ENV === 'production'
        ? 'Algo salió mal. Probá de nuevo en unos minutos.'
        : technicalMessage;

  if (statusCode >= 500) {
    const authenticatedRequest = req as Request & { user?: { id?: string } };
    void logUnexpectedError({
      statusCode,
      status,
      message: technicalMessage,
      stack: error instanceof Error ? error.stack : undefined,
      path: req.originalUrl,
      method: req.method,
      userId: authenticatedRequest.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  if (envs.NODE_ENV === 'development' && !matched) {
    res.status(statusCode).json({
      status,
      message,
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return;
  }

  res.status(statusCode).json({ status, message });
}
