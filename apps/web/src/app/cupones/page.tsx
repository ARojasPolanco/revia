'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { couponStatusLabel, type Coupon } from '@/lib/coupons';
import { formatArs } from '@/lib/listings';
import { formatDateTime } from '@/lib/orders';

function CouponsContent() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ coupons: Coupon[] }>('/me/coupons')
      .then((data) => setCoupons(data.coupons))
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : 'No se pudieron cargar los cupones.')
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-5 py-12">
      <PageHeader
        description="Los cupones cubren el valor del artículo y no se combinan con ofertas."
        title="Mis cupones"
      />

      {loading ? <p className="text-sm text-neutral-500">Cargando cupones.</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && coupons.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Todavía no tenés cupones.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {coupons.map((coupon) => (
          <article
            className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
            key={coupon.id}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-lg font-black tracking-wide text-neutral-900">
                {coupon.code}
              </p>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
                {couponStatusLabel(coupon.status)}
              </span>
            </div>
            <p className="text-2xl font-black text-teal-700">{formatArs(coupon.amountArs)}</p>
            <p className="text-xs text-neutral-500">Vence: {formatDateTime(coupon.expiresAt)}</p>
            {coupon.status === 'active' ? (
              <Link className="text-xs font-semibold text-teal-700" href="/publicaciones">
                Usar en una compra
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </main>
  );
}

export default function CouponsPage() {
  return (
    <ProtectedRoute>
      <CouponsContent />
    </ProtectedRoute>
  );
}
