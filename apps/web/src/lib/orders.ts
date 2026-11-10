import { ORDER_EVENT_LABELS, ORDER_STATUS_LABELS, type OrderStatus } from '@revia/shared';
import type { PublicSeller } from './listings';

export { ORDER_EVENT_LABELS, ORDER_STATUS_LABELS };
export type { OrderStatus };

export interface OrderPayment {
  id: string;
  status: string;
  amountArs: number;
  currency: string;
  cvu: string | null;
  alias: string | null;
  expiresAt: string | null;
  paidAt: string | null;
}

export interface OrderEvent {
  id: string;
  type: string;
  actor: PublicSeller | null;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface Order {
  id: string;
  role: 'buyer' | 'seller';
  status: OrderStatus | string;
  deliveryMode: string;
  itemPriceArs: number;
  midpointFeeArs: number;
  tasaPercent: number;
  tasaFixedArs: number;
  tasaAmountArs: number;
  totalAmountArs: number;
  sellerPayoutArs: number;
  listing: {
    id: string;
    title: string;
    photoUrl: string | null;
  };
  buyer: PublicSeller | null;
  seller: PublicSeller | null;
  payment: OrderPayment | null;
  deliveryCode: string | null;
  deliveryCodeUsed: boolean;
  claimWindowEndsAt: string | null;
  paidAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  events: OrderEvent[];
  actions: {
    canPay: boolean;
    canConfirmReceipt: boolean;
    canValidateCode: boolean;
    canCancel: boolean;
    canMarkHandover: boolean;
  };
}

export interface OrderQuote {
  listingId: string;
  listingTitle: string;
  listingPhotoUrl: string | null;
  offerId: string | null;
  deliveryMode: string;
  itemPriceArs: number;
  midpointFeeArs: number;
  tasaPercent: number;
  tasaFixedArs: number;
  tasaAmountArs: number;
  totalAmountArs: number;
  sellerPayoutArs: number;
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export function orderEventLabel(type: string): string {
  return ORDER_EVENT_LABELS[type] ?? 'Actualización de la orden';
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value));
}

export function formatRemaining(value: string | null): string {
  if (!value) {
    return '-';
  }

  const diff = new Date(value).getTime() - Date.now();

  if (diff <= 0) {
    return 'Vencido';
  }

  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  return `${minutes} min`;
}
