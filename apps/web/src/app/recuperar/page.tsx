'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { ApiError, apiFetch } from '@/lib/api';

const inputClass =
  'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-teal-600';
const labelClass = 'text-sm font-medium text-neutral-700';

export default function RecoverPage() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token'));
    setReady(true);
  }, []);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await apiFetch<{ message?: string; devResetToken?: string }>(
        '/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
      setMessage(data.message ?? 'Si el email existe, te enviamos instrucciones.');
      setDevToken(data.devResetToken ?? null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo enviar el email');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await apiFetch<{ message?: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setMessage(data.message ?? 'Contraseña actualizada.');
      setToken(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-5 py-12">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          {token ? 'Nueva contraseña' : 'Recuperar cuenta'}
        </h1>

        {token ? (
          <form className="mt-5 flex flex-col gap-4" onSubmit={resetPassword}>
            <label className="flex flex-col">
              <span className={labelClass}>Contraseña nueva</span>
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>

            <button
              className="w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Actualizando…' : 'Actualizar contraseña'}
            </button>
          </form>
        ) : (
          <form className="mt-5 flex flex-col gap-4" onSubmit={requestReset}>
            <label className="flex flex-col">
              <span className={labelClass}>Email de la cuenta</span>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <button
              className="w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Enviando…' : 'Enviar instrucciones'}
            </button>
          </form>
        )}

        {message ? (
          <p className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
            {message}
          </p>
        ) : null}

        {devToken ? (
          <Link
            className="mt-3 block break-all text-xs font-mono text-teal-700 underline"
            href={`/recuperar?token=${encodeURIComponent(devToken)}`}
          >
            Entorno de desarrollo: usar este token para restablecer
          </Link>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Link className="mt-5 block text-sm font-semibold text-teal-700" href="/ingresar">
          Volver a ingresar
        </Link>
      </section>
    </main>
  );
}
