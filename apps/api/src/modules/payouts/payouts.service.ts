import { AppError } from '../../errors/appError.js';
import { decryptString, encryptString } from '../../utils/encryption.js';
import { User } from '../users/user.model.js';
import { PayoutAccount } from './payoutAccount.model.js';

export interface PayoutAccountInput {
  method: 'cbu' | 'cvu' | 'alias';
  account: string;
  holderName: string;
}

export interface PayoutAccountView {
  configured: boolean;
  method?: string;
  accountMasked?: string;
  holderName?: string;
  holderMatchesKyc?: boolean;
  status?: string;
  updatedAt?: Date;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function validatePayoutAccount(method: string, account: string): void {
  const value = account.trim();

  if (method === 'cbu' || method === 'cvu') {
    if (!/^\d{22}$/.test(value)) {
      throw new AppError('El CBU/CVU debe tener 22 dígitos', 422);
    }

    return;
  }

  if (method === 'alias') {
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9.-]{4,18})[A-Za-z0-9]$/.test(value) || value.includes('..')) {
      throw new AppError('El alias no es válido', 422);
    }

    return;
  }

  throw new AppError('Método de cobro inválido', 422);
}

export function maskPayoutAccount(method: string, account: string): string {
  if (method === 'alias') {
    return `${account.slice(0, 2)}•••${account.slice(-2)}`;
  }

  return `•••• •••• •••• ${account.slice(-4)}`;
}

function toView(record: PayoutAccount, account: string): PayoutAccountView {
  return {
    configured: true,
    method: record.method,
    accountMasked: maskPayoutAccount(record.method, account),
    holderName: record.holderName,
    holderMatchesKyc: record.holderMatchesKyc,
    status: record.status,
    updatedAt: record.updatedAt,
  };
}

export async function getPayoutAccount(userId: string): Promise<PayoutAccountView> {
  const record = await PayoutAccount.findOne({ where: { userId } });

  if (!record) {
    return { configured: false };
  }

  const account = decryptString(record.accountEncrypted);

  return toView(record, account);
}

export async function upsertPayoutAccount(
  userId: string,
  input: PayoutAccountInput
): Promise<PayoutAccountView> {
  const user = await User.findByPk(userId);

  if (!user || user.isDeleted) {
    throw new AppError('No autenticado', 401);
  }

  validatePayoutAccount(input.method, input.account);

  const account = input.account.trim();
  const holderName = input.holderName.trim();
  const holderMatchesKyc = normalizeName(user.fullName) === normalizeName(holderName);
  const accountEncrypted = encryptString(account);
  const values = {
    method: input.method,
    accountEncrypted,
    holderName,
    holderMatchesKyc,
    status: holderMatchesKyc ? 'active' : 'pending_review',
  };

  const existing = await PayoutAccount.findOne({ where: { userId } });
  const record = existing
    ? await existing.update(values)
    : await PayoutAccount.create({ userId, ...values });

  return toView(record, account);
}
