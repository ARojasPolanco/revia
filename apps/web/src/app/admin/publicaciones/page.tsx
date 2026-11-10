'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { formatArs, listingCover, type Listing } from '@/lib/listings';

interface Report {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  listing: { id: string; title: string; status: string } | null;
  reporter: { id: string; fullName: string } | null;
}

function ModerationContent() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const allowed = user?.role === 'admin' || user?.role === 'moderator';

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }

    try {
      const [pending, openReports] = await Promise.all([
        apiFetch<{ listings: Listing[] }>('/admin/listings?status=pending'),
        apiFetch<{ reports: Report[] }>('/admin/reports?status=open'),
      ]);
      setListings(pending.listings);
      setReports(openReports.reports);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar la moderación');
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    setMessage(null);

    try {
      await action();
      await load();
      setMessage('Acción realizada.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar la acción');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(listingId: string) {
    const reason = window.prompt('Motivo del rechazo (visible para el vendedor):');

    if (!reason) {
      return;
    }

    await runAction(listingId, () =>
      apiFetch(`/admin/listings/${listingId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    );
  }

  if (!allowed) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Sin permisos</h1>
        <p className="text-sm text-neutral-600">
          Esta sección es solo para moderación y administración de REVIA.
        </p>
        <Link className="text-sm font-semibold text-teal-700" href="/">
          Volver al inicio
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">
            Moderación de publicaciones
          </h1>
          <p className="text-sm text-neutral-600">
            Aprobá o rechazá publicaciones pendientes y revisá denuncias.
          </p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'admin' ? (
            <Link className="text-sm font-semibold text-teal-700" href="/admin/finanzas">
              Finanzas
            </Link>
          ) : null}
          <Link className="text-sm font-semibold text-teal-700" href="/">
            Inicio
          </Link>
        </div>
      </header>

      {loading ? <p className="text-sm text-neutral-500">Cargando…</p> : null}

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

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          Pendientes ({listings.length})
        </h2>

        {!loading && listings.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
            No hay publicaciones pendientes.
          </p>
        ) : null}

        {listings.map((listing) => {
          const cover = listingCover(listing);
          const busy = busyId === listing.id;

          return (
            <article
              className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row"
              key={listing.id}
            >
              {cover ? (
                <img
                  src={cover}
                  alt={listing.title}
                  className="h-32 w-full rounded-xl object-cover sm:w-40"
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-xl bg-neutral-100 text-sm text-neutral-400 sm:w-40">
                  Sin foto
                </div>
              )}

              <div className="flex flex-1 flex-col gap-2">
                <h3 className="text-lg font-bold text-neutral-900">{listing.title}</h3>
                <p className="text-sm font-semibold text-neutral-800">
                  {formatArs(listing.priceArs)}
                </p>
                <p className="text-xs text-neutral-500">
                  {listing.category?.parent?.name} · {listing.category?.name} ·{' '}
                  {listing.photos.length} fotos
                </p>
                <p className="text-xs text-neutral-500">
                  Vendedor: {listing.seller?.fullName ?? '—'} · {listing.location}
                </p>
                <p className="line-clamp-2 text-xs text-neutral-500">{listing.description}</p>

                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <button
                    className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    type="button"
                    onClick={() =>
                      runAction(listing.id, () =>
                        apiFetch(`/admin/listings/${listing.id}/approve`, { method: 'POST' })
                      )
                    }
                    disabled={busy}
                  >
                    Aprobar
                  </button>
                  <button
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
                    type="button"
                    onClick={() => reject(listing.id)}
                    disabled={busy}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          Denuncias abiertas ({reports.length})
        </h2>

        {!loading && reports.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
            No hay denuncias abiertas.
          </p>
        ) : null}

        {reports.map((report) => (
          <article
            className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
            key={report.id}
          >
            <p className="text-sm font-bold text-neutral-900">
              {report.listing?.title ?? 'Publicación'}
            </p>
            <p className="text-xs text-neutral-500">
              Denunciada por {report.reporter?.fullName ?? '—'}
            </p>
            <p className="text-sm text-neutral-700">{report.reason}</p>
            <div className="flex gap-2">
              <button
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 disabled:opacity-60"
                type="button"
                onClick={() =>
                  runAction(report.id, () =>
                    apiFetch(`/admin/reports/${report.id}/resolve`, {
                      method: 'POST',
                      body: JSON.stringify({ status: 'resolved' }),
                    })
                  )
                }
                disabled={busyId !== null}
              >
                Resolver
              </button>
              <button
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 disabled:opacity-60"
                type="button"
                onClick={() =>
                  runAction(report.id, () =>
                    apiFetch(`/admin/reports/${report.id}/resolve`, {
                      method: 'POST',
                      body: JSON.stringify({ status: 'dismissed' }),
                    })
                  )
                }
                disabled={busyId !== null}
              >
                Descartar
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default function ModerationPage() {
  return (
    <ProtectedRoute>
      <ModerationContent />
    </ProtectedRoute>
  );
}
