'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/ingresar');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando sesión…</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
