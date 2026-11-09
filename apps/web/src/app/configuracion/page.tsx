'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';

const inputClass =
  'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-teal-600';
const labelClass = 'text-sm font-medium text-neutral-700';

function SettingsContent() {
  const router = useRouter();
  const { user, refresh, logout } = useAuth();
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFullName(user.fullName);
  }, [user]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          bio,
          location,
          ...(avatarUrl ? { avatarUrl } : {}),
        }),
      });
      await refresh();
      setMessage('Perfil actualizado.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo guardar el perfil');
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setResending(true);
    setError(null);

    try {
      const data = await apiFetch<{ devVerificationToken?: string }>('/auth/resend-verification', {
        method: 'POST',
      });
      setVerificationToken(data.devVerificationToken ?? null);
      setMessage('Te enviamos un nuevo link de verificación.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo reenviar la verificación');
    } finally {
      setResending(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-5 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Mi cuenta</h1>
        <button
          className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
          type="button"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Estado de la cuenta</h2>
        <dl className="mt-3 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-400">Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-400">Verificación</dt>
            <dd>{user?.emailVerified ? 'Email verificado' : 'Email sin verificar'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-400">Identidad</dt>
            <dd>{user?.kycStatus === 'approved' ? 'Verificada' : 'Pendiente (Fase 2)'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-400">Rol</dt>
            <dd>{user?.role}</dd>
          </div>
        </dl>

        {!user?.emailVerified ? (
          <div className="mt-4 flex flex-col gap-2">
            <button
              className="w-fit rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 disabled:opacity-60"
              type="button"
              onClick={resendVerification}
              disabled={resending}
            >
              {resending ? 'Reenviando…' : 'Reenviar verificación de email'}
            </button>
            {verificationToken ? (
              <Link
                className="break-all text-xs font-mono text-teal-700 underline"
                href={`/verificar-email?token=${encodeURIComponent(verificationToken)}`}
              >
                Entorno de desarrollo: verificar con este token
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-neutral-900">Perfil público</h2>

        <form className="mt-4 flex flex-col gap-4" onSubmit={handleSave}>
          <label className="flex flex-col">
            <span className={labelClass}>Nombre completo</span>
            <input
              className={inputClass}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              minLength={2}
              maxLength={80}
            />
          </label>

          <label className="flex flex-col">
            <span className={labelClass}>Bio</span>
            <textarea
              className={inputClass}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={500}
              rows={3}
            />
          </label>

          <label className="flex flex-col">
            <span className={labelClass}>Ubicación</span>
            <input
              className={inputClass}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={120}
              placeholder="Bahía Blanca"
            />
          </label>

          <label className="flex flex-col">
            <span className={labelClass}>Foto de perfil (URL)</span>
            <input
              className={inputClass}
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://…"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
              {message}
            </p>
          ) : null}

          <button
            className="w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </section>

      <Link className="text-sm font-semibold text-teal-700" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
