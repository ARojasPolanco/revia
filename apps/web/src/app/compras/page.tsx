'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { OrderCard } from '@/components/OrderCard';
import { PageHeader } from '@/components/PageHeader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import type { Order } from '@/lib/orders';

function PurchasesContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ orders: Order[] }>('/me/purchases');
      setOrders(data.orders);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron cargar tus compras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-5 py-12">
      <PageHeader description="Seguí el pago, la entrega y los reclamos." title="Mis compras" />

      {loading ? <p className="text-sm text-neutral-500">Cargando compras.</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && orders.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-sm text-neutral-600">Todavía no tenés compras.</p>
          <Link
            className="mt-2 inline-block text-sm font-semibold text-teal-700"
            href="/publicaciones"
          >
            Explorar publicaciones
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} href={`/compras/${order.id}`} />
        ))}
      </div>
    </main>
  );
}

export default function PurchasesPage() {
  return (
    <ProtectedRoute>
      <PurchasesContent />
    </ProtectedRoute>
  );
}
