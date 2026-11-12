'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ListingFields } from '@/components/ListingFields';
import { useDialog } from '@/components/DialogProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import {
  STATUS_LABELS,
  type Category,
  type Listing,
  type ListingFieldsValue,
} from '@/lib/listings';

function EditListingContent() {
  const { confirm } = useDialog();
  const params = useParams<{ id: string }>();
  const listingId = typeof params.id === 'string' ? params.id : '';
  const [listing, setListing] = useState<Listing | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fields, setFields] = useState<ListingFieldsValue | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!listingId) {
      return;
    }

    try {
      const data = await apiFetch<{ listing: Listing }>(`/me/listings/${listingId}`);
      setListing(data.listing);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No encontramos esa publicación.');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void load();
    apiFetch<{ categories: Category[] }>('/categories')
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, [load]);

  useEffect(() => {
    if (!listing || categories.length === 0 || initialized) {
      return;
    }

    const parent = categories.find((category) =>
      category.children?.some((child) => child.id === listing.category?.id)
    );

    setFields({
      title: listing.title,
      description: listing.description,
      parentCategoryId: parent?.id ?? '',
      categoryId: listing.category?.id ?? '',
      condition: listing.condition,
      priceArs: String(listing.priceArs),
      deliveryModes: listing.deliveryModes,
      location: listing.location,
      allowOffers: listing.allowOffers,
      attributes: listing.attributes as Record<string, string | number | boolean>,
    });
    setInitialized(true);
  }, [listing, categories, initialized]);

  const editable = listing ? ['draft', 'rejected', 'paused'].includes(listing.status) : false;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fields) {
      return;
    }

    setBusy('save');
    setError(null);
    setMessage(null);

    try {
      await apiFetch(`/listings/${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: fields.title,
          description: fields.description,
          categoryId: fields.categoryId,
          condition: fields.condition,
          priceArs: Number(fields.priceArs),
          deliveryModes: fields.deliveryModes,
          allowOffers: fields.allowOffers,
          location: fields.location,
          attributes: fields.attributes,
        }),
      });
      await load();
      setMessage('Publicación actualizada.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo guardar la publicación');
    } finally {
      setBusy(null);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setBusy('photos');
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('photos', file));

      await apiFetch(`/listings/${listingId}/photos`, {
        method: 'POST',
        body: formData,
      });
      await load();
      setMessage('Fotos actualizadas.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron subir las fotos');
    } finally {
      setBusy(null);
      event.target.value = '';
    }
  }

  async function deletePhoto(photoId: string) {
    const confirmed = await confirm({
      title: 'Quitar foto',
      message: 'La foto se quitará de la publicación. Esta acción no se puede deshacer.',
      confirmLabel: 'Quitar foto',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setBusy('photo');
    setError(null);

    try {
      await apiFetch(`/listings/${listingId}/photos/${photoId}`, { method: 'DELETE' });
      await load();
      setMessage('Foto eliminada.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo eliminar la foto');
    } finally {
      setBusy(null);
    }
  }

  async function submitListing() {
    setBusy('submit');
    setError(null);
    setMessage(null);

    try {
      await apiFetch(`/listings/${listingId}/submit`, { method: 'POST' });
      await load();
      setMessage('Publicación enviada a revisión.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar a revisión');
    } finally {
      setBusy(null);
    }
  }

  async function togglePause() {
    if (!listing) {
      return;
    }

    setBusy('pause');
    setError(null);

    try {
      const action = listing.status === 'active' ? 'pause' : 'resume';
      await apiFetch(`/listings/${listingId}/${action}`, { method: 'POST' });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo cambiar el estado');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando publicación…</p>
      </main>
    );
  }

  if (error && !listing) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          No encontramos esa publicación
        </h1>
        <Link className="text-sm font-semibold text-teal-700" href="/mis-publicaciones">
          Volver a mis publicaciones
        </Link>
      </main>
    );
  }

  if (!listing || !fields) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">
            Editar publicación
          </h1>
          <p className="text-sm text-neutral-600">
            Estado: {STATUS_LABELS[listing.status] ?? listing.status}
          </p>
        </div>
        <Link className="text-sm font-semibold text-teal-700" href="/mis-publicaciones">
          Volver
        </Link>
      </header>

      {listing.rejectionReason ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Motivo del rechazo: {listing.rejectionReason}
        </p>
      ) : null}

      {!editable ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {listing.status === 'pending'
            ? 'La publicación está en revisión. No se puede editar hasta que sea moderada.'
            : listing.status === 'active'
              ? 'Pausá la publicación para poder editarla.'
              : 'Esta publicación no se puede editar en su estado actual.'}
          {listing.status === 'active' ? (
            <button
              className="ml-2 font-semibold underline"
              type="button"
              onClick={togglePause}
              disabled={busy !== null}
            >
              Pausar
            </button>
          ) : null}
        </p>
      ) : null}

      <form className="flex flex-col gap-6" onSubmit={handleSave}>
        <ListingFields
          categories={categories}
          value={fields}
          onChange={setFields}
          disabled={!editable || busy !== null}
        />

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Fotos</h2>
          <p className="mt-1 text-xs text-neutral-500">Mínimo 3 y máximo 10.</p>

          {listing.photos.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {listing.photos.map((photo) => (
                <div className="relative" key={photo.id}>
                  <img
                    src={photo.thumbnailUrl}
                    alt="Foto de la publicación"
                    className="h-28 w-full rounded-xl border border-neutral-200 object-cover"
                  />
                  {editable ? (
                    <button
                      className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-neutral-700"
                      type="button"
                      onClick={() => deletePhoto(photo.id)}
                      disabled={busy !== null}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Todavía no hay fotos.</p>
          )}

          {editable ? (
            <label className="mt-4 inline-flex w-fit cursor-pointer rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800">
              {busy === 'photos' ? 'Subiendo…' : 'Agregar fotos'}
              <input
                className="hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleUpload}
                disabled={busy !== null || listing.photos.length >= 10}
              />
            </label>
          ) : null}
        </section>

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

        {editable ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="flex-1 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              type="submit"
              disabled={busy !== null}
            >
              {busy === 'save' ? 'Guardando…' : 'Guardar cambios'}
            </button>

            {['draft', 'rejected'].includes(listing.status) ? (
              <button
                className="flex-1 rounded-xl border border-teal-700 px-4 py-3 text-sm font-semibold text-teal-700 disabled:opacity-60"
                type="button"
                onClick={submitListing}
                disabled={busy !== null}
              >
                {busy === 'submit' ? 'Enviando…' : 'Enviar a revisión'}
              </button>
            ) : null}

            {listing.status === 'paused' ? (
              <button
                className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-800 disabled:opacity-60"
                type="button"
                onClick={togglePause}
                disabled={busy !== null}
              >
                Reanudar
              </button>
            ) : null}
          </div>
        ) : null}
      </form>
    </main>
  );
}

export default function EditListingPage() {
  return (
    <ProtectedRoute>
      <EditListingContent />
    </ProtectedRoute>
  );
}
