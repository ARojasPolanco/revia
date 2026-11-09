'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, type SessionUser } from '@/components/AuthProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { ApiError, apiFetch } from '@/lib/api';

const inputClass =
  'mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-teal-600 disabled:bg-neutral-100';
const labelClass = 'text-sm font-medium text-neutral-700';
const buttonClass =
  'w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60';

interface PayoutView {
  configured: boolean;
  accountMasked?: string;
  holderName?: string;
  holderMatchesKyc?: boolean;
  status?: string;
  updatedAt?: string;
}

const KYC_LABELS: Record<string, string> = {
  not_started: 'Sin iniciar',
  pending: 'Pendiente',
  approved: 'Verificada',
  rejected: 'Rechazada',
  manual_review: 'En revisión',
  expired: 'Vencida',
};

function SettingsContent() {
  const router = useRouter();
  const { user, refresh, logout } = useAuth();
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);

  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutHolder, setPayoutHolder] = useState('');
  const [payoutView, setPayoutView] = useState<PayoutView | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFullName(user.fullName);
    setPayoutHolder(user.fullName);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    apiFetch<{ payoutAccount: PayoutView }>('/me/payout-account')
      .then((data) => setPayoutView(data.payoutAccount))
      .catch(() => setPayoutView(null));
  }, [user]);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Formato no válido. Usá JPG, PNG o WebP.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('La imagen supera el límite de 5 MB.');
      event.target.value = '';
      return;
    }

    setAvatarUploading(true);
    setAvatarError(null);
    setAvatarMessage(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      await apiFetch<{ user: SessionUser }>('/me/avatar', {
        method: 'POST',
        body: formData,
      });
      await refresh();
      setAvatarMessage('Foto de perfil actualizada.');
    } catch (caught) {
      setAvatarError(
        caught instanceof ApiError ? caught.message : 'No se pudo subir la foto de perfil'
      );
    } finally {
      setAvatarUploading(false);
      event.target.value = '';
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, bio, location }),
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

  async function handleSavePayout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPayoutLoading(true);
    setPayoutError(null);
    setPayoutMessage(null);

    try {
      const data = await apiFetch<{ payoutAccount: PayoutView }>('/me/payout-account', {
        method: 'PUT',
        body: JSON.stringify({
          method: 'cbu',
          account: payoutAccount,
          holderName: payoutHolder,
        }),
      });
      setPayoutView(data.payoutAccount);
      setPayoutAccount('');
      setPayoutMessage(
        data.payoutAccount.holderMatchesKyc
          ? 'Datos de cobro guardados.'
          : 'Datos guardados, pero el titular no coincide con tu identidad. Quedó en revisión.'
      );
    } catch (caught) {
      setPayoutError(
        caught instanceof ApiError ? caught.message : 'No se pudieron guardar los datos de cobro'
      );
    } finally {
      setPayoutLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  const kycApproved = user?.kycStatus === 'approved';

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

      <section className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt="Foto de perfil"
            className="h-20 w-20 rounded-full border border-neutral-200 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-xl font-bold text-neutral-500">
            {user?.fullName?.charAt(0).toUpperCase() ?? '?'}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-neutral-900">{user?.fullName}</p>
            {user?.sellerVerified ? <VerifiedBadge /> : null}
          </div>
          <p className="text-sm text-neutral-500">{user?.email}</p>
          <label
            className="mt-1 w-fit cursor-pointer text-sm font-semibold text-teal-700"
            htmlFor="avatar-input"
          >
            {avatarUploading ? 'Subiendo…' : 'Cambiar foto'}
          </label>
          <input
            id="avatar-input"
            className="hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={handleAvatarChange}
            disabled={avatarUploading}
          />
          {avatarError ? <p className="text-xs text-red-600">{avatarError}</p> : null}
          {avatarMessage ? <p className="text-xs text-teal-700">{avatarMessage}</p> : null}
        </div>
      </section>

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
            <dd>
              {KYC_LABELS[user?.kycStatus ?? 'not_started'] ?? 'Sin iniciar'}{' '}
              <Link className="font-semibold text-teal-700" href="/verificacion">
                Gestionar
              </Link>
            </dd>
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
        <h2 className="text-sm font-bold text-neutral-900">Cobros</h2>

        {!kycApproved ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Primero completá tu{' '}
            <Link className="font-semibold underline" href="/verificacion">
              Verificación de REVIA
            </Link>
            . Es obligatoria para cobrar.
          </p>
        ) : null}

        {payoutView?.configured ? (
          <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            <p>
              Cuenta actual: <strong>{payoutView.accountMasked}</strong>
            </p>
            <p>Titular: {payoutView.holderName}</p>
            <p>
              Estado: {payoutView.status === 'active' ? 'Activa' : 'En revisión por titularidad'}
            </p>
          </div>
        ) : null}

        <form className="mt-4 flex flex-col gap-4" onSubmit={handleSavePayout}>
          <label className="flex flex-col">
            <span className={labelClass}>
              CBU o CVU
              <InfoTooltip text="Podés ingresar un CBU bancario o un CVU de billetera virtual (por ejemplo, Mercado Pago). Siempre son 22 dígitos." />
            </span>
            <input
              className={inputClass}
              value={payoutAccount}
              onChange={(event) => setPayoutAccount(event.target.value)}
              placeholder="22 dígitos del CBU o CVU"
              inputMode="numeric"
              maxLength={22}
              required
              disabled={!kycApproved}
            />
          </label>

          <label className="flex flex-col">
            <span className={labelClass}>Titular de la cuenta</span>
            <input
              className={inputClass}
              value={payoutHolder}
              onChange={(event) => setPayoutHolder(event.target.value)}
              required
              minLength={3}
              maxLength={120}
              disabled={!kycApproved}
            />
          </label>

          {payoutError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {payoutError}
            </p>
          ) : null}

          {payoutMessage ? (
            <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
              {payoutMessage}
            </p>
          ) : null}

          <button className={buttonClass} type="submit" disabled={!kycApproved || payoutLoading}>
            {payoutLoading ? 'Guardando…' : 'Guardar datos de cobro'}
          </button>
        </form>
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

          <button className={buttonClass} type="submit" disabled={loading}>
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
