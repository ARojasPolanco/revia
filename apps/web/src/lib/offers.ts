import type { PublicSeller } from './listings';

export interface Offer {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPriceArs: number;
  buyer: PublicSeller | null;
  seller: PublicSeller | null;
  amountArs: number;
  status: string;
  direction: string;
  expiresAt: string;
  paymentExpiresAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

export const OFFER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  countered: 'Contraofertada',
  expired: 'Vencida',
  cancelled: 'Cancelada',
};

export interface OffersResponse {
  sent: Offer[];
  received: Offer[];
}
