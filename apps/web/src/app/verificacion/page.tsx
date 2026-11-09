'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ApiError, apiFetch } from '@/lib/api';

interface KycVerificationStatus {
  status: string;
  providerStatus: string | null;
  reason: string | null;
  updatedAt: string | null;
  mockMode: boolean;
}

const LABELS: Record<string, string> = {
  not_started: 'Sin iniciar',
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  manual_review: 'En revisión',
  expired: 'Vencida',
};

const DESCRIPTIONS: Record<string, string> = {
  not_started: 'Verificá tu identidad para publicar y cobrar en REVIA.',
  pending: 'Estamos esperando que completes la verificación o que el proveedor responda.',
  approved: 'Tu identidad está verificada. Ya podés publicar y cobrar.',
  rejected: 'No pudimos validar tu identidad. Podés reintentar o escribir a soporte.',
  manual_review: 'Tu verificación quedó en revisión manual. Te avisamos por email.',
  expired: 'La verificación venció. Podés iniciarla de nuevo.',
};

function VerificationContent() {
  const { user, refresh } = useAuth();
  const [verification, setVerification] = useState<KycVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [mockLoading, setMockLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ verification: KycVerificationStatus }>('/kyc/status');
      setVerification(data.verification);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'No se pudo consultar la verificación'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('status')) {
      void load();
      void refresh();
    }
  }, [load, refresh]);

  async function startVerification() {
    setStarting(true);
    setError(null);

    try {
      const data = await apiFetch<{
        verification: { mode: 'redirect' | 'mock'; url?: string; status: string };
      }>('/kyc/session', { method: 'POST' });

      if (data.verification.mode === 'redirect' && data.verification.url) {
        window.location.href = data.verification.url;
        return;
      }

      await load();
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo iniciar la verificación');
    } finally {
      setStarting(false);
    }
  }

  async function simulate(status: 'approved' | 'rejected' | 'manual_review') {
    setMockLoading(status);
    setError(null);

    try {
      await apiFetch('/kyc/dev/verify', {
        method: 'POST',
        body: JSON.stringify({ status }),
      });
      await load();
      await refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo simular el estado');
    } finally {
      setMockLoading(null);
    }
  }

  const status = verification?.status ?? user?.kycStatus ?? 'not_started';
  const approved = status === 'approved';

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-5">
        <p className="text-sm text-neutral-500">Cargando verificación…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-5 py-12">
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          Verificación de REVIA
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {DESCRIPTIONS[status] ?? DESCRIPTIONS.not_started}
        </p>

        <dl className="mt-4 grid gap-2 text-sm text-neutral-600">
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-400">Estado</dt>
            <dd className="font-semibold text-neutral-900">{LABELS[status] ?? 'Sin iniciar'}</dd>
          </div>
          {verification?.reason ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-400">Motivo</dt>
              <dd>{verification.reason}</dd>
            </div>
          ) : null}
        </dl>

        {!approved ? (
          <button
            className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            type="button"
            onClick={startVerification}
            disabled={starting}
          >
            {starting
              ? 'Iniciando…'
              : status === 'not_started'
                ? 'Iniciar verificación'
                : 'Reintentar verificación'}
          </button>
        ) : (
          <Link
            className="mt-5 block w-full rounded-xl bg-teal-700 px-4 py-2.5 text-center text-sm font-semibold text-white"
            href="/configuracion"
          >
            Ir a mi cuenta
          </Link>
        )}

        {verification?.mockMode && !approved ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">
              Entorno de desarrollo: simular resultado
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['approved', 'rejected', 'manual_review'] as const).map((value) => (
                <button
                  key={value}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 disabled:opacity-60"
                  type="button"
                  onClick={() => simulate(value)}
                  disabled={mockLoading !== null}
                >
                  {mockLoading === value ? 'Simulando…' : LABELS[value]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Link className="mt-5 block text-sm font-semibold text-teal-700" href="/configuracion">
          Volver a mi cuenta
        </Link>
      </section>
    </main>
  );
}

export default function VerificationPage() {
  return (
    <ProtectedRoute>
      <VerificationContent />
    </ProtectedRoute>
  );
}
