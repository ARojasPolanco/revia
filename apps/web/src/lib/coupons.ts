import { COUPON_STATUS_LABELS, type CouponStatus } from '@revia/shared';

export { COUPON_STATUS_LABELS };
export type { CouponStatus };

export interface Coupon {
  id: string;
  code: string;
  amountArs: number;
  status: CouponStatus | string;
  expiresAt: string;
  usedAt: string | null;
  usedOrderId: string | null;
  sourceDisputeId: string | null;
  createdAt: string;
}

export function couponStatusLabel(status: string): string {
  return COUPON_STATUS_LABELS[status as CouponStatus] ?? status;
}
