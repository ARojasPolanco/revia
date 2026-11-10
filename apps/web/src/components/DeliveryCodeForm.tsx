'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, apiFetch } from '@/lib/api';

interface Props {
  orderId: string;
  onValidated: () => void;
}

export function DeliveryCodeForm({ orderId, onValidated }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/me/orders/${orderId}/validate-delivery`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      setCode('');
      onValidated();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo validar el código.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-neutral-900">Validar entrega</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Pedile al comprador el código de 6 dígitos cuando entregues el artículo.
        </p>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
        <input
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-center text-lg font-black tracking-[0.4em] outline-none focus:border-teal-600 sm:max-w-[220px]"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          required
        />
        <button
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          type="submit"
          disabled={busy || code.length !== 6}
        >
          {busy ? 'Validando.' : 'Validar entrega'}
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
