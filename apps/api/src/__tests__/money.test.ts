import { buildOrderTotals, calculateTasaArs } from '@revia/shared';
import { describe, expect, it } from 'vitest';

describe('Tasa de REVIA', () => {
  it('calcula 7% + 500 sobre 20.000', () => {
    expect(calculateTasaArs(20_000)).toBe(1_900);
  });

  it('redondea al entero más cercano', () => {
    expect(calculateTasaArs(1_001)).toBe(570);
  });

  it('construye totales con punto medio', () => {
    const totals = buildOrderTotals({
      itemPriceArs: 20_000,
      midpointFeeArs: 2_200,
    });

    expect(totals.tasaAmountArs).toBe(1_900);
    expect(totals.totalAmountArs).toBe(24_100);
    expect(totals.sellerPayoutArs).toBe(22_200);
  });

  it('no cobra tasa sobre la tarifa logística', () => {
    const sinPuntoMedio = buildOrderTotals({ itemPriceArs: 10_000 });
    const conPuntoMedio = buildOrderTotals({
      itemPriceArs: 10_000,
      midpointFeeArs: 2_200,
    });

    expect(conPuntoMedio.tasaAmountArs).toBe(sinPuntoMedio.tasaAmountArs);
  });
});
