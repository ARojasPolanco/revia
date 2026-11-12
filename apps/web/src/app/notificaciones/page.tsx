'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ActionButton, PageHeader } from '@/components/PageHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import type { NotificationItem } from '@/lib/notifications';

function notificationHref(notification: NotificationItem): string {
  const conversationId = notification.data.conversationId;
  const listingId = notification.data.listingId;
  const orderId = notification.data.orderId;
  const role = notification.data.role;

  if (notification.type === 'new_message' && typeof conversationId === 'string') {
    return `/chat/${conversationId}`;
  }

  if (notification.type.startsWith('offer_')) {
    return '/ofertas';
  }

  if (notification.type.startsWith('listing_')) {
    return listingId ? '/mis-publicaciones' : '/mis-publicaciones';
  }

  if (notification.type.startsWith('payout_')) {
    return '/cobros';
  }

  if (notification.type.startsWith('dispute_')) {
    const disputeId = notification.data.disputeId;
    return typeof disputeId === 'string' ? `/disputas/${disputeId}` : '/disputas';
  }

  if (notification.type === 'review_received' && typeof orderId === 'string') {
    return role === 'seller' ? `/ventas/${orderId}` : `/compras/${orderId}`;
  }

  if (
    notification.type.startsWith('payment_') ||
    notification.type.startsWith('order_') ||
    notification.type.startsWith('delivery_') ||
    notification.type.startsWith('seller_')
  ) {
    const base = role === 'seller' ? '/ventas' : '/compras';
    return typeof orderId === 'string' ? `${base}/${orderId}` : base;
  }

  if (notification.type.startsWith('kyc_')) {
    return '/verificacion';
  }

  return '/';
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{
        notifications: NotificationItem[];
        unreadCount: number;
      }>('/notifications?limit=50');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar las notificaciones'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAllRead() {
    setBusy(true);
    setError(null);

    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron marcar como leídas');
    } finally {
      setBusy(false);
    }
  }

  async function markRead(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo marcar la notificación');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-5 py-12">
      <PageHeader
        actions={
          <ActionButton
            onClick={markAllRead}
            disabled={busy || unreadCount === 0}
            variant="primary"
          >
            Marcar todas
          </ActionButton>
        }
        description={`${unreadCount} sin leer.`}
        title="Notificaciones"
      />

      {loading ? <p className="text-sm text-neutral-500">Cargando notificaciones…</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && notifications.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          No tenés notificaciones.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {notifications.map((notification) => (
          <article
            className={`flex flex-col gap-1 rounded-2xl border p-4 shadow-sm ${
              notification.readAt ? 'border-neutral-200 bg-white' : 'border-teal-200 bg-teal-50/40'
            }`}
            key={notification.id}
          >
            <div className="flex items-start justify-between gap-2">
              <Link
                className="text-sm font-bold text-neutral-900 underline-offset-2 hover:underline"
                href={notificationHref(notification)}
              >
                {notification.title}
              </Link>
              {!notification.readAt ? (
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-600" />
              ) : null}
            </div>
            <p className="text-sm text-neutral-600">{notification.body}</p>
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span>
                {new Intl.DateTimeFormat('es-AR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date(notification.createdAt))}
              </span>
              {!notification.readAt ? (
                <button
                  className="font-semibold text-teal-700"
                  type="button"
                  onClick={() => markRead(notification.id)}
                >
                  Marcar leída
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}
