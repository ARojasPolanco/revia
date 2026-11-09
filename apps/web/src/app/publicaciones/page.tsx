'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { ListingCard } from '@/components/ListingCard';
import { ApiError, apiFetch } from '@/lib/api';
import { CONDITION_OPTIONS, type Category, type Listing } from '@/lib/listings';

interface Filters {
  q: string;
  categoryId: string;
  condition: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
}

const emptyFilters: Filters = {
  q: '',
  categoryId: '',
  condition: '',
  minPrice: '',
  maxPrice: '',
  sort: 'recent',
};

const inputClass =
  'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-teal-600';
const labelClass = 'text-xs font-medium uppercase tracking-wide text-neutral-500';

export default function ListingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>('/categories')
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async (filters: Filters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('limit', '24');
      params.set('sort', filters.sort);

      if (filters.q) params.set('q', filters.q);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.condition) params.set('condition', filters.condition);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);

      const data = await apiFetch<{ listings: Listing[] }>(`/listings?${params.toString()}`);
      setListings(data.listings);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudieron cargar las publicaciones'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(applied);
  }, [applied, load]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplied({ ...draft });
  }

  function resetFilters() {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
  }

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
            href="/favoritos"
          >
            Favoritos
          </Link>
          <Link
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
            href="/publicar"
          >
            Publicar
          </Link>
        </div>
      </header>

      <form
        className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={handleSubmit}
      >
        <label className="flex flex-col sm:col-span-2 lg:col-span-1">
          <span className={labelClass}>Buscar</span>
          <input
            className={inputClass}
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            placeholder="Campera, bicicleta, heladera…"
          />
        </label>

        <label className="flex flex-col">
          <span className={labelClass}>Rubro</span>
          <select
            className={inputClass}
            value={draft.categoryId}
            onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
          >
            <option value="">Todos</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col">
          <span className={labelClass}>Estado</span>
          <select
            className={inputClass}
            value={draft.condition}
            onChange={(event) => setDraft({ ...draft, condition: event.target.value })}
          >
            <option value="">Todos</option>
            {CONDITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col">
          <span className={labelClass}>Precio mínimo</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={draft.minPrice}
            onChange={(event) => setDraft({ ...draft, minPrice: event.target.value })}
            placeholder="0"
          />
        </label>

        <label className="flex flex-col">
          <span className={labelClass}>Precio máximo</span>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={draft.maxPrice}
            onChange={(event) => setDraft({ ...draft, maxPrice: event.target.value })}
            placeholder="Sin límite"
          />
        </label>

        <label className="flex flex-col">
          <span className={labelClass}>Orden</span>
          <select
            className={inputClass}
            value={draft.sort}
            onChange={(event) => setDraft({ ...draft, sort: event.target.value })}
          >
            <option value="recent">Más recientes</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
          </select>
        </label>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button
            className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"
            type="submit"
          >
            Buscar
          </button>
          <button
            className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-800"
            type="button"
            onClick={resetFilters}
          >
            Limpiar
          </button>
        </div>
      </form>

      {loading ? <p className="text-sm text-neutral-500">Cargando publicaciones…</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && listings.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          No encontramos publicaciones con esos filtros.
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
