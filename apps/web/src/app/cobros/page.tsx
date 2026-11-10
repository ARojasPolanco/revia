'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PayoutCard } from '@/components/PayoutCard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { formatArs } from '@/lib/listings';
import { formatDateTime } from '@/lib/orders';
import type { Payout, PayoutSummary } from '@/lib/payouts';

const emptySummary: PayoutSummary = {
  pendingCount: 0,
  pendingAmountArs: 0,
  processingCount: 0,
  processingAmountArs: 0,
  paidCount: 0,
  paidAmountArs: 0,
  failedCount: 0,
  blockedCount: 0,
  overdueCount: 0,
  nextDueAt: null,
};

function PayoutsContent() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [payoutList, payoutSummary] = await Promise.all([
        apiFetch<{ payouts: Payout[] }>('/me/payouts'),
        apiFetch<{ summary: PayoutSummary }>('/me/payouts/summary'),
      ]);
      setPayouts(payoutList.payouts);
      setSummary(payoutSummary.summary);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron cargar tus cobros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Mis cobros</h1>
          <p className="text-sm text-neutral-600">Seguí tus payouts y descargá los comprobantes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
            href="/ventas"
          >
            Ventas
          </Link>
          <Link
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
            href="/configuracion"
          >
            Cuenta de cobro
          </Link>
          <Link
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
            href="/"
          >
            Inicio
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Pendiente
          </p>
          <p className="mt-1 text-2xl font-black text-neutral-900">
            {formatArs(summary.pendingAmountArs)}
          </p>
          <p className="text-xs text-neutral-500">{summary.pendingCount} payout(s)</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            En proceso
          </p>
          <p className="mt-1 text-2xl font-black text-neutral-900">
            {formatArs(summary.processingAmountArs)}
          </p>
          <p className="text-xs text-neutral-500">{summary.processingCount} payout(s)</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Cobrado</p>
          <p className="mt-1 text-2xl font-black text-neutral-900">
            {formatArs(summary.paidAmountArs)}
          </p>
          <p className="text-xs text-neutral-500">{summary.paidCount} payout(s)</p>
        </article>
      </section>

      {summary.blockedCount > 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tenés {summary.blockedCount} payout(s) bloqueado(s). Revisá tu cuenta de cobro o los datos
          de la venta.
        </p>
      ) : null}

      {summary.overdueCount > 0 ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Hay {summary.overdueCount} payout(s) fuera del SLA. Finanzas los está revisando.
        </p>
      ) : null}

      {summary.nextDueAt ? (
        <p className="text-xs text-neutral-500">
          Próximo vencimiento de SLA: {formatDateTime(summary.nextDueAt)}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-neutral-500">Cargando cobros.</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && payouts.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-600">Todavía no tenés payouts.</p>
          <p className="mt-1 text-xs text-neutral-500">
            Cuando completes una venta, el payout aparece acá.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {payouts.map((payout) => (
          <PayoutCard key={payout.id} payout={payout} />
        ))}
      </div>
    </main>
  );
}

export default function PayoutsPage() {
  return (
    <ProtectedRoute>
      <PayoutsContent />
    </ProtectedRoute>
  );
}
