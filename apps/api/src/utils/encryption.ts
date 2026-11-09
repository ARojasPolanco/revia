import crypto from 'node:crypto';
import { envs, isProduction } from '../config/envs.js';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = envs.PAYOUT_ENCRYPTION_KEY;

  if (raw) {
    const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');

    if (key.length !== 32) {
      throw new Error('PAYOUT_ENCRYPTION_KEY debe tener 32 bytes');
    }

    return key;
  }

  if (isProduction) {
    throw new Error('PAYOUT_ENCRYPTION_KEY es obligatoria en producción');
  }

  return crypto.createHash('sha256').update(envs.JWT_SECRET).digest();
}

export function encryptString(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(
    '.'
  );
}

export function decryptString(payload: string): string {
  const [ivBase64, tagBase64, dataBase64] = payload.split('.');

  if (!ivBase64 || !tagBase64 || !dataBase64) {
    throw new Error('Payload cifrado inválido');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivBase64, 'base64'));

  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataBase64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
