'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useDialog } from '@/components/DialogProvider';
import { AdminTabs, PageHeader } from '@/components/PageHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import type { Review } from '@/lib/reviews';

interface ReviewReport {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  review: Review | null;
  reporter: { id: string; fullName: string } | null;
}

function AdminReviewsContent() {
  const { user } = useAuth();
  const { confirm } = useDialog();
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allowed = user?.role === 'support' || user?.role === 'admin';

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch<{ reports: ReviewReport[] }>(
        '/admin/reviews/reports?status=open'
      );
      setReports(data.reports);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar las denuncias.'
      );
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function hideReview(report: ReviewReport) {
    if (!report.review) {
      return;
    }

    const confirmed = await confirm({
      title: 'Ocultar reseña',
      message:
        'La reseña dejará de ser visible en el perfil público. La denuncia quedará resuelta.',
      confirmLabel: 'Ocultar reseña',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setBusyId(report.id);
    setError(null);

    try {
      await apiFetch(`/admin/reviews/${report.review.id}/hide`, { method: 'POST' });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo ocultar la reseña.');
    } finally {
      setBusyId(null);
    }
  }

  async function dismissReview(report: ReviewReport) {
    const confirmed = await confirm({
      title: 'Descartar denuncia',
      message: 'La reseña seguirá visible. La denuncia quedará marcada como descartada.',
      confirmLabel: 'Descartar denuncia',
    });

    if (!confirmed) {
      return;
    }

    setBusyId(report.id);
    setError(null);

    try {
      await apiFetch(`/admin/reviews/reports/${report.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ status: 'dismissed' }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo descartar la denuncia.');
    } finally {
      setBusyId(null);
    }
  }

  if (!allowed) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Sin permisos</h1>
        <Link className="text-sm font-semibold text-teal-700" href="/">
          Volver al inicio
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-5 py-12">
      <PageHeader
        description="Revisá denuncias y ocultá reseñas abusivas."
        title="Moderación de reseñas"
      />
      <AdminTabs current="/admin/resenas" role={user?.role} />

      {loading ? <p className="text-sm text-neutral-500">Cargando denuncias.</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && reports.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          No hay denuncias de reseñas.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {reports.map((report) => (
          <article
            className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
            key={report.id}
          >
            <p className="text-sm font-bold text-neutral-900">
              {report.review?.target?.fullName ?? 'Usuario'} · {report.review?.rating ?? '-'}/5
            </p>
            <p className="text-xs text-neutral-500">
              Denunciado por: {report.reporter?.fullName ?? '-'}
            </p>
            <p className="text-sm text-neutral-600">{report.review?.comment ?? 'Sin comentario'}</p>
            <p className="text-xs text-neutral-500">Motivo: {report.reason}</p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
                type="button"
                onClick={() => void hideReview(report)}
                disabled={busyId !== null}
              >
                Ocultar reseña
              </button>
              <button
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 disabled:opacity-60"
                type="button"
                onClick={() => void dismissReview(report)}
                disabled={busyId !== null}
              >
                Descartar denuncia
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

export default function AdminReviewsPage() {
  return (
    <ProtectedRoute>
      <AdminReviewsContent />
    </ProtectedRoute>
  );
}
