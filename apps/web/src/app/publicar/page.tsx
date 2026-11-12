'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ListingFields } from '@/components/ListingFields';
import { ActionLink, PageHeader } from '@/components/PageHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import {
  emptyListingFields,
  type Category,
  type Listing,
  type ListingFieldsValue,
} from '@/lib/listings';

function PublishContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [fields, setFields] = useState<ListingFieldsValue>(emptyListingFields);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>('/categories')
      .then((data) => setCategories(data.categories))
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : 'No se pudieron cargar las categorías'
        )
      );
  }, []);

  const kycApproved = user?.kycStatus === 'approved';

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);

    if (selected.length === 0) {
      return;
    }

    previews.forEach((preview) => URL.revokeObjectURL(preview));

    const next = [...photos, ...selected].slice(0, 10);
    setPhotos(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
    setError(null);
    event.target.value = '';
  }

  function removePhoto(index: number) {
    const next = photos.filter((_, itemIndex) => itemIndex !== index);
    URL.revokeObjectURL(previews[index]);

    setPhotos(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!kycApproved) {
      setError('Primero completá tu Verificación de REVIA.');
      return;
    }

    if (fields.deliveryModes.length === 0) {
      setError('Elegí al menos una modalidad de entrega.');
      return;
    }

    if (photos.length < 3) {
      setError('Subí al menos 3 fotos.');
      return;
    }

    setLoading(true);

    try {
      const attributes = Object.fromEntries(
        Object.entries(fields.attributes).filter(
          ([, value]) => value !== '' && value !== undefined && value !== null
        )
      );

      const created = await apiFetch<{ listing: Listing }>('/listings', {
        method: 'POST',
        body: JSON.stringify({
          title: fields.title,
          description: fields.description,
          categoryId: fields.categoryId,
          condition: fields.condition,
          priceArs: Number(fields.priceArs),
          deliveryModes: fields.deliveryModes,
          allowOffers: fields.allowOffers,
          location: fields.location,
          attributes,
        }),
      });

      setDraftId(created.listing.id);

      const formData = new FormData();
      photos.forEach((photo) => formData.append('photos', photo));

      await apiFetch(`/listings/${created.listing.id}/photos`, {
        method: 'POST',
        body: formData,
      });

      await apiFetch(`/listings/${created.listing.id}/submit`, { method: 'POST' });

      router.push('/mis-publicaciones');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo publicar el artículo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-5 py-12">
      <PageHeader
        actions={
          <ActionLink href="/mis-publicaciones" variant="secondary">
            Mis publicaciones
          </ActionLink>
        }
        description="Solo para vendedores con identidad verificada."
        title="Publicar artículo"
      />

      {!kycApproved ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Primero completá tu{' '}
          <Link className="font-semibold underline" href="/verificacion">
            Verificación de REVIA
          </Link>
          .
        </p>
      ) : null}

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <ListingFields
          categories={categories}
          value={fields}
          onChange={setFields}
          disabled={!kycApproved || loading}
        />

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Fotos</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Mínimo 3 y máximo 10. La primera será la portada.
          </p>

          <label className="mt-3 inline-flex w-fit cursor-pointer rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800">
            Elegir fotos
            <input
              className="hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFiles}
              disabled={!kycApproved || loading || photos.length >= 10}
            />
          </label>

          {previews.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {previews.map((preview, index) => (
                <div className="relative" key={preview}>
                  <img
                    src={preview}
                    alt={`Foto ${index + 1}`}
                    className="h-28 w-full rounded-xl border border-neutral-200 object-cover"
                  />
                  <button
                    className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-neutral-700"
                    type="button"
                    onClick={() => removePhoto(index)}
                    disabled={loading}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-neutral-500">Todavía no cargaste fotos.</p>
          )}

          <p className="mt-3 text-xs text-neutral-500">{photos.length} de 10 fotos cargadas.</p>
        </section>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
            {draftId ? (
              <>
                {' '}
                <Link className="font-semibold underline" href={`/mis-publicaciones/${draftId}`}>
                  Continuar el borrador
                </Link>
              </>
            ) : null}
          </p>
        ) : null}

        <button
          className="w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          type="submit"
          disabled={!kycApproved || loading}
        >
          {loading ? 'Publicando…' : 'Publicar y enviar a revisión'}
        </button>
      </form>
    </main>
  );
}

export default function PublishPage() {
  return (
    <ProtectedRoute>
      <PublishContent />
    </ProtectedRoute>
  );
}
