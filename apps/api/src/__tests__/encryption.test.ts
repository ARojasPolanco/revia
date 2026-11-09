import { describe, expect, it } from 'vitest';
import { decryptString, encryptString } from '../utils/encryption.js';

describe('cifrado de datos de payout', () => {
  it('cifra y descifra un CBU', () => {
    const account = '0123456789012345678901';
    const encrypted = encryptString(account);

    expect(encrypted).not.toContain(account);
    expect(decryptString(encrypted)).toBe(account);
  });

  it('falla si el payload fue alterado', () => {
    const encrypted = encryptString('mi.alias.revia');
    const tampered = `${encrypted.slice(0, -4)}AAAA`;

    expect(() => decryptString(tampered)).toThrow();
  });
});
