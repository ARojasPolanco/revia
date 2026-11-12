'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { AdminTabs, PageHeader } from '@/components/PageHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import { formatArs } from '@/lib/listings';
import { formatDateTime } from '@/lib/orders';
import type { PlatformEarnings } from '@/lib/payouts';

function EarningsContent() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<PlatformEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const allowed = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }

    apiFetch<{ earnings: PlatformEarnings }>('/admin/payouts/earnings')
      .then((data) => setEarnings(data.earnings))
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : 'No se pudieron cargar las ganancias.'
        )
      )
      .finally(() => setLoading(false));
  }, [allowed]);

  if (!allowed) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-5 py-12">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Sin permisos</h1>
        <p className="text-sm text-neutral-600">
          Esta sección es solo para finanzas y administración de REVIA.
        </p>
        <Link className="text-sm font-semibold text-teal-700" href="/">
          Volver al inicio
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-12">
      <PageHeader
        description="Tasas de REVIA reconocidas sobre ventas completadas."
        title="Ganancias"
      />
      <AdminTabs current="/admin/ganancias" role={user?.role} />

      {loading ? <p className="text-sm text-neutral-500">Cargando ganancias.</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && earnings ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                Total histórico
              </p>
              <p className="mt-2 text-2xl font-black text-teal-950">
                {formatArs(earnings.totalTasaArs)}
              </p>
              <p className="mt-1 text-xs text-teal-800">{earnings.totalOrders} órdenes</p>
            </article>

            <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Este mes
              </p>
              <p className="mt-2 text-2xl font-black text-neutral-900">
                {formatArs(earnings.monthTasaArs)}
              </p>
              <p className="mt-1 text-xs text-neutral-500">{earnings.monthOrders} órdenes</p>
            </article>

            <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Órdenes completadas
              </p>
              <p className="mt-2 text-2xl font-black text-neutral-900">{earnings.totalOrders}</p>
              <p className="mt-1 text-xs text-neutral-500">Histórico</p>
            </article>

            <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Tasa promedio
              </p>
              <p className="mt-2 text-2xl font-black text-neutral-900">
                {formatArs(earnings.averageTasaArs)}
              </p>
              <p className="mt-1 text-xs text-neutral-500">Por orden completada</p>
            </article>
          </section>

          <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Últimas comisiones</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Se reconoce la Tasa cuando la orden queda completada.
              </p>
            </div>

            {earnings.lastOrders.length === 0 ? (
              <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                Todavía no hay ganancias registradas.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100">
                {earnings.lastOrders.map((order) => (
                  <li
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    key={order.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {order.title}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDateTime(order.completedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-6 text-right">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-neutral-400">
                          Artículo
                        </p>
                        <p className="text-sm text-neutral-600">{formatArs(order.itemPriceArs)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-neutral-400">Tasa</p>
                        <p className="text-sm font-bold text-teal-800">
                          {formatArs(order.tasaAmountArs)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            No se incluyen órdenes reembolsadas, canceladas o todavía en disputa.
          </p>
        </>
      ) : null}
    </main>
  );
}

export default function EarningsPage() {
  return (
    <ProtectedRoute>
      <EarningsContent />
    </ProtectedRoute>
  );
}
