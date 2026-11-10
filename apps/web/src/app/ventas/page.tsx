'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { OrderCard } from '@/components/OrderCard';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';
import type { Order } from '@/lib/orders';

function SalesContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ orders: Order[] }>('/me/sales');
      setOrders(data.orders);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudieron cargar tus ventas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-5 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">Mis ventas</h1>
          <p className="text-sm text-neutral-600">Gestioná entregas, códigos y payouts.</p>
        </div>
        <div className="flex gap-2">
          <Link
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
            href="/compras"
          >
            Compras
          </Link>
          <Link
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
            href="/"
          >
            Inicio
          </Link>
        </div>
      </header>

      {loading ? <p className="text-sm text-neutral-500">Cargando ventas.</p> : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && orders.length === 0 ? (
        <p className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Todavía no tenés ventas.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} href={`/ventas/${order.id}`} />
        ))}
      </div>
    </main>
  );
}

export default function SalesPage() {
  return (
    <ProtectedRoute>
      <SalesContent />
    </ProtectedRoute>
  );
}
