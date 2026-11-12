'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { ApiError, apiFetch } from '@/lib/api';

type Status = 'loading' | 'success' | 'error' | 'idle';

export default function VerifyEmailPage() {
  const { user, refresh } = useAuth();
  const requested = useRef(false);
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Verificando tu email…');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (requested.current) {
      return;
    }

    requested.current = true;
    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
      setStatus('idle');
      setMessage('Falta el token de verificación.');
      return;
    }

    apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(async () => {
        await refresh();
        setStatus('success');
        setMessage('Email verificado. Ya podés usar tu cuenta.');
      })
      .catch((caught) => {
        setStatus('error');
        setMessage(caught instanceof ApiError ? caught.message : 'No se pudo verificar el email');
      });
  }, [refresh]);

  async function resend() {
    setResending(true);

    try {
      const data = await apiFetch<{ devVerificationToken?: string }>('/auth/resend-verification', {
        method: 'POST',
      });
      setMessage(
        data.devVerificationToken
          ? 'Te enviamos un nuevo link. En desarrollo también podés usar el token nuevo.'
          : 'Te enviamos un nuevo link de verificación.'
      );
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : 'No se pudo reenviar el email');
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-5 py-12">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          Verificación de email
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{message}</p>

        {status === 'success' ? (
          <Link
            className="mt-5 block text-sm font-semibold text-teal-700"
            href={user ? '/configuracion' : '/ingresar'}
          >
            {user ? 'Ir a mi cuenta' : 'Iniciar sesión'}
          </Link>
        ) : null}

        {status === 'error' && user ? (
          <button
            className="mt-5 w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-800 disabled:opacity-60"
            type="button"
            onClick={resend}
            disabled={resending}
          >
            {resending ? 'Reenviando…' : 'Reenviar email de verificación'}
          </button>
        ) : null}

        {status === 'idle' ? (
          <Link className="mt-5 block text-sm font-semibold text-teal-700" href="/ingresar">
            Volver a ingresar
          </Link>
        ) : null}
      </section>
    </main>
  );
}
