'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { ListingCard } from '@/components/ListingCard';
import { ApiError, apiFetch } from '@/lib/api';
import type { Listing } from '@/lib/listings';

interface ListingsResponse {
  listings: Listing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const PAGE_SIZE = 12;

export function HomeFeed() {
  const { user } = useAuth();
  const [recommended, setRecommended] = useState<Listing[]>([]);
  const [following, setFollowing] = useState<Listing[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadInitial = useCallback(async () => {
    setInitialLoading(true);
    setError(null);
    setLoadMoreError(null);

    try {
      const data = await apiFetch<ListingsResponse>(
        `/listings?page=1&limit=${PAGE_SIZE}&sort=recent`
      );
      setRecommended(data.listings);
      setPage(1);
      setHasMore(data.listings.length > 0 && data.listings.length < data.pagination.total);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar las publicaciones'
      );
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) {
      return;
    }

    loadingRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const nextPage = page + 1;
      const data = await apiFetch<ListingsResponse>(
        `/listings?page=${nextPage}&limit=${PAGE_SIZE}&sort=recent`
      );

      setRecommended((current) => {
        const seen = new Set(current.map((listing) => listing.id));
        return [...current, ...data.listings.filter((listing) => !seen.has(listing.id))];
      });
      setPage(nextPage);
      setHasMore(data.listings.length > 0 && nextPage * PAGE_SIZE < data.pagination.total);
    } catch (caught) {
      setLoadMoreError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar más publicaciones'
      );
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, page]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node || !hasMore || loadMoreError) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: '400px 0px' }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [hasMore, loadMore, loadMoreError]);

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {initialLoading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Cargando publicaciones.
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <span>{error}</span>
            <button
              className="font-semibold underline"
              type="button"
              onClick={() => void loadInitial()}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!initialLoading && !error && recommended.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
            Todavía no hay publicaciones activas.
          </p>
        ) : null}

        {recommended.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : null}

        {!initialLoading && recommended.length > 0 && hasMore ? (
          <div aria-live="polite" className="flex justify-center py-2">
            {loadingMore ? (
              <span className="inline-flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                Cargando más publicaciones.
              </span>
            ) : loadMoreError ? (
              <button
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                type="button"
                onClick={() => void loadMore()}
              >
                Reintentar
              </button>
            ) : (
              <div aria-hidden="true" ref={sentinelRef} />
            )}
          </div>
        ) : null}

        {loadMoreError && !loadingMore ? (
          <p className="text-center text-xs text-red-700">{loadMoreError}</p>
        ) : null}

        {!initialLoading && recommended.length > 0 && !hasMore ? (
          <p className="text-center text-xs text-neutral-400">No hay más publicaciones.</p>
        ) : null}
      </section>
    </div>
  );
}
