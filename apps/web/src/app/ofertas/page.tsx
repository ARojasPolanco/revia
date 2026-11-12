'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDialog } from '@/components/DialogProvider';
import { OfferCard } from '@/components/OfferCard';
import { ActionLink, PageHeader } from '@/components/PageHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { formatArs } from '@/lib/listings';
import type { Offer, OffersResponse } from '@/lib/offers';

type Tab = 'received' | 'sent';

function OffersContent() {
  const { confirm, prompt } = useDialog();
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

  async function counter(offer: Offer) {
    const raw = await prompt({
      title: 'Enviar contraoferta',
      message: `Precio publicado: ${formatArs(offer.listingPriceArs)}. La contraoferta no reserva el artículo.`,
      label: 'Monto en ARS',
      inputType: 'number',
      placeholder: String(offer.amountArs),
      confirmLabel: 'Enviar contraoferta',
    });

    if (!raw?.trim()) {
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

  async function rejectOffer(offer: Offer) {
    const confirmed = await confirm({
      title: 'Rechazar oferta',
      message: `Vas a rechazar la oferta de ${formatArs(
        offer.amountArs
      )}. La otra parte recibirá la notificación.`,
      confirmLabel: 'Rechazar oferta',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    await runAction(
      offer.id,
      () => apiFetch(`/offers/${offer.id}/reject`, { method: 'POST' }),
      'Oferta rechazada.'
    );
  }

  async function cancelOffer(offer: Offer) {
    const confirmed = await confirm({
      title: 'Cancelar oferta',
      message:
        'La oferta dejará de estar activa. Podés volver a ofertar mientras la publicación siga disponible.',
      confirmLabel: 'Cancelar oferta',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    await runAction(
      offer.id,
      () => apiFetch(`/offers/${offer.id}`, { method: 'DELETE' }),
      'Oferta cancelada.'
    );
  }

  const list = tab === 'received' ? offers.received : offers.sent;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-5 py-12">
      <PageHeader
        actions={
          <ActionLink href="/publicaciones" variant="secondary">
            Ir al catálogo
          </ActionLink>
        }
        description="Negociá el precio dentro de REVIA."
        title="Ofertas"
      />

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
            onReject={rejectOffer}
            onCounter={counter}
            onCancel={cancelOffer}
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
