'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, apiFetch } from '@/lib/api';
import { CONDITION_LABELS, formatArs, listingCover, type Listing } from '@/lib/listings';

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ listings: Listing[] }>('/listings?limit=24')
      .then((data) => setListings(data.listings))
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : 'No se pudieron cargar las publicaciones'
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Publicaciones</h1>
          <p className="text-sm text-neutral-600">Artículos de segunda mano en Bahía Blanca.</p>
        </div>
        <div className="flex gap-2">
          <Link
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
            href="/"
          >
            Inicio
          </Link>
          <Link
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
            href="/publicar"
          >
            Publicar
          </Link>
        </div>
      </header>

      {loading ? <p className="text-sm text-neutral-500">Cargando publicaciones…</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && listings.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Todavía no hay publicaciones activas.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => {
          const cover = listingCover(listing);

          return (
            <Link
              className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
              href={`/publicaciones/${listing.id}`}
              key={listing.id}
            >
              {cover ? (
                <img
                  src={cover}
                  alt={listing.title}
                  className="h-48 w-full object-cover transition group-hover:opacity-95"
                />
              ) : (
                <div className="flex h-48 items-center justify-center bg-neutral-100 text-sm text-neutral-400">
                  Sin foto
                </div>
              )}

              <div className="flex flex-col gap-1 p-4">
                <p className="text-lg font-bold text-neutral-900">{formatArs(listing.priceArs)}</p>
                <h2 className="line-clamp-2 text-sm font-semibold text-neutral-800">
                  {listing.title}
                </h2>
                <p className="text-xs text-neutral-500">
                  {CONDITION_LABELS[listing.condition] ?? listing.condition} · {listing.location}
                </p>
                {listing.seller ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    {listing.seller.fullName}
                    {listing.seller.sellerVerified ? ' · Perfil verificado' : ''}
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
