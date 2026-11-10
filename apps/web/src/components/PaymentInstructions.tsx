'use client';

import { useState } from 'react';
import { formatArs } from '@/lib/listings';
import { formatDateTime, type OrderPayment } from '@/lib/orders';
import { PaymentQr } from './PaymentQr';

interface Props {
  payment: OrderPayment;
  totalAmountArs: number;
}

export function PaymentInstructions({ payment, totalAmountArs }: Props) {
  const [copied, setCopied] = useState<'alias' | 'cvu' | null>(null);

  async function copy(value: string | null, kind: 'alias' | 'cvu') {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2_000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-5">
      <div>
        <h2 className="text-sm font-bold text-teal-950">Pago por transferencia</h2>
        <p className="mt-1 text-sm text-teal-900">
          Transferí exactamente <strong>{formatArs(totalAmountArs)}</strong> usando el alias o CVU.
          El pago se acredita automáticamente.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-teal-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Alias
          </p>
          <p className="mt-1 break-all text-sm font-bold text-neutral-900">
            {payment.alias ?? 'No disponible'}
          </p>
          <button
            className="mt-2 text-xs font-semibold text-teal-700 disabled:opacity-50"
            type="button"
            onClick={() => void copy(payment.alias, 'alias')}
            disabled={!payment.alias}
          >
            {copied === 'alias' ? 'Copiado' : 'Copiar alias'}
          </button>
        </div>

        <div className="rounded-xl border border-teal-200 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">CVU</p>
          <p className="mt-1 break-all text-sm font-bold text-neutral-900">
            {payment.cvu ?? 'No disponible'}
          </p>
          <button
            className="mt-2 text-xs font-semibold text-teal-700 disabled:opacity-50"
            type="button"
            onClick={() => void copy(payment.cvu, 'cvu')}
            disabled={!payment.cvu}
          >
            {copied === 'cvu' ? 'Copiado' : 'Copiar CVU'}
          </button>
        </div>
      </div>

      <PaymentQr value={payment.alias ?? payment.cvu} />

      <p className="text-[11px] text-teal-900">
        Vence: {formatDateTime(payment.expiresAt)}. No cierres la compra hasta que el pago figure
        como confirmado.
      </p>
    </section>
  );
}
