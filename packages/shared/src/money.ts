import { DEFAULTS } from './constants.js';

export interface OrderTotalsInput {
  itemPriceArs: number;
  midpointFeeArs?: number;
  tasaPercent?: number;
  tasaFixedArs?: number;
}

export interface OrderTotals {
  itemPriceArs: number;
  midpointFeeArs: number;
  tasaAmountArs: number;
  totalAmountArs: number;
  sellerPayoutArs: number;
}

export function calculateTasaArs(
  itemPriceArs: number,
  tasaPercent: number = DEFAULTS.tasaPercent,
  tasaFixedArs: number = DEFAULTS.tasaFixedArs
): number {
  return Math.round((itemPriceArs * tasaPercent) / 100) + tasaFixedArs;
}

export function buildOrderTotals({
  itemPriceArs,
  midpointFeeArs = 0,
  tasaPercent = DEFAULTS.tasaPercent,
  tasaFixedArs = DEFAULTS.tasaFixedArs,
}: OrderTotalsInput): OrderTotals {
  const tasaAmountArs = calculateTasaArs(itemPriceArs, tasaPercent, tasaFixedArs);

  return {
    itemPriceArs,
    midpointFeeArs,
    tasaAmountArs,
    totalAmountArs: itemPriceArs + midpointFeeArs + tasaAmountArs,
    sellerPayoutArs: itemPriceArs + midpointFeeArs,
  };
}
