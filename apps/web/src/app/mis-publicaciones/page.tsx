'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useDialog } from '@/components/DialogProvider';
import { ActionLink, PageHeader } from '@/components/PageHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { STATUS_LABELS, formatArs, listingCover, type Listing } from '@/lib/listings';

function MyListingsContent() {
  const { confirm } = useDialog();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ listings: Listing[] }>('/me/listings');
      setListings(data.listings);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar tus publicaciones'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);

    try {
      await action();
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar la acción');
    } finally {
      setBusyId(null);
    }
  }

  async function removeListing(id: string) {
    const confirmed = await confirm({
      title: 'Eliminar publicación',
      message:
        'La publicación dejará de estar visible. Si tiene una venta en curso, primero resolvé esa operación.',
      confirmLabel: 'Eliminar publicación',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    await runAction(id, () => apiFetch(`/listings/${id}`, { method: 'DELETE' }));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-5 py-12">
      <PageHeader
        actions={
          <ActionLink href="/publicar" variant="primary">
            Nueva publicación
          </ActionLink>
        }
        description="Gestioná tus artículos y su estado."
        title="Mis publicaciones"
      />

      {loading ? <p className="text-sm text-neutral-500">Cargando…</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && listings.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Todavía no publicaste nada.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
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
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-neutral-900">{listing.title}</h2>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                    {STATUS_LABELS[listing.status] ?? listing.status}
                  </span>
                </div>

                <p className="text-sm font-semibold text-neutral-800">
                  {formatArs(listing.priceArs)}
                </p>
                <p className="text-xs text-neutral-500">
                  {listing.photos.length} fotos · {listing.location}
                </p>

                {listing.rejectionReason ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    Motivo del rechazo: {listing.rejectionReason}
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Link
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800"
                    href={`/mis-publicaciones/${listing.id}`}
                  >
                    Editar
                  </Link>

                  {['draft', 'rejected'].includes(listing.status) ? (
                    <button
                      className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      type="button"
                      onClick={() =>
                        runAction(listing.id, () =>
                          apiFetch(`/listings/${listing.id}/submit`, { method: 'POST' })
                        )
                      }
                      disabled={busy}
                    >
                      Enviar a revisión
                    </button>
                  ) : null}

                  {listing.status === 'active' ? (
                    <>
                      <Link
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800"
                        href={`/publicaciones/${listing.id}`}
                      >
                        Ver pública
                      </Link>
                      <button
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 disabled:opacity-60"
                        type="button"
                        onClick={() =>
                          runAction(listing.id, () =>
                            apiFetch(`/listings/${listing.id}/pause`, { method: 'POST' })
                          )
                        }
                        disabled={busy}
                      >
                        Pausar
                      </button>
                    </>
                  ) : null}

                  {listing.status === 'paused' ? (
                    <button
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-800 disabled:opacity-60"
                      type="button"
                      onClick={() =>
                        runAction(listing.id, () =>
                          apiFetch(`/listings/${listing.id}/resume`, { method: 'POST' })
                        )
                      }
                      disabled={busy}
                    >
                      Reanudar
                    </button>
                  ) : null}

                  {listing.status !== 'sold' ? (
                    <button
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
                      type="button"
                      onClick={() => removeListing(listing.id)}
                      disabled={busy}
                    >
                      Eliminar
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

export default function MyListingsPage() {
  return (
    <ProtectedRoute>
      <MyListingsContent />
    </ProtectedRoute>
  );
}
