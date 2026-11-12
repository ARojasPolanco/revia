'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bike,
  Car,
  ChevronRight,
  Gem,
  LayoutGrid,
  Puzzle,
  Shirt,
  Smartphone,
  Sofa,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { Category } from '@/lib/listings';

const categoryIcons: Record<string, LucideIcon> = {
  moda: Shirt,
  electronica: Smartphone,
  muebles: Sofa,
  herramientas: Wrench,
  'autos-motos': Car,
  deportes: Bike,
  infantil: Puzzle,
  coleccionables: Gem,
};

const shortNames: Record<string, string> = {
  moda: 'Moda',
  electronica: 'Electrónica',
  muebles: 'Muebles',
  herramientas: 'Herramientas',
  'autos-motos': 'Autos y motos',
  deportes: 'Deportes',
  infantil: 'Infantil',
  coleccionables: 'Coleccionables',
};

function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = categoryIcons[slug] ?? LayoutGrid;

  return <Icon aria-hidden="true" className={className} strokeWidth={1.75} />;
}

export function SiteCategories() {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>('/categories')
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setActiveId(null);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveId(null);
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activeCategory = categories.find((category) => category.id === activeId) ?? null;

  return (
    <div className="border-t border-neutral-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {loading ? (
          <div className="hidden h-11 items-center gap-2 lg:flex">
            {Array.from({ length: 8 }).map((_, index) => (
              <div className="h-4 w-20 animate-pulse rounded bg-neutral-100" key={index} />
            ))}
          </div>
        ) : null}

        {!loading && categories.length > 0 ? (
          <nav aria-label="Categorías" className="hidden lg:block">
            <div className="relative" onMouseLeave={() => setActiveId(null)}>
              <ul className="flex items-center gap-1">
                {categories.map((category) => {
                  const active = category.id === activeId;

                  return (
                    <li key={category.id}>
                      <Link
                        aria-expanded={active}
                        className={`inline-flex h-11 items-center border-b-2 px-3 text-sm font-semibold transition-colors ${
                          active
                            ? 'border-teal-700 text-teal-800'
                            : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
                        }`}
                        href={`/publicaciones?categoryId=${category.id}`}
                        onFocus={() => setActiveId(category.id)}
                        onMouseEnter={() => setActiveId(category.id)}
                      >
                        {shortNames[category.slug] ?? category.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {activeCategory ? (
                <div className="absolute left-0 right-0 top-full z-50 border border-t-0 border-neutral-200 bg-white shadow-2xl">
                  <div className="grid grid-cols-[260px_1fr]">
                    <div className="border-r border-neutral-100 p-4">
                      <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                        Categorías
                      </p>
                      <div className="flex flex-col gap-0.5">
                        {categories.map((category) => {
                          const active = category.id === activeCategory.id;

                          return (
                            <Link
                              className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                                active
                                  ? 'bg-teal-50 text-teal-900'
                                  : 'text-neutral-700 hover:bg-neutral-50'
                              }`}
                              href={`/publicaciones?categoryId=${category.id}`}
                              key={category.id}
                              onFocus={() => setActiveId(category.id)}
                              onMouseEnter={() => setActiveId(category.id)}
                            >
                              <CategoryIcon className="h-4 w-4 shrink-0" slug={category.slug} />
                              <span className="min-w-0 flex-1 truncate">
                                {shortNames[category.slug] ?? category.name}
                              </span>
                              {active ? (
                                <ChevronRight className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                        <div>
                          <p className="text-sm font-bold text-neutral-900">
                            {activeCategory.name}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {activeCategory.children?.length ?? 0} subcategorías
                          </p>
                        </div>
                        <Link
                          className="shrink-0 text-xs font-semibold text-teal-700 hover:text-teal-800"
                          href={`/publicaciones?categoryId=${activeCategory.id}`}
                        >
                          Ver todo
                        </Link>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 xl:grid-cols-3">
                        {(activeCategory.children ?? []).map((child) => (
                          <Link
                            className="rounded-lg px-2 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                            href={`/publicaciones?categoryId=${child.id}`}
                            key={child.id}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </nav>
        ) : null}

        {!loading && categories.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto py-2 lg:hidden">
            <Link
              className="shrink-0 rounded-full border border-teal-600 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900"
              href="/publicaciones"
            >
              Todo
            </Link>
            {categories.map((category) => (
              <Link
                className="shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                href={`/publicaciones?categoryId=${category.id}`}
                key={category.id}
              >
                {shortNames[category.slug] ?? category.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
