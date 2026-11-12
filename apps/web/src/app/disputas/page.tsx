'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { formatArs } from '@/lib/listings';
import { formatDateTime } from '@/lib/orders';
import { disputeStatusLabel, type Dispute } from '@/lib/disputes';

function DisputesContent() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ disputes: Dispute[] }>('/disputes')
      .then((data) => setDisputes(data.disputes))
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : 'No se pudieron cargar las disputas.'
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-5 py-12">
      <PageHeader description="Seguí los reclamos de tus compras y ventas." title="Mis disputas" />

      {loading ? <p className="text-sm text-neutral-500">Cargando disputas.</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && disputes.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          No tenés disputas abiertas.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {disputes.map((dispute) => (
          <Link
            className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
            key={dispute.id}
            href={`/disputas/${dispute.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-neutral-900">{dispute.order.title}</p>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                {disputeStatusLabel(dispute.status)}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {dispute.reasonLabel} · {formatArs(dispute.order.totalAmountArs)}
            </p>
            <p className="text-[11px] text-neutral-400">
              Abierta: {formatDateTime(dispute.createdAt)} · SLA: {formatDateTime(dispute.slaDueAt)}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}

export default function DisputesPage() {
  return (
    <ProtectedRoute>
      <DisputesContent />
    </ProtectedRoute>
  );
}
