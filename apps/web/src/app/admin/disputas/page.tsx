'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useDialog } from '@/components/DialogProvider';
import { AdminTabs, PageHeader } from '@/components/PageHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { disputeStatusLabel, type Dispute } from '@/lib/disputes';
import { formatArs } from '@/lib/listings';
import { formatDateTime } from '@/lib/orders';

function AdminDisputesContent() {
  const { user } = useAuth();
  const { confirm, prompt } = useDialog();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const allowed = user?.role === 'support' || user?.role === 'admin';

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch<{ disputes: Dispute[] }>('/admin/disputes');
      setDisputes(data.disputes);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron cargar las disputas.');
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(
    dispute: Dispute,
    resolution: 'refund_money' | 'refund_coupon' | 'reject'
  ) {
    let amountArs: number | undefined;

    if (resolution === 'refund_money') {
      const rawAmount = await prompt({
        title: 'Reembolso de dinero',
        message: `Dejá el monto vacío para reembolsar el total (${formatArs(dispute.order.totalAmountArs)}).`,
        label: 'Monto a reembolsar en ARS',
        inputType: 'number',
        placeholder: String(dispute.order.totalAmountArs),
        confirmLabel: 'Continuar',
      });

      if (rawAmount === null) {
        return;
      }

      if (rawAmount.trim()) {
        amountArs = Number(rawAmount);

        if (!Number.isFinite(amountArs) || amountArs <= 0) {
          setError('Ingresá un monto válido.');
          return;
        }
      }
    }

    const rawNotes = await prompt({
      title: 'Notas de resolución',
      message: 'Estas notas quedan en la auditoría de la disputa.',
      label: 'Notas (opcional)',
      multiline: true,
      confirmLabel: 'Continuar',
    });

    if (rawNotes === null) {
      return;
    }

    const notes = rawNotes.trim() || undefined;

    const confirmed = await confirm({
      title: 'Confirmar resolución',
      message:
        resolution === 'refund_money'
          ? 'Se iniciará un reembolso por Talo y se anulará el payout.'
          : resolution === 'refund_coupon'
            ? 'Se emitirá un cupón por el valor del artículo y se anulará el payout.'
            : 'La disputa se rechazará, la orden se completará y se habilitará el payout.',
      confirmLabel: 'Resolver disputa',
      tone: resolution === 'reject' ? 'danger' : 'default',
    });

    if (!confirmed) {
      return;
    }
    setBusyId(dispute.id);
    setError(null);
    setMessage(null);

    try {
      await apiFetch(`/admin/disputes/${dispute.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution, amountArs, notes }),
      });
      await load();
      setMessage('Disputa resuelta.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo resolver la disputa.');
    } finally {
      setBusyId(null);
    }
  }

  if (!allowed) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Sin permisos</h1>
        <p className="text-sm text-neutral-600">
          Esta sección es solo para soporte y administración de REVIA.
        </p>
        <Link className="text-sm font-semibold text-teal-700" href="/">
          Volver al inicio
        </Link>
      </main>
    );
  }

  const openDisputes = disputes.filter(
    (dispute) =>
      !['resolved_refund', 'resolved_coupon', 'resolved_rejected', 'cancelled'].includes(
        dispute.status
      )
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-5 py-12">
      <PageHeader description="Resolver reclamos con SLA de 72 horas." title="Disputas" />
      <AdminTabs current="/admin/disputas" role={user?.role} />

      <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
        Los reembolsos con dinero se procesan por la pasarela y pueden quedar pendientes de
        acreditación. El cupón se emite al instante y no pasa por la pasarela.
      </p>

      {loading ? <p className="text-sm text-neutral-500">Cargando disputas.</p> : null}

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

      {!loading && openDisputes.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          No hay disputas abiertas.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {openDisputes.map((dispute) => (
          <article
            className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
            key={dispute.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  className="text-sm font-bold text-neutral-900 underline-offset-2 hover:underline"
                  href={`/disputas/${dispute.id}`}
                >
                  {dispute.order.title}
                </Link>
                <p className="text-xs text-neutral-500">
                  {dispute.reasonLabel} · Comprador: {dispute.buyer?.fullName ?? '-'} · Vendedor:{' '}
                  {dispute.seller?.fullName ?? '-'}
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                {disputeStatusLabel(dispute.status)}
              </span>
            </div>

            <p className="text-sm text-neutral-600">{dispute.description}</p>
            <p className="text-xs text-neutral-500">
              Total: {formatArs(dispute.order.totalAmountArs)} · SLA:{' '}
              {formatDateTime(dispute.slaDueAt)}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                type="button"
                onClick={() => void resolve(dispute, 'refund_money')}
                disabled={busyId !== null}
              >
                Reembolsar dinero
              </button>
              <button
                className="rounded-lg border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-700 disabled:opacity-60"
                type="button"
                onClick={() => void resolve(dispute, 'refund_coupon')}
                disabled={busyId !== null}
              >
                Emitir cupón
              </button>
              <button
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
                type="button"
                onClick={() => void resolve(dispute, 'reject')}
                disabled={busyId !== null}
              >
                Rechazar
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

export default function AdminDisputesPage() {
  return (
    <ProtectedRoute>
      <AdminDisputesContent />
    </ProtectedRoute>
  );
}
