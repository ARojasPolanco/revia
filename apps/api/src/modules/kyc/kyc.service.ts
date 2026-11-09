import { uuidSchema } from '@revia/shared';
import { isProduction } from '../../config/envs.js';
import { AppError } from '../../errors/appError.js';
import { mailService } from '../notifications/email.service.js';
import { User } from '../users/user.model.js';
import {
  createDiditSession,
  isDiditConfigured,
  isMockKycMode,
  type DiditWebhookPayload,
} from './didit.service.js';
import { KycVerification } from './kycVerification.model.js';

const MOCK_SESSION_PREFIX = 'mock-';

export function mapDiditStatus(status: string): string {
  switch (status) {
    case 'Approved':
      return 'approved';
    case 'Declined':
      return 'rejected';
    case 'In Review':
      return 'manual_review';
    case 'Abandoned':
    case 'Expired':
    case 'Kyc Expired':
      return 'expired';
    case 'Not Started':
    case 'In Progress':
    case 'Resubmitted':
    case 'Awaiting User':
    default:
      return 'pending';
  }
}

async function getLatestVerification(userId: string): Promise<KycVerification | null> {
  return KycVerification.findOne({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
}

async function getUserOrFail(userId: string): Promise<User> {
  const user = await User.findByPk(userId);

  if (!user || user.isDeleted) {
    throw new AppError('Iniciá sesión para continuar.', 401);
  }

  return user;
}

export async function startSession(userId: string): Promise<{
  mode: 'redirect' | 'mock';
  status: string;
  url?: string;
  sessionId?: string;
}> {
  const user = await getUserOrFail(userId);
  const existing = await getLatestVerification(userId);

  if (!isDiditConfigured()) {
    if (isProduction) {
      throw new AppError('La verificación no está disponible en este momento', 503);
    }

    if (existing) {
      await existing.update({
        providerSessionId: `${MOCK_SESSION_PREFIX}${userId}`,
        status: 'pending',
        providerStatus: 'Mock',
        reason: null,
        lastEventId: null,
      });
    } else {
      await KycVerification.create({
        userId,
        providerSessionId: `${MOCK_SESSION_PREFIX}${userId}`,
        status: 'pending',
        providerStatus: 'Mock',
      });
    }

    await user.update({ kycStatus: 'pending' });

    return { mode: 'mock', status: 'pending' };
  }

  const session = await createDiditSession({ id: user.id, email: user.email });

  if (existing) {
    await existing.update({
      providerSessionId: session.sessionId,
      status: 'pending',
      providerStatus: session.status,
      reason: null,
      lastEventId: null,
    });
  } else {
    await KycVerification.create({
      userId,
      providerSessionId: session.sessionId,
      status: 'pending',
      providerStatus: session.status,
    });
  }

  await user.update({ kycStatus: 'pending' });

  return {
    mode: 'redirect',
    status: 'pending',
    url: session.url,
    sessionId: session.sessionId,
  };
}

export async function getStatus(userId: string): Promise<{
  status: string;
  providerStatus: string | null;
  reason: string | null;
  updatedAt: Date | null;
  mockMode: boolean;
}> {
  const user = await getUserOrFail(userId);
  const record = await getLatestVerification(userId);

  return {
    status: record?.status ?? user.kycStatus ?? 'not_started',
    providerStatus: record?.providerStatus ?? null,
    reason: record?.reason ?? null,
    updatedAt: record?.updatedAt ?? null,
    mockMode: isMockKycMode(),
  };
}

async function applyStatus(input: {
  userId: string;
  status: string;
  providerStatus?: string | null;
  reason?: string | null;
  providerSessionId?: string | null;
  eventId?: string | null;
}): Promise<KycVerification | null> {
  const user = await User.findByPk(input.userId);

  if (!user || user.isDeleted) {
    return null;
  }

  const recordBySession = input.providerSessionId
    ? await KycVerification.findOne({
        where: { providerSessionId: input.providerSessionId },
      })
    : null;
  const record = recordBySession ?? (await getLatestVerification(input.userId));
  const previousStatus = record?.status ?? user.kycStatus;

  if (input.eventId && record?.lastEventId === input.eventId) {
    return record;
  }

  const values = {
    status: input.status,
    providerStatus: input.providerStatus ?? null,
    reason: input.reason ?? null,
    ...(input.eventId ? { lastEventId: input.eventId } : {}),
    ...(input.providerSessionId ? { providerSessionId: input.providerSessionId } : {}),
  };

  const saved = record
    ? await record.update(values)
    : await KycVerification.create({ userId: input.userId, ...values });

  await user.update({ kycStatus: input.status });

  if (previousStatus !== input.status) {
    if (input.status === 'approved') {
      void mailService.sendKycApprovedEmail({ to: user.email, name: user.fullName });
    } else if (input.status === 'rejected') {
      void mailService.sendKycRejectedEmail({
        to: user.email,
        name: user.fullName,
        reason: input.reason ?? 'No pudimos validar tus datos.',
      });
    } else if (input.status === 'manual_review') {
      void mailService.sendKycManualReviewEmail({ to: user.email, name: user.fullName });
    }
  }

  return saved;
}

export async function handleDiditWebhook(payload: DiditWebhookPayload): Promise<void> {
  if (payload.webhook_type && payload.webhook_type !== 'status.updated') {
    return;
  }

  const parsedUserId = uuidSchema.safeParse(payload.vendor_data);

  if (!parsedUserId.success || !payload.session_id || !payload.status) {
    return;
  }

  const mappedStatus = mapDiditStatus(payload.status);
  const reason =
    payload.status === 'Declined'
      ? 'La verificación no fue aprobada.'
      : payload.status === 'Expired' || payload.status === 'Kyc Expired'
        ? 'La verificación venció.'
        : null;

  await applyStatus({
    userId: parsedUserId.data,
    status: mappedStatus,
    providerStatus: payload.status,
    reason,
    providerSessionId: payload.session_id,
    eventId: payload.event_id ?? null,
  });
}

export async function devSetStatus(
  userId: string,
  status: 'approved' | 'rejected' | 'manual_review'
): Promise<KycVerification | null> {
  if (isProduction) {
    throw new AppError('No disponible', 403);
  }

  return applyStatus({
    userId,
    status,
    providerStatus: 'Mock',
    reason: status === 'rejected' ? 'Rechazo simulado en desarrollo.' : null,
    providerSessionId: `${MOCK_SESSION_PREFIX}${userId}`,
    eventId: `dev-${Date.now()}`,
  });
}
