'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { OrderTimeline } from '@/components/OrderTimeline';
import { PaymentInstructions } from '@/components/PaymentInstructions';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { DELIVERY_LABELS, formatArs } from '@/lib/listings';
import { formatDateTime, formatRemaining, orderStatusLabel, type Order } from '@/lib/orders';

function PurchaseDetailContent() {
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
      setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar la compra.');
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

  async function runAction(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    setError(null);
    setMessage(null);

    try {
      await action();
      await load();
      setMessage(success);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar la acción.');
    } finally {
      setBusy(null);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setMessage('Código copiado.');
    } catch {
      setError('No se pudo copiar el código.');
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando compra.</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          No encontramos esa compra
        </h1>
        <Link className="text-sm font-semibold text-teal-700" href="/compras">
          Volver a mis compras
        </Link>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </main>
    );
  }

  if (order.role !== 'buyer') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Esta es una venta</h1>
        <Link className="text-sm font-semibold text-teal-700" href={`/ventas/${order.id}`}>
          Ir al detalle de la venta
        </Link>
      </main>
    );
  }

  const pendingPayment = order.status === 'pending_payment';
  const paymentReady = pendingPayment && order.payment?.status === 'PENDING';
  const canSimulate = process.env.NODE_ENV !== 'production' && paymentReady;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-semibold text-teal-700" href="/compras">
          Volver a mis compras
        </Link>
        <Link className="text-sm font-semibold text-teal-700" href="/">
          Inicio
        </Link>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Compra</p>
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

        {order.listing.photoUrl ? (
          <img
            src={order.listing.photoUrl}
            alt={order.listing.title}
            className="h-52 w-full rounded-xl object-contain bg-neutral-50 p-2"
          />
        ) : null}

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
          <div className="flex justify-between gap-4">
            <dt>
              Tasa de REVIA ({order.tasaPercent}% + {formatArs(order.tasaFixedArs)})
            </dt>
            <dd className="font-medium text-neutral-900">{formatArs(order.tasaAmountArs)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-neutral-200 pt-2 text-base">
            <dt className="font-bold text-neutral-900">Total</dt>
            <dd className="font-black text-neutral-900">{formatArs(order.totalAmountArs)}</dd>
          </div>
        </dl>

        {order.seller ? (
          <Link
            className="text-xs font-semibold text-teal-700"
            href={`/vendedores/${order.seller.id}`}
          >
            Ver perfil del vendedor
          </Link>
        ) : null}
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

      {pendingPayment ? (
        order.payment ? (
          <>
            <PaymentInstructions payment={order.payment} totalAmountArs={order.totalAmountArs} />
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-60"
                type="button"
                onClick={() => void load()}
                disabled={busy !== null}
              >
                Actualizar estado
              </button>
              {canSimulate ? (
                <button
                  className="rounded-xl border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-700 disabled:opacity-60"
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    void runAction(
                      'simulate',
                      () => apiFetch(`/me/orders/${order.id}/simulate-payment`, { method: 'POST' }),
                      'Pago simulado. Actualizamos la orden.'
                    )
                  }
                >
                  {busy === 'simulate' ? 'Simulando.' : 'Simular pago (sandbox)'}
                </button>
              ) : null}
              <button
                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60"
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  void runAction(
                    'cancel',
                    () => apiFetch(`/me/orders/${order.id}`, { method: 'DELETE' }),
                    'Compra cancelada.'
                  )
                }
              >
                Cancelar compra
              </button>
            </div>
          </>
        ) : (
          <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm text-amber-900">
              No pudimos generar las instrucciones de pago. Podés reintentar ahora.
            </p>
            <button
              className="w-fit rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void runAction(
                  'payment',
                  () => apiFetch(`/me/orders/${order.id}/payment`, { method: 'POST' }),
                  'Instrucciones de pago generadas.'
                )
              }
            >
              {busy === 'payment' ? 'Generando.' : 'Generar instrucciones de pago'}
            </button>
          </section>
        )
      ) : null}

      {order.status === 'payment_review' ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Estamos revisando el pago. No cierres la compra ni coordines la entrega hasta que el pago
          figure como confirmado. Te avisamos por notificaciones.
        </p>
      ) : null}

      {order.deliveryCode ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-5">
          <div>
            <h2 className="text-sm font-bold text-teal-950">Tu código de entrega</h2>
            <p className="mt-1 text-xs text-teal-900">
              Mostralo al vendedor cuando recibas el artículo. Es de un solo uso.
            </p>
          </div>
          <p className="font-mono text-4xl font-black tracking-[0.35em] text-teal-950">
            {order.deliveryCode}
          </p>
          <button
            className="w-fit text-xs font-semibold text-teal-700"
            type="button"
            onClick={() => void copyCode(order.deliveryCode as string)}
          >
            Copiar código
          </button>
        </section>
      ) : null}

      {['paid', 'handover_pending', 'delivered'].includes(order.status) ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Entrega y recepción</h2>
          <p className="text-sm text-neutral-600">
            {order.status === 'delivered'
              ? `Tenés ${formatRemaining(order.claimWindowEndsAt)} para abrir un reclamo.`
              : 'Coordiná la entrega con el vendedor. Cuando recibas el artículo, confirmá la recepción.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {order.actions.canMarkHandover ? (
              <button
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-60"
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  void runAction(
                    'handover',
                    () => apiFetch(`/me/orders/${order.id}/handover`, { method: 'POST' }),
                    'Entrega marcada como coordinada.'
                  )
                }
              >
                Ya coordinamos la entrega
              </button>
            ) : null}
            {order.actions.canConfirmReceipt ? (
              <button
                className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                type="button"
                disabled={busy !== null}
                onClick={() =>
                  void runAction(
                    'confirm',
                    () => apiFetch(`/me/orders/${order.id}/confirm-receipt`, { method: 'POST' }),
                    'Recepción confirmada. Compra completada.'
                  )
                }
              >
                {busy === 'confirm' ? 'Confirmando.' : 'Confirmé la recepción'}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {order.status === 'completed' ? (
        <p className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-sm text-teal-900">
          Compra completada el {formatDateTime(order.completedAt)}. El vendedor cobra dentro de las
          próximas 48-72 horas hábiles.
        </p>
      ) : null}

      {['cancelled', 'expired', 'refunded'].includes(order.status) ? (
        <p className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-600">
          {order.status === 'expired'
            ? 'El pago venció y la compra se canceló. El artículo sigue disponible.'
            : order.status === 'refunded'
              ? 'La compra fue reembolsada.'
              : 'La compra fue cancelada.'}
        </p>
      ) : null}

      <OrderTimeline events={order.events} />
    </main>
  );
}

export default function PurchaseDetailPage() {
  return (
    <ProtectedRoute>
      <PurchaseDetailContent />
    </ProtectedRoute>
  );
}
