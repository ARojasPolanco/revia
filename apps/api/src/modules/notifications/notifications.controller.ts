import type { Request, Response } from 'express';
import { paginationSchema, uuidSchema } from '@revia/shared';
import { catchAsync } from '../../errors/catchAsync.js';
import { AppError } from '../../errors/appError.js';
import * as notificationsService from './notifications.service.js';

export const list = catchAsync(async (req: Request, res: Response) => {
  const parsed = paginationSchema.safeParse(req.query);

  if (!parsed.success) {
    throw parsed.error;
  }

  const result = await notificationsService.listNotifications(
    req.user!.id,
    parsed.data.page,
    parsed.data.limit
  );

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

export const markRead = catchAsync(async (req: Request, res: Response) => {
  const parsedId = uuidSchema.safeParse(req.params.id);

  if (!parsedId.success) {
    throw new AppError('No encontramos esa notificación.', 404);
  }

  const notification = await notificationsService.markNotificationRead(req.user!.id, parsedId.data);

  res.status(200).json({
    status: 'success',
    notification,
  });
});

export const markAllRead = catchAsync(async (req: Request, res: Response) => {
  await notificationsService.markAllNotificationsRead(req.user!.id);

  res.status(200).json({
    status: 'success',
    message: 'Notificaciones marcadas como leídas.',
  });
});
