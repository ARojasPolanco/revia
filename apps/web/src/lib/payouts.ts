import {
  PAYOUT_BLOCK_REASON_LABELS,
  PAYOUT_EVENT_LABELS,
  PAYOUT_STATUS_LABELS,
  type PayoutBlockReason,
  type PayoutStatus,
} from '@revia/shared';
import { API_URL, ApiError } from './api';
import type { PublicSeller } from './listings';

export { PAYOUT_BLOCK_REASON_LABELS, PAYOUT_EVENT_LABELS, PAYOUT_STATUS_LABELS };
export type { PayoutBlockReason, PayoutStatus };

export interface PayoutAccountView {
  method: string;
  accountMasked: string;
  holderName: string;
  holderMatchesKyc: boolean;
  status: string;
}

export interface PayoutEventView {
  id: string;
  type: string;
  actor: PublicSeller | null;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface Payout {
  id: string;
  orderId: string;
  amountArs: number;
  status: PayoutStatus | string;
  blockReason: PayoutBlockReason | null;
  blockReasonLabel: string | null;
  operationId: string | null;
  receiptUrl: string | null;
  receiptAvailable: boolean;
  slaDueAt: string;
  paidAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  order: {
    id: string;
    title: string;
    completedAt: string | null;
  };
  seller: PublicSeller | null;
  account: PayoutAccountView | null;
  events: PayoutEventView[];
}

export interface PayoutSummary {
  pendingCount: number;
  pendingAmountArs: number;
  processingCount: number;
  processingAmountArs: number;
  paidCount: number;
  paidAmountArs: number;
  failedCount: number;
  blockedCount: number;
  overdueCount: number;
  nextDueAt: string | null;
}

export function payoutStatusLabel(status: string): string {
  return PAYOUT_STATUS_LABELS[status as PayoutStatus] ?? status;
}

export function payoutEventLabel(type: string): string {
  return PAYOUT_EVENT_LABELS[type] ?? 'Actualización del payout';
}

export async function downloadPayoutReceipt(payoutId: string): Promise<void> {
  const response = await fetch(`${API_URL}/me/payouts/${payoutId}/receipt`, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(payload.message ?? 'No se pudo descargar el comprobante.', response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `revia-payout-${payoutId}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
