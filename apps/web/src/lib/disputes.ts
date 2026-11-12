import {
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_LABELS,
  type DisputeReason,
  type DisputeStatus,
} from '@revia/shared';
import type { PublicSeller } from './listings';

export { DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS };
export type { DisputeReason, DisputeStatus };

export interface DisputeEvent {
  id: string;
  type: string;
  actor: PublicSeller | null;
  message: string | null;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface DisputeEvidence {
  id: string;
  uploader: PublicSeller | null;
  kind: string;
  url: string | null;
  body: string | null;
  createdAt: string;
}

export interface DisputeRefund {
  id: string;
  refundType: string;
  amountArs: number;
  status: string;
  providerRefundId: string | null;
  createdAt: string;
}

export interface DisputeCoupon {
  id: string;
  code: string;
  amountArs: number;
  status: string;
  expiresAt: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  status: DisputeStatus | string;
  reason: DisputeReason | string;
  reasonLabel: string;
  description: string;
  resolutionNotes: string | null;
  slaDueAt: string;
  resolvedAt: string | null;
  createdAt: string;
  buyer: PublicSeller | null;
  seller: PublicSeller | null;
  resolver: PublicSeller | null;
  order: {
    id: string;
    title: string;
    status: string;
    itemPriceArs: number;
    totalAmountArs: number;
    sellerPayoutArs: number;
    deliveredAt: string | null;
    completedAt: string | null;
    claimWindowEndsAt: string | null;
  };
  events: DisputeEvent[];
  evidence: DisputeEvidence[];
  refund: DisputeRefund | null;
  coupon: DisputeCoupon | null;
}

export function disputeStatusLabel(status: string): string {
  return DISPUTE_STATUS_LABELS[status as DisputeStatus] ?? status;
}

export function disputeEventLabel(type: string): string {
  const labels: Record<string, string> = {
    opened: 'Disputa abierta',
    message: 'Mensaje',
    evidence: 'Evidencia agregada',
    seller_offer: 'Oferta del vendedor',
    resolved_refund: 'Resuelta con reembolso',
    resolved_coupon: 'Resuelta con cupón',
    resolved_rejected: 'Rechazada',
  };

  return labels[type] ?? 'Actualización de la disputa';
}
