'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { OfferCard } from '@/components/OfferCard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import type { Offer, OffersResponse } from '@/lib/offers';

type Tab = 'received' | 'sent';

function OffersContent() {
  const [offers, setOffers] = useState<OffersResponse>({ sent: [], received: [] });
  const [tab, setTab] = useState<Tab>('received');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<OffersResponse>('/me/offers');
      setOffers(data);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron cargar las ofertas');
    } finally {
      setLoading(false);
    }
  }, []);

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
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar la acción');
    } finally {
      setBusyId(null);
    }
  }

  function counter(offer: Offer) {
    const raw = window.prompt(
      `Contraoferta para "${offer.listingTitle}" (precio publicado ${offer.listingPriceArs}).\nIngresá el monto en ARS:`
    );

    if (!raw) {
      return;
    }

    const amount = Number(raw);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Ingresá un monto válido.');
      return;
    }

    void runAction(
      offer.id,
      () =>
        apiFetch(`/offers/${offer.id}/counter`, {
          method: 'POST',
          body: JSON.stringify({ amountArs: Math.round(amount) }),
        }),
      'Contraoferta enviada.'
    );
  }

  const list = tab === 'received' ? offers.received : offers.sent;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Ofertas</h1>
          <p className="text-sm text-neutral-600">Negociá el precio dentro de REVIA.</p>
        </div>
        <div className="flex gap-2">
          <Link
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
            href="/publicaciones"
          >
            Catálogo
          </Link>
          <Link
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
            href="/"
          >
            Inicio
          </Link>
        </div>
      </header>

      <div className="flex gap-2">
        <button
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            tab === 'received'
              ? 'bg-teal-700 text-white'
              : 'border border-neutral-300 text-neutral-800'
          }`}
          type="button"
          onClick={() => setTab('received')}
        >
          Recibidas ({offers.received.length})
        </button>
        <button
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            tab === 'sent' ? 'bg-teal-700 text-white' : 'border border-neutral-300 text-neutral-800'
          }`}
          type="button"
          onClick={() => setTab('sent')}
        >
          Enviadas ({offers.sent.length})
        </button>
      </div>

      {loading ? <p className="text-sm text-neutral-500">Cargando ofertas…</p> : null}

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

      {!loading && list.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          No hay ofertas {tab === 'received' ? 'recibidas' : 'enviadas'}.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {list.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            mode={tab}
            busy={busyId === offer.id}
            onAccept={(item) =>
              runAction(
                item.id,
                () => apiFetch(`/offers/${item.id}/accept`, { method: 'POST' }),
                'Oferta aceptada.'
              )
            }
            onReject={(item) =>
              runAction(
                item.id,
                () => apiFetch(`/offers/${item.id}/reject`, { method: 'POST' }),
                'Oferta rechazada.'
              )
            }
            onCounter={counter}
            onCancel={(item) =>
              runAction(
                item.id,
                () => apiFetch(`/offers/${item.id}`, { method: 'DELETE' }),
                'Oferta cancelada.'
              )
            }
          />
        ))}
      </div>
    </main>
  );
}

export default function OffersPage() {
  return (
    <ProtectedRoute>
      <OffersContent />
    </ProtectedRoute>
  );
}
