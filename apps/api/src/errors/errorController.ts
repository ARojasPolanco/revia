import type { NextFunction, Request, Response } from 'express';
import { envs } from '../config/envs.js';
import { AppError } from './appError.js';
import { matchError } from './errorMatchers.js';
import { logUnexpectedError } from '../modules/logs/errorLog.service.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
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
  const message = matched?.message ?? 'Error interno del servidor';

  if (statusCode >= 500) {
    const authenticatedRequest = req as Request & { user?: { id?: string } };
    void logUnexpectedError({
      statusCode,
      status,
      message,
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
