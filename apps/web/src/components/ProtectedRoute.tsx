'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const needsOnboarding =
    !loading && Boolean(user) && !user?.onboardingCompleted && pathname !== '/completar-perfil';

  useEffect(() => {
    if (!loading && !user) {
      const next = `${pathname}${window.location.search}`;
      router.replace(`/ingresar?next=${encodeURIComponent(next)}`);
    }
  }, [loading, user, pathname, router]);

  useEffect(() => {
    if (needsOnboarding) {
      const next = `${pathname}${window.location.search}`;
      router.replace(`/completar-perfil?next=${encodeURIComponent(next)}`);
    }
  }, [needsOnboarding, pathname, router]);

  if (loading || needsOnboarding) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando sesión.</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
