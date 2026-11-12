'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { HomeFeed } from '@/components/HomeFeed';

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function isStaffRole(role: string): boolean {
  return ['admin', 'moderator', 'support', 'finance'].includes(role);
}

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-5 py-12">
        <p className="text-sm font-semibold text-neutral-500">Cargando tu inicio...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:py-10">
        <section className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Bahía Blanca</p>
          <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-neutral-900 sm:text-4xl">
            Comprá y vendé usado cerca de casa.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            Artículos de segunda mano entre particulares, con pago protegido y vendedores
            verificados.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-neutral-500">
            <span>Pago protegido</span>
            <span>Vendedores verificados</span>
            <span>Reclamo en 48 h</span>
          </div>
        </section>

        <HomeFeed />
      </main>
    );
  }

  const staff = isStaffRole(user.role);
  const seller = !staff && (user.sellerVerified || user.kycStatus === 'approved');

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:py-10">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
            Hola, {firstName(user.fullName)}
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-neutral-900 sm:text-4xl">
            {staff
              ? 'Panel de operación de REVIA.'
              : seller
                ? 'Tus ventas y publicaciones, en un solo lugar.'
                : 'Explorá lo que hay cerca.'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            {staff
              ? 'Atajos a moderación, finanzas y soporte desde tu cuenta.'
              : seller
                ? 'Gestioná tus artículos, ofertas, ventas y cobros desde tu cuenta.'
                : 'Encontrá artículos de segunda mano y seguí tus compras y ofertas.'}
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          {staff ? 'Equipo REVIA' : seller ? 'Vendedor verificado' : 'Comprador'}
        </span>
      </section>

      {!user.onboardingCompleted || !user.emailVerified ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {!user.onboardingCompleted ? (
            <Link
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition-colors hover:bg-amber-100"
              href="/completar-perfil"
            >
              <h2 className="text-sm font-bold text-amber-950">Completá tu perfil</h2>
              <p className="mt-1 text-sm leading-relaxed text-amber-800">
                Necesitamos tu fecha de nacimiento y la aceptación de términos para operar.
              </p>
            </Link>
          ) : null}
          {!user.emailVerified ? (
            <Link
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition-colors hover:bg-amber-100"
              href="/configuracion"
            >
              <h2 className="text-sm font-bold text-amber-950">Verificá tu email</h2>
              <p className="mt-1 text-sm leading-relaxed text-amber-800">
                Es necesario para comprar, ofertar, chatear y reseñar.
              </p>
            </Link>
          ) : null}
        </section>
      ) : null}

      <HomeFeed />
    </main>
  );
}
