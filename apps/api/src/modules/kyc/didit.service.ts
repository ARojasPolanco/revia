import crypto from 'node:crypto';
import { envs, isProduction } from '../../config/envs.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../errors/appError.js';

interface DiditSessionResponse {
  session_id?: string;
  url?: string;
  status?: string;
}

export interface DiditWebhookPayload {
  event_id?: string;
  webhook_type?: string;
  session_id?: string;
  status?: string;
  vendor_data?: string | null;
  timestamp?: number;
  created_at?: number;
  [key: string]: unknown;
}

export interface DiditWebhookHeaders {
  signatureV2?: string;
  signatureV2Previous?: string;
  signatureSimple?: string;
  signatureSimplePrevious?: string;
  timestamp?: string;
}

export function isDiditConfigured(): boolean {
  return Boolean(envs.DIDIT_API_KEY && envs.DIDIT_WORKFLOW_ID);
}

export function isMockKycMode(): boolean {
  return !isDiditConfigured() && !isProduction;
}

export async function createDiditSession(user: {
  id: string;
  email: string;
}): Promise<{ sessionId: string; url: string; status: string }> {
  if (!isDiditConfigured()) {
    throw new AppError('La verificación no está disponible en este momento', 503);
  }

  const response = await fetch(`${envs.DIDIT_API_URL}/v3/session/`, {
    method: 'POST',
    headers: {
      'x-api-key': envs.DIDIT_API_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: envs.DIDIT_WORKFLOW_ID,
      vendor_data: user.id,
      callback: envs.DIDIT_CALLBACK_URL ?? `${envs.APP_URL}/verificacion`,
      callback_method: 'both',
      language: 'es',
      contact_details: {
        email: user.email,
        send_notification_emails: false,
        email_lang: 'es',
      },
      metadata: {
        user_id: user.id,
        product: 'revia',
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.error('Proveedor KYC rechazó la creación de la sesión', {
      status: response.status,
      detail: detail.slice(0, 500),
    });
    throw new AppError('No se pudo iniciar la verificación', 502);
  }

  const data = (await response.json()) as DiditSessionResponse;

  if (!data.session_id || !data.url) {
    logger.error('Proveedor KYC devolvió una respuesta inválida');
    throw new AppError('No se pudo iniciar la verificación', 502);
  }

  return {
    sessionId: data.session_id,
    url: data.url,
    status: data.status ?? 'Not Started',
  };
}

function shortenFloats(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(shortenFloats);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        shortenFloats(item),
      ])
    );
  }

  if (typeof value === 'number' && !Number.isInteger(value) && value % 1 === 0) {
    return Math.trunc(value);
  }

  return value;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value !== null && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortKeys((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function canonicalDiditJson(body: unknown): string {
  return JSON.stringify(sortKeys(shortenFloats(body)));
}

function hmac(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function verifyDiditSignature(
  body: DiditWebhookPayload,
  headers: DiditWebhookHeaders,
  secret: string = envs.DIDIT_WEBHOOK_SECRET ?? ''
): boolean {
  if (!secret || !headers.timestamp) {
    return false;
  }

  const timestamp = Number(headers.timestamp);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) {
    return false;
  }

  const v2Candidates = [headers.signatureV2, headers.signatureV2Previous].filter(
    (value): value is string => Boolean(value)
  );

  if (v2Candidates.length > 0) {
    const expected = hmac(secret, canonicalDiditJson(body));

    if (v2Candidates.some((signature) => safeEqual(expected, signature))) {
      return true;
    }
  }

  const simpleCandidates = [headers.signatureSimple, headers.signatureSimplePrevious].filter(
    (value): value is string => Boolean(value)
  );

  if (simpleCandidates.length > 0) {
    const simple = [
      body.timestamp ?? '',
      body.session_id ?? '',
      body.status ?? '',
      body.webhook_type ?? '',
    ].join(':');
    const expected = hmac(secret, simple);

    if (simpleCandidates.some((signature) => safeEqual(expected, signature))) {
      return true;
    }
  }

  return false;
}
