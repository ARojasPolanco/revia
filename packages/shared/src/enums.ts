export const USER_ROLES = ['user', 'moderator', 'support', 'finance', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const LISTING_STATUSES = [
  'draft',
  'pending',
  'active',
  'rejected',
  'paused',
  'sold',
  'deleted',
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_CONDITIONS = [
  'new_with_tags',
  'new_without_tags',
  'very_good',
  'good',
  'fair',
] as const;
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export const LISTING_CONDITION_LABELS: Record<ListingCondition, string> = {
  new_with_tags: 'Nuevo con etiqueta',
  new_without_tags: 'Nuevo sin etiqueta',
  very_good: 'Muy bueno',
  good: 'Bueno',
  fair: 'Satisfactorio',
};

export const DELIVERY_MODES = ['pickup_home', 'midpoint', 'home_delivery'] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  pickup_home: 'Retiro en el domicilio del vendedor',
  midpoint: 'Punto medio en el centro',
  home_delivery: 'Envío coordinado con Uber/Didi',
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente de aprobación',
  active: 'Activa',
  rejected: 'Rechazada',
  paused: 'Pausada',
  sold: 'Vendida',
  deleted: 'Eliminada',
};

export const CATEGORY_ATTRIBUTE_TYPES = ['text', 'number', 'select', 'boolean'] as const;
export type CategoryAttributeType = (typeof CATEGORY_ATTRIBUTE_TYPES)[number];

export const OFFER_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'countered',
  'expired',
  'cancelled',
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'handover_pending',
  'delivered',
  'completed',
  'payout_pending',
  'paid_out',
  'disputed',
  'refunded',
  'cancelled',
  'expired',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DISPUTE_STATUSES = [
  'open',
  'under_review',
  'resolved_refund',
  'resolved_coupon',
  'resolved_rejected',
  'cancelled',
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const PAYOUT_STATUSES = ['pending', 'processing', 'paid', 'failed'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const KYC_STATUSES = [
  'not_started',
  'pending',
  'approved',
  'rejected',
  'manual_review',
  'expired',
] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const PAYOUT_METHODS = ['cbu', 'cvu', 'alias'] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const PAYOUT_ACCOUNT_STATUSES = ['active', 'pending_review'] as const;
export type PayoutAccountStatus = (typeof PAYOUT_ACCOUNT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'listing_approved',
  'listing_rejected',
  'new_message',
  'offer_received',
  'offer_accepted',
  'offer_rejected',
  'offer_countered',
  'offer_expiring',
  'payment_confirmed',
  'payment_expired',
  'delivery_code_issued',
  'order_delivered',
  'claim_window_reminder',
  'order_completed',
  'payout_sent',
  'dispute_opened',
  'dispute_updated',
  'dispute_resolved',
  'review_received',
  'kyc_approved',
  'kyc_rejected',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
