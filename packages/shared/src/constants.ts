export const CURRENCY = 'ARS' as const;
export const TIMEZONE = 'America/Argentina/Buenos_Aires' as const;
export const LOCALE = 'es-AR' as const;
export const AGE_MIN = 18 as const;

export const DEFAULTS = {
  tasaPercent: 7,
  tasaFixedArs: 500,
  midpointFeeArs: 2200,
  offerMaxDiscountPercent: 30,
  offerTtlHours: 24,
  offerPaymentTtlHours: 24,
  offersPerBuyerPerDay: 25,
  claimWindowHours: 48,
  disputeSlaHours: 72,
  payoutSlaBusinessHours: 72,
  returnShipBusinessDays: 5,
  couponExpiryDays: 90,
  minPhotos: 3,
  maxPhotos: 10,
  maxPhotoMb: 8,
  maxReviewWindowDays: 30,
} as const;

export const CONFIG_KEYS = [
  'tasa_percent',
  'tasa_fixed_ars',
  'midpoint_fee_ars',
  'offer_max_discount_percent',
  'offer_ttl_hours',
  'offer_payment_ttl_hours',
  'offers_per_buyer_per_day',
  'claim_window_hours',
  'dispute_sla_hours',
  'payout_sla_business_hours',
  'return_ship_business_days',
  'coupon_expiry_days',
  'min_photos',
  'max_photos',
  'max_photo_mb',
  'review_window_days',
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export const DEFAULT_CONFIG: Record<ConfigKey, number> = {
  tasa_percent: DEFAULTS.tasaPercent,
  tasa_fixed_ars: DEFAULTS.tasaFixedArs,
  midpoint_fee_ars: DEFAULTS.midpointFeeArs,
  offer_max_discount_percent: DEFAULTS.offerMaxDiscountPercent,
  offer_ttl_hours: DEFAULTS.offerTtlHours,
  offer_payment_ttl_hours: DEFAULTS.offerPaymentTtlHours,
  offers_per_buyer_per_day: DEFAULTS.offersPerBuyerPerDay,
  claim_window_hours: DEFAULTS.claimWindowHours,
  dispute_sla_hours: DEFAULTS.disputeSlaHours,
  payout_sla_business_hours: DEFAULTS.payoutSlaBusinessHours,
  return_ship_business_days: DEFAULTS.returnShipBusinessDays,
  coupon_expiry_days: DEFAULTS.couponExpiryDays,
  min_photos: DEFAULTS.minPhotos,
  max_photos: DEFAULTS.maxPhotos,
  max_photo_mb: DEFAULTS.maxPhotoMb,
  review_window_days: DEFAULTS.maxReviewWindowDays,
};
