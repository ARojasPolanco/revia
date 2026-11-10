import { envs } from './envs.js';

export type TaloPaymentStatus = 'PENDING' | 'SUCCESS' | 'OVERPAID' | 'UNDERPAID' | 'EXPIRED';

export type TaloRefundStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface TaloQuote {
  currency: string;
  network: string;
  amount: string;
  address: string;
  alias?: string;
}

export interface TaloRefund {
  refund_id: string;
  refund_type: 'FULL' | 'PARTIAL';
  refund_status: TaloRefundStatus;
  amount: string;
  currency: string;
  creation_timestamp: string;
}

export interface TaloPayment {
  id: string;
  user_id: string;
  external_id?: string;
  payment_status: TaloPaymentStatus;
  price: {
    amount: number;
    currency: string;
  };
  quotes?: TaloQuote[];
  payment_url?: string;
  expiration_timestamp?: string;
  transaction_fields?: Record<string, unknown>;
  refunds?: TaloRefund[];
}

export interface TaloClientData {
  firstName?: string;
  lastName?: string;
  email?: string;
  dni?: string;
}

export interface CreateTaloPaymentInput {
  amountArs: number;
  externalId: string;
  motive: string;
  redirectUrl?: string;
  webhookUrl?: string;
  clientData?: TaloClientData;
}

export type CreateTaloRefundInput = { type: 'FULL' } | { type: 'PARTIAL'; amountArs: number };

interface TaloEnvelope<T> {
  message?: string;
  error?: boolean;
  code?: number;
  data?: T;
}

interface TaloCredentials {
  userId: string;
  clientId: string;
  clientSecret: string;
}

export class TaloApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly httpStatus: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'TaloApiError';
  }
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export function taloBaseUrl(): string {
  return envs.TALO_API_URL.replace(/\/+$/, '');
}

export function hasTaloUser(): boolean {
  return Boolean(envs.TALO_USER_ID);
}

export function hasTaloCredentials(): boolean {
  return Boolean(envs.TALO_USER_ID && envs.TALO_CLIENT_ID && envs.TALO_CLIENT_SECRET);
}

function assertTaloUser(): string {
  if (!envs.TALO_USER_ID) {
    throw new Error('TALO_USER_ID no está configurado');
  }
  return envs.TALO_USER_ID;
}

function assertTaloCredentials(): TaloCredentials {
  const missing = [
    ['TALO_USER_ID', envs.TALO_USER_ID],
    ['TALO_CLIENT_ID', envs.TALO_CLIENT_ID],
    ['TALO_CLIENT_SECRET', envs.TALO_CLIENT_SECRET],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Faltan credenciales de Talo: ${missing.join(', ')}`);
  }

  return {
    userId: envs.TALO_USER_ID as string,
    clientId: envs.TALO_CLIENT_ID as string,
    clientSecret: envs.TALO_CLIENT_SECRET as string,
  };
}

function tokenExpiry(token: string): number {
  const payload = token.split('.')[1];

  if (payload) {
    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        exp?: number;
      };
      if (typeof parsed.exp === 'number') {
        return parsed.exp * 1000;
      }
    } catch {
      return Date.now() + 50 * 60 * 1000;
    }
  }

  return Date.now() + 50 * 60 * 1000;
}

export async function getTaloToken(force = false): Promise<string> {
  if (!force && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const { userId, clientId, clientSecret } = assertTaloCredentials();
  const data = await request<{ token: string }>(`/users/${encodeURIComponent(userId)}/tokens`, {
    method: 'POST',
    body: { client_id: clientId, client_secret: clientSecret },
  });

  cachedToken = {
    token: data.token,
    expiresAt: tokenExpiry(data.token),
  };

  return data.token;
}

async function request<T>(
  path: string,
  options: { method: 'GET' | 'POST'; body?: unknown; auth?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.auth) {
    headers.Authorization = `Bearer ${await getTaloToken()}`;
  }

  const response = await fetch(`${taloBaseUrl()}${path}`, {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(15_000),
  });

  const text = await response.text();
  let payload: TaloEnvelope<T> | null = null;

  try {
    payload = text ? (JSON.parse(text) as TaloEnvelope<T>) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.error) {
    throw new TaloApiError(
      payload?.message ?? 'talo.request.failed',
      payload?.code ?? response.status,
      response.status,
      payload
    );
  }

  if (!payload || payload.data === undefined) {
    throw new TaloApiError('talo.invalid_response', response.status, response.status);
  }

  return payload.data;
}

async function authorizedRequest<T>(
  path: string,
  options: { method: 'GET' | 'POST'; body?: unknown }
): Promise<T> {
  try {
    return await request<T>(path, { ...options, auth: true });
  } catch (error) {
    if (error instanceof TaloApiError && error.httpStatus === 401) {
      cachedToken = null;
      return request<T>(path, { ...options, auth: true });
    }
    throw error;
  }
}

export function buildTaloWebhookUrl(): string | null {
  const url = new URL('/api/v1/webhooks/talo', envs.API_URL);

  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname)) {
    return null;
  }

  if (envs.TALO_WEBHOOK_SECRET) {
    url.searchParams.set('token', envs.TALO_WEBHOOK_SECRET);
  }

  return url.toString();
}

export async function createTaloPayment(input: CreateTaloPaymentInput): Promise<TaloPayment> {
  const userId = assertTaloUser();

  if (!Number.isInteger(input.amountArs) || input.amountArs <= 0) {
    throw new Error('El monto debe ser un entero positivo en ARS');
  }

  const body: Record<string, unknown> = {
    user_id: userId,
    price: { amount: input.amountArs, currency: 'ARS' },
    payment_options: ['transfer'],
    external_id: input.externalId,
    motive: input.motive,
  };

  if (input.webhookUrl) {
    body.webhook_url = input.webhookUrl;
  }

  if (input.redirectUrl) {
    body.redirect_url = input.redirectUrl;
  }

  if (input.clientData) {
    const clientData: Record<string, string> = {};

    if (input.clientData.firstName) {
      clientData.first_name = input.clientData.firstName;
    }
    if (input.clientData.lastName) {
      clientData.last_name = input.clientData.lastName;
    }
    if (input.clientData.email) {
      clientData.email = input.clientData.email;
    }
    if (input.clientData.dni) {
      clientData.dni = input.clientData.dni;
    }

    if (Object.keys(clientData).length > 0) {
      body.client_data = clientData;
    }
  }

  return request<TaloPayment>('/payments/', { method: 'POST', body });
}

export async function getTaloPayment(paymentId: string): Promise<TaloPayment> {
  return authorizedRequest<TaloPayment>(`/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
  });
}

export async function createTaloRefund(
  paymentId: string,
  input: CreateTaloRefundInput
): Promise<TaloPayment> {
  let body: Record<string, unknown>;

  if (input.type === 'FULL') {
    body = { refund_type: 'FULL' };
  } else {
    if (!Number.isInteger(input.amountArs) || input.amountArs <= 0) {
      throw new Error('El monto del reembolso debe ser un entero positivo en ARS');
    }
    body = {
      refund_type: 'PARTIAL',
      amount: String(input.amountArs),
      currency: 'ARS',
    };
  }

  return authorizedRequest<TaloPayment>(`/payments/${encodeURIComponent(paymentId)}/refunds`, {
    method: 'POST',
    body,
  });
}

export async function simulateTaloTransfer(cvu: string, amountArs: number): Promise<void> {
  if (!taloBaseUrl().includes('sandbox')) {
    throw new Error('El simulador de transferencias solo está disponible en sandbox');
  }

  if (!Number.isInteger(amountArs) || amountArs <= 0) {
    throw new Error('El monto debe ser un entero positivo en ARS');
  }

  await authorizedRequest<unknown>(`/cvu/${encodeURIComponent(cvu)}/faucet`, {
    method: 'POST',
    body: { amount: amountArs },
  });
}
