'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';

const inputClass =
  'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-teal-600';

function OnboardingForm() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [birthDate, setBirthDate] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiFetch('/auth/complete-onboarding', {
        method: 'POST',
        body: JSON.stringify({ birthDate, acceptTerms }),
      });
      await refresh();
      router.replace('/');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo completar el perfil');
    } finally {
      setLoading(false);
    }
  }

  if (user?.onboardingCompleted) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-5 py-12">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black tracking-tight text-neutral-900">Perfil completo</h1>
          <p className="mt-2 text-sm text-neutral-600">Ya podés usar REVIA.</p>
          <Link className="mt-5 block text-sm font-semibold text-teal-700" href="/">
            Ir al inicio
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-5 py-12">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Completá tu perfil</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Necesitamos tu fecha de nacimiento y la aceptación de términos para continuar.
        </p>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col">
            <span className="text-sm font-medium text-neutral-700">Fecha de nacimiento</span>
            <input
              className={inputClass}
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              required
              autoComplete="bday"
            />
          </label>

          <label className="flex items-start gap-2 text-sm text-neutral-700">
            <input
              className="mt-0.5"
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              required
            />
            <span>Confirmo que soy mayor de 18 años y acepto los términos y la privacidad.</span>
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
            {loading ? 'Guardando…' : 'Guardar y continuar'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function CompleteProfilePage() {
  return (
    <ProtectedRoute>
      <OnboardingForm />
    </ProtectedRoute>
  );
}
