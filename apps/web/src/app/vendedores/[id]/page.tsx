'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ListingCard } from '@/components/ListingCard';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ApiError, apiFetch } from '@/lib/api';
import type { Listing, PublicSeller } from '@/lib/listings';

interface SellerProfile extends PublicSeller {
  stats: {
    followers: number;
    following: number;
    listings: number;
  };
}

export default function SellerPage() {
  const params = useParams<{ id: string }>();
  const sellerId = typeof params.id === 'string' ? params.id : '';
  const { user } = useAuth();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) {
      return;
    }

    Promise.all([
      apiFetch<{ user: SellerProfile }>(`/users/${sellerId}`),
      apiFetch<{ listings: Listing[] }>(`/users/${sellerId}/listings`),
    ])
      .then(([profile, sellerListings]) => {
        setSeller(profile.user);
        setFollowers(profile.user.stats.followers);
        setListings(sellerListings.listings);
      })
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : 'No encontramos este perfil.')
      )
      .finally(() => setLoading(false));
  }, [sellerId]);

  useEffect(() => {
    if (!user || !sellerId) {
      return;
    }

    apiFetch<{ isFollowing: boolean }>(`/users/${sellerId}/relationship`)
      .then((data) => setIsFollowing(data.isFollowing))
      .catch(() => setIsFollowing(false));
  }, [user, sellerId]);

  async function toggleFollow() {
    if (!user) {
      return;
    }

    const previous = isFollowing;
    setIsFollowing(!previous);
    setFollowers((value) => value + (previous ? -1 : 1));
    setBusy(true);
    setError(null);

    try {
      await apiFetch(`/users/${sellerId}/follow`, {
        method: previous ? 'DELETE' : 'POST',
      });
    } catch (caught) {
      setIsFollowing(previous);
      setFollowers((value) => value + (previous ? 1 : -1));
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudo actualizar el seguimiento'
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando perfil…</p>
      </main>
    );
  }

  if (error && !seller) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          No encontramos este perfil
        </h1>
        <Link className="text-sm font-semibold text-teal-700" href="/publicaciones">
          Volver a publicaciones
        </Link>
      </main>
    );
  }

  if (!seller) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-5 py-12">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-semibold text-teal-700" href="/publicaciones">
          Volver a publicaciones
        </Link>
        <Link className="text-sm font-semibold text-teal-700" href="/">
          Inicio
        </Link>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        {seller.avatarUrl ? (
          <img
            src={seller.avatarUrl}
            alt={seller.fullName}
            className="h-24 w-24 rounded-full border border-neutral-200 object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-neutral-100 text-2xl font-bold text-neutral-500">
            {seller.fullName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900">
              {seller.fullName}
            </h1>
            {seller.sellerVerified ? <VerifiedBadge /> : null}
          </div>
          <p className="text-sm text-neutral-500">{seller.location}</p>
          {seller.bio ? <p className="text-sm text-neutral-600">{seller.bio}</p> : null}
          <p className="mt-1 text-xs text-neutral-500">
            {seller.stats.listings} publicaciones · {followers} seguidores ·{' '}
            {seller.stats.following} siguiendo
          </p>
        </div>

        {user && user.id !== seller.id ? (
          <button
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
              isFollowing ? 'border border-neutral-300 text-neutral-800' : 'bg-teal-700 text-white'
            }`}
            type="button"
            onClick={toggleFollow}
            disabled={busy}
          >
            {isFollowing ? 'Dejar de seguir' : 'Seguir'}
          </button>
        ) : null}

        {!user ? (
          <Link
            className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"
            href="/ingresar"
          >
            Ingresá para seguir
          </Link>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          Publicaciones activas
        </h2>

        {listings.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
            Este vendedor no tiene publicaciones activas.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
