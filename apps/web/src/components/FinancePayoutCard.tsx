'use client';

import { useState } from 'react';
import { formatArs } from '@/lib/listings';
import { formatDateTime } from '@/lib/orders';
import { payoutEventLabel, payoutStatusLabel, type Payout } from '@/lib/payouts';

interface Props {
  payout: Payout;
  busy: boolean;
  onProcessing: (payout: Payout) => void;
  onPaid: (payout: Payout) => void;
  onFailed: (payout: Payout) => void;
}

export function FinancePayoutCard({ payout, busy, onProcessing, onPaid, onFailed }: Props) {
  const [copied, setCopied] = useState(false);
  const latestEvent = payout.events[payout.events.length - 1];
  const canProcess = !payout.blockReason && ['pending', 'failed'].includes(payout.status);
  const canClose = payout.status === 'processing' && !payout.blockReason;
  const accountLabel = payout.account?.method === 'alias' ? 'Alias' : 'CBU / CVU';
  const accountValue = payout.account?.accountFull ?? payout.account?.accountMasked ?? null;

  async function copyAccount() {
    if (!accountValue) {
      return;
    }

    try {
      await navigator.clipboard.writeText(accountValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-neutral-900">{payout.order.title}</p>
          <p className="text-xs text-neutral-500">
            Vendedor: {payout.seller?.fullName ?? '-'} · Completada:{' '}
            {formatDateTime(payout.order.completedAt)}
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
          {payoutStatusLabel(payout.status)}
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-2xl font-black text-neutral-900">{formatArs(payout.amountArs)}</p>
        <p className="text-xs text-neutral-500">SLA: {formatDateTime(payout.slaDueAt)}</p>
      </div>

      <div className="grid gap-2 text-xs text-neutral-600 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p className="font-semibold uppercase tracking-wide text-neutral-400">Cuenta de cobro</p>
          <p className="mt-1 text-[11px] font-semibold text-neutral-500">{accountLabel}</p>
          <p className="mt-0.5 break-all font-mono text-sm font-bold text-neutral-900">
            {accountValue ?? 'No configurada'}
          </p>
          {accountValue ? (
            <button
              className="mt-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800"
              type="button"
              onClick={() => void copyAccount()}
            >
              {copied ? 'Copiado' : 'Copiar dato'}
            </button>
          ) : null}
          <p className="mt-1 text-[11px] text-neutral-500">
            Titular: {payout.account?.holderName ?? '-'} �{' '}
            {payout.account?.holderMatchesKyc ? 'Coincide con KYC' : 'Revisar titular'}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p className="font-semibold uppercase tracking-wide text-neutral-400">Auditoría</p>
          <p className="mt-1 text-[11px] text-neutral-500">
            {latestEvent
              ? `${payoutEventLabel(latestEvent.type)} · ${formatDateTime(latestEvent.createdAt)}`
              : 'Sin movimientos'}
          </p>
          {payout.operationId ? (
            <p className="text-[11px] text-neutral-500">Operación: {payout.operationId}</p>
          ) : null}
        </div>
      </div>

      {payout.blockReasonLabel ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Bloqueado: {payout.blockReasonLabel}
        </p>
      ) : null}

      {payout.failureReason ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {payout.failureReason}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canProcess ? (
          <button
            className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            type="button"
            onClick={() => onProcessing(payout)}
            disabled={busy}
          >
            {payout.status === 'failed' ? 'Reintentar procesamiento' : 'Iniciar procesamiento'}
          </button>
        ) : null}

        {canClose ? (
          <>
            <button
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              type="button"
              onClick={() => onPaid(payout)}
              disabled={busy}
            >
              Marcar pagado
            </button>
            <button
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
              type="button"
              onClick={() => onFailed(payout)}
              disabled={busy}
            >
              Marcar fallido
            </button>
          </>
        ) : null}

        {!canProcess && !canClose && payout.status !== 'paid' ? (
          <p className="text-[11px] text-neutral-500">
            Resolvé el bloqueo para continuar con el payout.
          </p>
        ) : null}
      </div>
    </article>
  );
}
