'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DeliveryCodeForm } from '@/components/DeliveryCodeForm';
import { OrderTimeline } from '@/components/OrderTimeline';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { DELIVERY_LABELS, formatArs } from '@/lib/listings';
import { formatDateTime, formatRemaining, orderStatusLabel, type Order } from '@/lib/orders';

function SaleDetailContent() {
  const params = useParams<{ id: string }>();
  const orderId = typeof params.id === 'string' ? params.id : '';
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) {
      return;
    }

    try {
      const data = await apiFetch<{ order: Order }>(`/me/orders/${orderId}`);
      setOrder(data.order);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar la venta.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!order || !['pending_payment', 'payment_review'].includes(order.status)) {
      return;
    }

    const interval = setInterval(() => {
      void load();
    }, 5_000);

    return () => clearInterval(interval);
  }, [order, load]);

  async function markHandover() {
    if (!order) {
      return;
    }

    setBusy('handover');
    setError(null);
    setMessage(null);

    try {
      await apiFetch(`/me/orders/${order.id}/handover`, { method: 'POST' });
      await load();
      setMessage('Entrega marcada como coordinada.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo actualizar la venta.');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando venta.</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          No encontramos esa venta
        </h1>
        <Link className="text-sm font-semibold text-teal-700" href="/ventas">
          Volver a mis ventas
        </Link>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </main>
    );
  }

  if (order.role !== 'seller') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Esta es una compra</h1>
        <Link className="text-sm font-semibold text-teal-700" href={`/compras/${order.id}`}>
          Ir al detalle de la compra
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-semibold text-teal-700" href="/ventas">
          Volver a mis ventas
        </Link>
        <Link className="text-sm font-semibold text-teal-700" href="/">
          Inicio
        </Link>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Venta</p>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900">
              {order.listing.title}
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              {formatDateTime(order.createdAt)} ·{' '}
              {DELIVERY_LABELS[order.deliveryMode] ?? order.deliveryMode}
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
            {orderStatusLabel(order.status)}
          </span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Comprador
          </p>
          <p className="mt-1 text-sm font-bold text-neutral-900">
            {order.buyer?.fullName ?? 'Comprador de REVIA'}
          </p>
        </div>

        <dl className="grid gap-2 text-sm text-neutral-600">
          <div className="flex justify-between gap-4">
            <dt>Artículo</dt>
            <dd className="font-medium text-neutral-900">{formatArs(order.itemPriceArs)}</dd>
          </div>
          {order.midpointFeeArs > 0 ? (
            <div className="flex justify-between gap-4">
              <dt>Punto medio</dt>
              <dd className="font-medium text-neutral-900">{formatArs(order.midpointFeeArs)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-neutral-200 pt-2 text-base">
            <dt className="font-bold text-neutral-900">Tu payout</dt>
            <dd className="font-black text-neutral-900">{formatArs(order.sellerPayoutArs)}</dd>
          </div>
        </dl>

        {order.payment ? (
          <p className="text-xs text-neutral-500">
            Estado del pago: <strong className="text-neutral-700">{order.payment.status}</strong>
            {order.paidAt ? ` · ${formatDateTime(order.paidAt)}` : ''}
          </p>
        ) : (
          <p className="text-xs text-neutral-500">
            Todavía no se generaron las instrucciones de pago.
          </p>
        )}
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {message}
        </p>
      ) : null}

      {order.status === 'pending_payment' ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Esperando el pago del comprador. No coordines la entrega hasta que el pago figure como
          confirmado.
        </p>
      ) : null}

      {order.status === 'payment_review' ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          El pago está en revisión manual. Te avisamos cuando puedas coordinar la entrega.
        </p>
      ) : null}

      {['paid', 'handover_pending'].includes(order.status) ? (
        <>
          <p className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-sm text-teal-900">
            El comprador pagó. Coordiná la entrega y pedile el código de 6 dígitos cuando la
            concretes.
          </p>
          <DeliveryCodeForm orderId={order.id} onValidated={() => void load()} />
          {order.actions.canMarkHandover ? (
            <button
              className="w-fit rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-60"
              type="button"
              disabled={busy !== null}
              onClick={() => void markHandover()}
            >
              {busy === 'handover' ? 'Guardando.' : 'Ya coordinamos la entrega'}
            </button>
          ) : null}
        </>
      ) : null}

      {order.status === 'delivered' ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600 shadow-sm">
          Entrega validada. La orden se completa automáticamente en{' '}
          <strong className="text-neutral-900">{formatRemaining(order.claimWindowEndsAt)}</strong>{' '}
          si el comprador no abre un reclamo.
        </p>
      ) : null}

      {order.status === 'completed' ? (
        <p className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-sm text-teal-900">
          Venta completada el {formatDateTime(order.completedAt)}. Tu payout de{' '}
          <strong>{formatArs(order.sellerPayoutArs)}</strong> se procesa dentro de las próximas
          48-72 horas hábiles.
        </p>
      ) : null}

      {['cancelled', 'expired', 'refunded'].includes(order.status) ? (
        <p className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-600">
          {order.status === 'expired'
            ? 'El pago venció y la venta se canceló.'
            : order.status === 'refunded'
              ? 'La venta fue reembolsada.'
              : 'La venta fue cancelada.'}
        </p>
      ) : null}

      <OrderTimeline events={order.events} />
    </main>
  );
}

export default function SaleDetailPage() {
  return (
    <ProtectedRoute>
      <SaleDetailContent />
    </ProtectedRoute>
  );
}
