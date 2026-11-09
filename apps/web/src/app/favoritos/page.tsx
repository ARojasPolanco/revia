'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ListingCard } from '@/components/ListingCard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import type { Listing } from '@/lib/listings';

function FavoritesContent() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ listings: Listing[] }>('/me/favorites')
      .then((data) => setListings(data.listings))
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : 'No se pudieron cargar tus favoritos'
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Favoritos</h1>
          <p className="text-sm text-neutral-600">Publicaciones que guardaste para después.</p>
        </div>
        <div className="flex gap-2">
          <Link
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
            href="/publicaciones"
          >
            Explorar
          </Link>
          <Link
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
            href="/"
          >
            Inicio
          </Link>
        </div>
      </header>

      {loading ? <p className="text-sm text-neutral-500">Cargando favoritos…</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && listings.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Todavía no guardaste publicaciones.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </main>
  );
}

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesContent />
    </ProtectedRoute>
  );
}
