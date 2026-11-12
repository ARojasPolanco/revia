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
  'payment_review',
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

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pendiente de pago',
  payment_review: 'Pago en revisión',
  paid: 'Pagado',
  handover_pending: 'Entrega coordinada',
  delivered: 'Entregado',
  completed: 'Completado',
  payout_pending: 'Payout pendiente',
  paid_out: 'Pago enviado',
  disputed: 'En disputa',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
  expired: 'Vencido',
};

export const ORDER_EVENT_LABELS: Record<string, string> = {
  order_created: 'Compra iniciada',
  payment_created: 'Instrucciones de pago generadas',
  payment_creation_failed: 'No se pudieron generar las instrucciones de pago',
  payment_confirmed: 'Pago confirmado',
  payment_review: 'Pago en revisión',
  payment_expired: 'Pago vencido',
  delivery_code_issued: 'Código de entrega emitido',
  delivery_validated: 'Entrega confirmada por el vendedor',
  buyer_confirmed_receipt: 'Recepción confirmada por el comprador',
  handover_pending: 'Entrega coordinada',
  order_completed: 'Orden completada',
  order_cancelled: 'Orden cancelada',
  dispute_opened: 'Disputa abierta',
  dispute_rejected: 'Disputa rechazada',
  order_refunded: 'Orden reembolsada',
  listing_unavailable: 'Publicación no disponible',
  seller_verified: 'Perfil verificado',
  review_received: 'Reseña recibida',
};

export const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'OVERPAID', 'UNDERPAID', 'EXPIRED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REFUND_STATUSES = ['PENDING', 'SUCCESS', 'FAILED'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const DISPUTE_STATUSES = [
  'open',
  'under_review',
  'resolved_refund',
  'resolved_coupon',
  'resolved_rejected',
  'cancelled',
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_REASONS = ['not_received', 'not_as_described'] as const;
export type DisputeReason = (typeof DISPUTE_REASONS)[number];

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  not_received: 'No recibí el artículo',
  not_as_described: 'El artículo no coincide con la descripción',
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Abierta',
  under_review: 'En revisión',
  resolved_refund: 'Resuelta con reembolso',
  resolved_coupon: 'Resuelta con cupón',
  resolved_rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

export const DISPUTE_RESOLUTIONS = ['refund_money', 'refund_coupon', 'reject'] as const;
export type DisputeResolution = (typeof DISPUTE_RESOLUTIONS)[number];

export const DISPUTE_RESOLUTION_LABELS: Record<DisputeResolution, string> = {
  refund_money: 'Reembolsar dinero',
  refund_coupon: 'Emitir cupón',
  reject: 'Rechazar disputa',
};

export const PAYOUT_STATUSES = ['pending', 'processing', 'paid', 'failed'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  pending: 'Pendiente',
  processing: 'En proceso',
  paid: 'Pagado',
  failed: 'Falló',
};

export const PAYOUT_BLOCK_REASONS = [
  'seller_missing',
  'seller_unavailable',
  'kyc_not_approved',
  'dispute_open',
  'refund_pending',
  'order_refunded',
  'order_cancelled',
  'payout_account_missing',
  'payout_account_pending_review',
  'holder_mismatch',
] as const;
export type PayoutBlockReason = (typeof PAYOUT_BLOCK_REASONS)[number];

export const PAYOUT_BLOCK_REASON_LABELS: Record<PayoutBlockReason, string> = {
  seller_missing: 'No encontramos al vendedor.',
  seller_unavailable: 'La cuenta del vendedor no está disponible.',
  kyc_not_approved: 'La verificación de identidad del vendedor no está aprobada.',
  dispute_open: 'Hay una disputa abierta.',
  refund_pending: 'Hay un reembolso pendiente.',
  order_refunded: 'La orden ya fue reembolsada.',
  order_cancelled: 'La orden fue cancelada.',
  payout_account_missing: 'El vendedor no configuró su cuenta de cobro.',
  payout_account_pending_review: 'La cuenta de cobro está en revisión.',
  holder_mismatch: 'El titular de la cuenta no coincide con la identidad verificada.',
};

export const PAYOUT_EVENT_LABELS: Record<string, string> = {
  payout_created: 'Payout creado',
  payout_blocked: 'Payout bloqueado',
  payout_processing: 'Payout en proceso',
  payout_paid: 'Payout pagado',
  payout_failed: 'Payout fallido',
};

export const COUPON_STATUSES = ['active', 'used', 'expired', 'cancelled'] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

export const COUPON_STATUS_LABELS: Record<CouponStatus, string> = {
  active: 'Disponible',
  used: 'Usado',
  expired: 'Vencido',
  cancelled: 'Cancelado',
};

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
  'payment_review',
  'delivery_code_issued',
  'order_delivered',
  'order_handover_pending',
  'order_cancelled',
  'seller_verified',
  'claim_window_reminder',
  'order_completed',
  'payout_processing',
  'payout_failed',
  'payout_sent',
  'dispute_opened',
  'dispute_updated',
  'dispute_resolved',
  'review_received',
  'kyc_approved',
  'kyc_rejected',
  'kyc_manual_review',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
