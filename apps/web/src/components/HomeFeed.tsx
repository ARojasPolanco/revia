'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { ListingCard } from '@/components/ListingCard';
import { ApiError, apiFetch } from '@/lib/api';
import type { Listing } from '@/lib/listings';

export function HomeFeed() {
  const { user } = useAuth();
  const [recommended, setRecommended] = useState<Listing[]>([]);
  const [following, setFollowing] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ listings: Listing[] }>('/feed')
      .then((data) => setRecommended(data.listings))
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el feed')
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setFollowing([]);
      return;
    }

    apiFetch<{ listings: Listing[] }>('/me/feed')
      .then((data) => setFollowing(data.listings))
      .catch(() => setFollowing([]));
  }, [user]);

  return (
    <div className="flex flex-col gap-8">
      {user ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
              De vendedores que seguís
            </h2>
            <Link className="text-xs font-semibold text-teal-700" href="/publicaciones">
              Explorar más
            </Link>
          </div>

          {following.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {following.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
              Seguí vendedores para ver sus novedades acá.
            </p>
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Recomendados
          </h2>
          <Link className="text-xs font-semibold text-teal-700" href="/publicaciones">
            Ver todo
          </Link>
        </div>

        {loading ? <p className="text-sm text-neutral-500">Cargando publicaciones…</p> : null}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {!loading && recommended.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
            Todavía no hay publicaciones activas.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommended.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </div>
  );
}
