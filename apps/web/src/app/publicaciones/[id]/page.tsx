'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ApiError, apiFetch } from '@/lib/api';
import {
  CONDITION_LABELS,
  DELIVERY_LABELS,
  formatArs,
  type Category,
  type Listing,
} from '@/lib/listings';

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  useEffect(() => {
    const id = typeof params.id === 'string' ? params.id : '';

    if (!id) {
      return;
    }

    apiFetch<{ listing: Listing }>(`/listings/${id}`)
      .then((data) => setListing(data.listing))
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : 'No encontramos lo que buscabas.')
      )
      .finally(() => setLoading(false));

    apiFetch<{ categories: Category[] }>('/categories')
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, [params.id]);

  useEffect(() => {
    if (!user || !listing) {
      return;
    }

    apiFetch<{ favorite: boolean }>(`/listings/${listing.id}/favorite`)
      .then((data) => setIsFavorite(data.favorite))
      .catch(() => setIsFavorite(false));
  }, [user, listing]);

  async function toggleFavorite() {
    if (!listing) {
      return;
    }

    if (!user) {
      setReportMessage('Iniciá sesión para guardar favoritos.');
      return;
    }

    const previous = isFavorite;
    setIsFavorite(!previous);
    setFavoriteBusy(true);
    setReportMessage(null);

    try {
      await apiFetch(`/listings/${listing.id}/favorite`, {
        method: previous ? 'DELETE' : 'POST',
      });
    } catch (caught) {
      setIsFavorite(previous);
      setReportMessage(
        caught instanceof ApiError ? caught.message : 'No se pudo actualizar favoritos.'
      );
    } finally {
      setFavoriteBusy(false);
    }
  }

  async function reportListing() {
    if (!listing) {
      return;
    }

    const reason = window.prompt('Contanos brevemente por qué querés denunciar esta publicación.');

    if (!reason) {
      return;
    }

    try {
      const data = await apiFetch<{ message?: string }>(`/listings/${listing.id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setReportMessage(data.message ?? 'Recibimos tu denuncia.');
    } catch (caught) {
      setReportMessage(
        caught instanceof ApiError ? caught.message : 'No se pudo enviar la denuncia.'
      );
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando publicación…</p>
      </main>
    );
  }

  if (error || !listing) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          No encontramos lo que buscabas
        </h1>
        <Link className="text-sm font-semibold text-teal-700" href="/publicaciones">
          Volver a publicaciones
        </Link>
      </main>
    );
  }

  const photos = listing.photos;
  const currentPhoto = photos[activePhoto] ?? photos[0];
  const leafCategories = categories.flatMap((category) => category.children ?? []);
  const categoryDefinition = leafCategories.find(
    (category) => category.id === listing.category?.id
  );
  const attributes = (categoryDefinition?.attributes ?? [])
    .map((attribute) => ({
      label: attribute.label,
      value: listing.attributes[attribute.key],
    }))
    .filter(
      (attribute) =>
        attribute.value !== undefined && attribute.value !== null && attribute.value !== ''
    );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-12">
      <header className="flex items-center justify-between">
        <Link className="text-sm font-semibold text-teal-700" href="/publicaciones">
          Volver a publicaciones
        </Link>
        <Link className="text-sm font-semibold text-teal-700" href="/">
          Inicio
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="flex flex-col gap-3">
          {currentPhoto ? (
            <img
              src={currentPhoto.url}
              alt={listing.title}
              className="h-80 w-full rounded-2xl border border-neutral-200 object-cover sm:h-[420px]"
            />
          ) : (
            <div className="flex h-80 items-center justify-center rounded-2xl bg-neutral-100 text-sm text-neutral-400 sm:h-[420px]">
              Sin foto
            </div>
          )}

          {photos.length > 1 ? (
            <div className="grid grid-cols-5 gap-2">
              {photos.map((photo, index) => (
                <button
                  className={`overflow-hidden rounded-lg border ${
                    index === activePhoto ? 'border-teal-600' : 'border-neutral-200'
                  }`}
                  type="button"
                  key={photo.id}
                  onClick={() => setActivePhoto(index)}
                >
                  <img
                    src={photo.thumbnailUrl}
                    alt={`Foto ${index + 1}`}
                    className="h-16 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              {listing.category?.parent ? `${listing.category.parent.name} · ` : ''}
              {listing.category?.name}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-neutral-900">
              {listing.title}
            </h1>
            <p className="mt-2 text-3xl font-black text-neutral-900">
              {formatArs(listing.priceArs)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {CONDITION_LABELS[listing.condition] ?? listing.condition} · {listing.location}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                className="w-full cursor-not-allowed rounded-xl bg-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-500"
                type="button"
                disabled
              >
                Comprar (disponible en la próxima fase)
              </button>
              <button
                className="w-full rounded-xl border border-teal-700 px-4 py-3 text-sm font-semibold text-teal-700 disabled:opacity-60"
                type="button"
                onClick={toggleFavorite}
                disabled={favoriteBusy}
              >
                {isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Detalles</h2>
            <dl className="mt-3 grid gap-2 text-sm text-neutral-600">
              {attributes.map((attribute) => (
                <div className="flex justify-between gap-4" key={attribute.label}>
                  <dt className="text-neutral-500">{attribute.label}</dt>
                  <dd className="text-right font-medium text-neutral-800">
                    {String(attribute.value)}
                  </dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-neutral-400">
              Entrega
            </h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-neutral-600">
              {listing.deliveryModes.map((mode) => (
                <li key={mode}>{DELIVERY_LABELS[mode] ?? mode}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Descripción</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-600">
              {listing.description}
            </p>
          </div>

          {listing.seller ? (
            <Link
              className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
              href={`/vendedores/${listing.seller.id}`}
            >
              {listing.seller.avatarUrl ? (
                <img
                  src={listing.seller.avatarUrl}
                  alt={listing.seller.fullName}
                  className="h-14 w-14 rounded-full border border-neutral-200 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-lg font-bold text-neutral-500">
                  {listing.seller.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-neutral-900">
                  {listing.seller.fullName}
                  {listing.seller.sellerVerified ? <VerifiedBadge /> : null}
                </p>
                <p className="text-xs text-neutral-500">{listing.seller.location}</p>
                <p className="text-xs font-semibold text-teal-700">Ver perfil</p>
              </div>
            </Link>
          ) : null}

          <button
            className="w-fit text-xs font-semibold text-neutral-500 underline"
            type="button"
            onClick={reportListing}
          >
            Denunciar publicación
          </button>

          {reportMessage ? (
            <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {reportMessage}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
