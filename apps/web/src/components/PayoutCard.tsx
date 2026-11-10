'use client';

import { useState } from 'react';
import { formatArs } from '@/lib/listings';
import { formatDateTime } from '@/lib/orders';
import {
  downloadPayoutReceipt,
  payoutEventLabel,
  payoutStatusLabel,
  type Payout,
} from '@/lib/payouts';

export function PayoutCard({ payout }: { payout: Payout }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestEvent = payout.events[payout.events.length - 1];

  async function download() {
    setDownloading(true);
    setError(null);

    try {
      await downloadPayoutReceipt(payout.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo descargar el comprobante.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-neutral-900">{payout.order.title}</p>
          <p className="text-xs text-neutral-500">
            Completada: {formatDateTime(payout.order.completedAt)}
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
          {payoutStatusLabel(payout.status)}
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-2xl font-black text-neutral-900">{formatArs(payout.amountArs)}</p>
        <p className="text-xs text-neutral-500">
          {payout.status === 'paid' && payout.paidAt
            ? `Pagado: ${formatDateTime(payout.paidAt)}`
            : `SLA: ${formatDateTime(payout.slaDueAt)}`}
        </p>
      </div>

      {payout.blockReasonLabel ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {payout.blockReasonLabel}
        </p>
      ) : null}

      {payout.failureReason ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {payout.failureReason}
        </p>
      ) : null}

      {latestEvent ? (
        <p className="text-[11px] text-neutral-400">
          Último movimiento: {payoutEventLabel(latestEvent.type)} ·{' '}
          {formatDateTime(latestEvent.createdAt)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {payout.receiptAvailable ? (
          <button
            className="w-fit rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-700 disabled:opacity-60"
            type="button"
            onClick={() => void download()}
            disabled={downloading}
          >
            {downloading ? 'Descargando.' : 'Descargar comprobante'}
          </button>
        ) : (
          <p className="text-[11px] text-neutral-400">
            El comprobante estará disponible cuando se pague.
          </p>
        )}
        {payout.operationId ? (
          <p className="text-[11px] text-neutral-500">Operación: {payout.operationId}</p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </article>
  );
}
