'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { FinancePayoutCard } from '@/components/FinancePayoutCard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { formatArs } from '@/lib/listings';
import { formatDateTime } from '@/lib/orders';
import type { Payout, PayoutSummary } from '@/lib/payouts';

type Filter = 'pending' | 'processing' | 'failed' | 'paid' | 'all';

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

const filters: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'processing', label: 'En proceso' },
  { value: 'failed', label: 'Fallidos' },
  { value: 'paid', label: 'Pagados' },
  { value: 'all', label: 'Todos' },
];

function FinanceContent() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary>(emptySummary);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const allowed = user?.role === 'finance' || user?.role === 'admin';

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }

    try {
      const query = filter === 'all' ? '' : `?status=${filter}`;
      const [payoutList, payoutSummary] = await Promise.all([
        apiFetch<{ payouts: Payout[] }>(`/admin/payouts${query}`),
        apiFetch<{ summary: PayoutSummary }>('/admin/payouts/summary'),
      ]);
      setPayouts(payoutList.payouts);
      setSummary(payoutSummary.summary);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron cargar los payouts.');
    } finally {
      setLoading(false);
    }
  }, [allowed, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(id: string, action: () => Promise<unknown>, success: string) {
    setBusyId(id);
    setError(null);
    setMessage(null);

    try {
      await action();
      await load();
      setMessage(success);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar la acción.');
    } finally {
      setBusyId(null);
    }
  }

  function processPayout(payout: Payout) {
    void runAction(
      payout.id,
      () => apiFetch(`/admin/payouts/${payout.id}/processing`, { method: 'POST' }),
      'Payout en proceso.'
    );
  }

  function payPayout(payout: Payout) {
    const operationId = window.prompt(
      'ID de operación bancaria (comprobante):',
      `REVIA-${payout.id.slice(0, 8)}`
    );

    if (!operationId) {
      return;
    }

    void runAction(
      payout.id,
      () =>
        apiFetch(`/admin/payouts/${payout.id}/mark-paid`, {
          method: 'POST',
          body: JSON.stringify({ operationId }),
        }),
      'Payout marcado como pagado.'
    );
  }

  function failPayout(payout: Payout) {
    const reason = window.prompt('Motivo del fallo (visible para finanzas):');

    if (!reason) {
      return;
    }

    void runAction(
      payout.id,
      () =>
        apiFetch(`/admin/payouts/${payout.id}/mark-failed`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
      'Payout marcado como fallido.'
    );
  }

  async function reconcile() {
    setBusyId('reconcile');
    setError(null);
    setMessage(null);

    try {
      const data = await apiFetch<{
        reconciliation: { checked: number; updated: number; mismatches: unknown[] };
      }>('/admin/payouts/reconcile', { method: 'POST' });
      setMessage(
        `Conciliación: ${data.reconciliation.checked} pagos revisados, ${data.reconciliation.updated} actualizados, ${data.reconciliation.mismatches.length} diferencias.`
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo conciliar con Talo.');
    } finally {
      setBusyId(null);
    }
  }

  if (!allowed) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Sin permisos</h1>
        <p className="text-sm text-neutral-600">
          Esta sección es solo para finanzas y administración de REVIA.
        </p>
        <Link className="text-sm font-semibold text-teal-700" href="/">
          Volver al inicio
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Finanzas</h1>
          <p className="text-sm text-neutral-600">
            Cola de payouts, bloqueos, comprobantes y conciliación.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-700 disabled:opacity-60"
            type="button"
            onClick={() => void reconcile()}
            disabled={busyId !== null}
          >
            {busyId === 'reconcile' ? 'Conciliando.' : 'Conciliar Talo'}
          </button>
          {user?.role === 'admin' ? (
            <Link
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
              href="/admin/publicaciones"
            >
              Moderación
            </Link>
          ) : null}
          <Link
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
            href="/"
          >
            Inicio
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Pendientes
          </p>
          <p className="mt-1 text-xl font-black text-neutral-900">
            {formatArs(summary.pendingAmountArs)}
          </p>
          <p className="text-xs text-neutral-500">{summary.pendingCount}</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            En proceso
          </p>
          <p className="mt-1 text-xl font-black text-neutral-900">
            {formatArs(summary.processingAmountArs)}
          </p>
          <p className="text-xs text-neutral-500">{summary.processingCount}</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Pagado</p>
          <p className="mt-1 text-xl font-black text-neutral-900">
            {formatArs(summary.paidAmountArs)}
          </p>
          <p className="text-xs text-neutral-500">{summary.paidCount}</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Bloqueados
          </p>
          <p className="mt-1 text-xl font-black text-neutral-900">{summary.blockedCount}</p>
          <p className="text-xs text-neutral-500">{summary.overdueCount} fuera de SLA</p>
        </article>
      </section>

      {summary.nextDueAt ? (
        <p className="text-xs text-neutral-500">Próximo SLA: {formatDateTime(summary.nextDueAt)}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              filter === item.value
                ? 'bg-teal-700 text-white'
                : 'border border-neutral-300 text-neutral-800'
            }`}
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

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

      {loading ? <p className="text-sm text-neutral-500">Cargando payouts.</p> : null}

      {!loading && payouts.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          No hay payouts para este filtro.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {payouts.map((payout) => (
          <FinancePayoutCard
            key={payout.id}
            payout={payout}
            busy={busyId === payout.id}
            onProcessing={processPayout}
            onPaid={payPayout}
            onFailed={failPayout}
          />
        ))}
      </div>
    </main>
  );
}

export default function FinancePage() {
  return (
    <ProtectedRoute>
      <FinanceContent />
    </ProtectedRoute>
  );
}
