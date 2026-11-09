'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { ApiError, apiFetch } from '@/lib/api';

interface RegisterResponse {
  status: string;
  message?: string;
  devVerificationToken?: string;
  user?: { id: string; email: string };
}

const inputClass =
  'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-teal-600';
const labelClass = 'text-sm font-medium text-neutral-700';
const buttonClass =
  'w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60';

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    birthDate: '',
    acceptTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<RegisterResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSuccess(data);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-5 py-12">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black tracking-tight text-neutral-900">Revisá tu email</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Te enviamos un link de verificación a <strong>{success.user?.email}</strong>. Vence en
            24 horas.
          </p>
          {success.devVerificationToken ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">Entorno de desarrollo</p>
              <Link
                className="mt-1 block break-all font-mono text-teal-700 underline"
                href={`/verificar-email?token=${encodeURIComponent(success.devVerificationToken)}`}
              >
                Verificar email con este token
              </Link>
            </div>
          ) : null}
          <Link className="mt-5 block text-sm font-semibold text-teal-700" href="/ingresar">
            Ir a ingresar
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-5 py-12">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Crear cuenta</h1>
        <p className="mt-1 text-sm text-neutral-600">Solo para mayores de 18 años.</p>

        <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col">
            <span className={labelClass}>Nombre completo</span>
            <input
              className={inputClass}
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
          </label>

          <label className="flex flex-col">
            <span className={labelClass}>Email</span>
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col">
            <span className={labelClass}>Contraseña</span>
            <input
              className={inputClass}
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>

          <label className="flex flex-col">
            <span className={labelClass}>Fecha de nacimiento</span>
            <input
              className={inputClass}
              type="date"
              value={form.birthDate}
              onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
              required
              autoComplete="bday"
            />
          </label>

          <label className="flex items-start gap-2 text-sm text-neutral-700">
            <input
              className="mt-0.5"
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(event) => setForm({ ...form, acceptTerms: event.target.checked })}
              required
            />
            <span>
              Confirmo que soy mayor de 18 años y acepto los términos y la política de privacidad.
            </span>
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button className={buttonClass} type="submit" disabled={loading}>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-5 text-sm text-neutral-600">
          ¿Ya tenés cuenta?{' '}
          <Link className="font-semibold text-teal-700" href="/ingresar">
            Ingresá
          </Link>
        </p>
      </section>
    </main>
  );
}
