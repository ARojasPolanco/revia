import Link from 'next/link';
import { formatArs } from '@/lib/listings';
import { OFFER_STATUS_LABELS, type Offer } from '@/lib/offers';

interface Props {
  offer: Offer;
  mode: 'sent' | 'received';
  busy: boolean;
  onAccept: (offer: Offer) => void;
  onReject: (offer: Offer) => void;
  onCounter: (offer: Offer) => void;
  onCancel: (offer: Offer) => void;
}

function formatDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function OfferCard({ offer, mode, busy, onAccept, onReject, onCounter, onCancel }: Props) {
  const otherUser = mode === 'received' ? offer.buyer : offer.seller;
  const pending = offer.status === 'pending';

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            className="text-sm font-bold text-neutral-900 underline-offset-2 hover:underline"
            href={`/publicaciones/${offer.listingId}`}
          >
            {offer.listingTitle}
          </Link>
          <p className="text-xs text-neutral-500">
            {mode === 'received' ? 'Oferta de' : 'Vendedor'}: {otherUser?.fullName ?? '—'}
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
          {OFFER_STATUS_LABELS[offer.status] ?? offer.status}
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-2xl font-black text-neutral-900">{formatArs(offer.amountArs)}</p>
          <p className="text-xs text-neutral-500">
            Precio publicado: {formatArs(offer.listingPriceArs)}
          </p>
        </div>

        {pending ? (
          <p className="text-xs text-neutral-500">Vence: {formatDate(offer.expiresAt)}</p>
        ) : null}
      </div>

      {offer.status === 'accepted' ? (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
          {mode === 'sent'
            ? `Oferta aceptada. El pago se habilita en la próxima fase. Vence ${formatDate(offer.paymentExpiresAt) ?? 'en 24 h'}.`
            : 'Oferta aceptada. Esperando el pago del comprador.'}
        </p>
      ) : null}

      {pending ? (
        <div className="flex flex-wrap gap-2">
          {mode === 'received' ? (
            <>
              <button
                className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                type="button"
                onClick={() => onAccept(offer)}
                disabled={busy}
              >
                Aceptar
              </button>
              <button
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
                type="button"
                onClick={() => onReject(offer)}
                disabled={busy}
              >
                Rechazar
              </button>
              <button
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 disabled:opacity-60"
                type="button"
                onClick={() => onCounter(offer)}
                disabled={busy}
              >
                Contraofertar
              </button>
            </>
          ) : (
            <button
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 disabled:opacity-60"
              type="button"
              onClick={() => onCancel(offer)}
              disabled={busy}
            >
              Cancelar oferta
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}
