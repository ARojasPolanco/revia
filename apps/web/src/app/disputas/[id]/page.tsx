'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useDialog } from '@/components/DialogProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { disputeEventLabel, disputeStatusLabel, type Dispute } from '@/lib/disputes';
import { formatArs } from '@/lib/listings';
import { formatDateTime } from '@/lib/orders';

function DisputeDetailContent() {
  const params = useParams<{ id: string }>();
  const disputeId = typeof params.id === 'string' ? params.id : '';
  const { user } = useAuth();
  const { prompt } = useDialog();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageBusy, setMessageBusy] = useState(false);
  const [evidenceKind, setEvidenceKind] = useState('link');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceBody, setEvidenceBody] = useState('');
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [offerBusy, setOfferBusy] = useState(false);

  const load = useCallback(async () => {
    if (!disputeId) {
      return;
    }

    try {
      const data = await apiFetch<{ dispute: Dispute }>(`/disputes/${disputeId}`);
      setDispute(data.dispute);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar la disputa.');
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessageBusy(true);
    setError(null);

    try {
      await apiFetch(`/disputes/${disputeId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: message }),
      });
      setMessage('');
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar el mensaje.');
    } finally {
      setMessageBusy(false);
    }
  }

  async function sendEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEvidenceBusy(true);
    setError(null);

    try {
      await apiFetch(`/disputes/${disputeId}/evidence`, {
        method: 'POST',
        body: JSON.stringify({
          kind: evidenceKind,
          url: evidenceUrl || undefined,
          body: evidenceBody || undefined,
        }),
      });
      setEvidenceUrl('');
      setEvidenceBody('');
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo agregar la evidencia.');
    } finally {
      setEvidenceBusy(false);
    }
  }

  async function sellerOffer(type: 'partial_refund' | 'cover_return') {
    let amountArs: number | undefined;

    if (type === 'partial_refund') {
      const raw = await prompt({
        title: 'Ofrecer reembolso parcial',
        message: `El comprador verá la oferta en la disputa. Total de la orden: ${formatArs(
          dispute?.order.totalAmountArs ?? 0
        )}.`,
        label: 'Monto en ARS',
        inputType: 'number',
        confirmLabel: 'Enviar oferta',
      });

      if (!raw?.trim()) {
        return;
      }

      amountArs = Number(raw);

      if (!Number.isFinite(amountArs) || amountArs <= 0) {
        setError('Ingresá un monto válido.');
        return;
      }
    }

    setOfferBusy(true);
    setError(null);

    try {
      await apiFetch(`/disputes/${disputeId}/offer`, {
        method: 'POST',
        body: JSON.stringify({ type, amountArs }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar la oferta.');
    } finally {
      setOfferBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando disputa.</p>
      </main>
    );
  }

  if (!dispute) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          No encontramos esa disputa
        </h1>
        <Link className="text-sm font-semibold text-teal-700" href="/disputas">
          Volver a mis disputas
        </Link>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </main>
    );
  }

  const isSeller = user?.id === dispute.seller?.id;
  const closed = ['resolved_refund', 'resolved_coupon', 'resolved_rejected', 'cancelled'].includes(
    dispute.status
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-5 py-12">
      <Link className="text-sm font-semibold text-teal-700" href="/disputas">
        ← Volver a mis disputas
      </Link>

      <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Disputa</p>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900">
              {dispute.order.title}
            </h1>
            <p className="mt-1 text-xs text-neutral-500">
              {dispute.reasonLabel} · {formatArs(dispute.order.totalAmountArs)}
            </p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
            {disputeStatusLabel(dispute.status)}
          </span>
        </div>

        <p className="whitespace-pre-line text-sm text-neutral-600">{dispute.description}</p>
        <p className="text-[11px] text-neutral-400">
          Abierta: {formatDateTime(dispute.createdAt)} · SLA: {formatDateTime(dispute.slaDueAt)}
        </p>

        {dispute.resolutionNotes ? (
          <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            Resolución: {dispute.resolutionNotes}
          </p>
        ) : null}

        {dispute.refund ? (
          <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900">
            Reembolso {dispute.refund.refundType} de {formatArs(dispute.refund.amountArs)} ·{' '}
            {dispute.refund.status}
          </p>
        ) : null}

        {dispute.coupon ? (
          <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900">
            Cupón emitido: <strong>{dispute.coupon.code}</strong> por{' '}
            {formatArs(dispute.coupon.amountArs)}
          </p>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Historial</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {dispute.events.map((event) => (
            <li className="flex gap-3" key={event.id}>
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <div>
                <p className="text-sm font-semibold text-neutral-800">
                  {disputeEventLabel(event.type)}
                </p>
                {event.message ? <p className="text-xs text-neutral-600">{event.message}</p> : null}
                <p className="text-[11px] text-neutral-400">
                  {formatDateTime(event.createdAt)}
                  {event.actor ? ` · ${event.actor.fullName}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Evidencia</h2>
        {dispute.evidence.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Todavía no hay evidencia.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {dispute.evidence.map((item) => (
              <li
                className="rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-xs"
                key={item.id}
              >
                <p className="font-semibold text-neutral-700">
                  {item.kind} · {item.uploader?.fullName ?? 'Usuario'}
                </p>
                {item.body ? <p className="text-neutral-600">{item.body}</p> : null}
                {item.url ? (
                  <a
                    className="break-all font-semibold text-teal-700 underline"
                    href={item.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.url}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {!closed ? (
          <form
            className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-3"
            onSubmit={sendEvidence}
          >
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs"
                value={evidenceKind}
                onChange={(event) => setEvidenceKind(event.target.value)}
              >
                <option value="link">Enlace</option>
                <option value="image">Imagen (URL)</option>
                <option value="video">Video (URL)</option>
                <option value="text">Texto</option>
              </select>
              <input
                className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs"
                placeholder="URL de la evidencia (opcional)"
                value={evidenceUrl}
                onChange={(event) => setEvidenceUrl(event.target.value)}
              />
            </div>
            <textarea
              className="min-h-16 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Descripción de la evidencia"
              value={evidenceBody}
              onChange={(event) => setEvidenceBody(event.target.value)}
            />
            <button
              className="w-fit rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 disabled:opacity-60"
              type="submit"
              disabled={evidenceBusy || (!evidenceUrl && !evidenceBody)}
            >
              {evidenceBusy ? 'Agregando.' : 'Agregar evidencia'}
            </button>
          </form>
        ) : null}
      </section>

      {!closed ? (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Mensajes</h2>
          <form className="mt-3 flex flex-col gap-2" onSubmit={sendMessage}>
            <textarea
              className="min-h-20 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              maxLength={2000}
              placeholder="Escribí un mensaje para la otra parte."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
            />
            <button
              className="w-fit rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              type="submit"
              disabled={messageBusy}
            >
              {messageBusy ? 'Enviando.' : 'Enviar mensaje'}
            </button>
          </form>

          {isSeller ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-200 pt-3">
              <button
                className="rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-700 disabled:opacity-60"
                type="button"
                onClick={() => void sellerOffer('partial_refund')}
                disabled={offerBusy}
              >
                Ofrecer reembolso parcial
              </button>
              <button
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 disabled:opacity-60"
                type="button"
                onClick={() => void sellerOffer('cover_return')}
                disabled={offerBusy}
              >
                Cubrir envío de devolución
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

export default function DisputeDetailPage() {
  return (
    <ProtectedRoute>
      <DisputeDetailContent />
    </ProtectedRoute>
  );
}
