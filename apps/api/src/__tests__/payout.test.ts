import { describe, expect, it } from 'vitest';
import { AppError } from '../errors/appError.js';
import { maskPayoutAccount, validatePayoutAccount } from '../modules/payouts/payouts.service.js';
import { addBusinessDays } from '../utils/businessDays.js';

describe('payout account', () => {
  it('acepta un CBU de 22 dígitos', () => {
    expect(() => validatePayoutAccount('cbu', '0123456789012345678901')).not.toThrow();
  });

  it('rechaza un CBU corto', () => {
    expect(() => validatePayoutAccount('cbu', '123456')).toThrow(AppError);
  });

  it('acepta un alias válido', () => {
    expect(() => validatePayoutAccount('alias', 'mi.alias.revia')).not.toThrow();
  });

  it('rechaza un alias inválido', () => {
    expect(() => validatePayoutAccount('alias', 'ab')).toThrow(AppError);
  });

  it('enmascara CBU/CVU y alias', () => {
    expect(maskPayoutAccount('cbu', '0123456789012345678901')).toBe('•••• •••• •••• 8901');
    expect(maskPayoutAccount('alias', 'mi.alias.revia')).toBe('mi•••ia');
  });
});

describe('SLA de payout', () => {
  it('suma tres días hábiles desde un viernes', () => {
    const friday = new Date('2026-11-13T15:00:00.000Z');

    expect(addBusinessDays(friday, 3).toISOString()).toBe('2026-11-18T15:00:00.000Z');
  });
});
