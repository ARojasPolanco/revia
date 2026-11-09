'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, type SessionUser } from '@/components/AuthProvider';
import { ApiError, apiFetch } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const GOOGLE_ERRORS: Record<string, string> = {
  google_no_config: 'Google todavía no está configurado en este entorno.',
  google_denied: 'Cancelaste el ingreso con Google.',
  google_state: 'La sesión de Google venció. Intentá de nuevo.',
  google_failed: 'No se pudo completar el ingreso con Google.',
};

const inputClass =
  'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-teal-600';
const labelClass = 'text-sm font-medium text-neutral-700';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error');

    if (code) {
      setError(GOOGLE_ERRORS[code] ?? 'No se pudo iniciar sesión.');
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ user: SessionUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      await refresh();
      router.replace(data.user.onboardingCompleted ? '/' : '/completar-perfil');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-5 py-12">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Ingresar a REVIA</h1>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col">
            <span className={labelClass}>Email</span>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col">
            <span className={labelClass}>Contraseña</span>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          o
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <a
          className="block w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-center text-sm font-semibold text-neutral-800"
          href={`${API_URL}/auth/google`}
        >
          Continuar con Google
        </a>

        <div className="mt-5 flex flex-col gap-2 text-sm text-neutral-600">
          <Link className="font-semibold text-teal-700" href="/recuperar">
            Olvidé mi contraseña
          </Link>
          <Link className="font-semibold text-teal-700" href="/registro">
            Crear una cuenta
          </Link>
        </div>
      </section>
    </main>
  );
}
