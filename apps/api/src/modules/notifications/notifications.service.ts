import type { NotificationType } from '@revia/shared';
import { logger } from '../../config/logger.js';
import { AppError } from '../../errors/appError.js';
import { Notification } from './notification.model.js';

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

function toView(notification: Notification): NotificationView {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  try {
    await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 140),
      body: input.body,
      data: input.data ?? {},
    });
  } catch (error) {
    logger.error('No se pudo crear la notificación', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function listNotifications(
  userId: string,
  page: number,
  limit: number
): Promise<{
  notifications: NotificationView[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number };
}> {
  const offset = (page - 1) * limit;
  const [result, unreadCount] = await Promise.all([
    Notification.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    }),
    Notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    notifications: result.rows.map(toView),
    unreadCount,
    pagination: { page, limit, total: result.count },
  };
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<NotificationView> {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    throw new AppError('No encontramos esa notificación.', 404);
  }

  if (!notification.readAt) {
    await notification.update({ readAt: new Date() });
  }

  return toView(notification);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await Notification.update({ readAt: new Date() }, { where: { userId, readAt: null } });
}
