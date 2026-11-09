import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  canonicalDiditJson,
  verifyDiditSignature,
  type DiditWebhookPayload,
} from '../modules/kyc/didit.service.js';

const secret = 'didit-test-secret';
const now = Math.floor(Date.now() / 1000);

function sign(body: DiditWebhookPayload): string {
  return crypto.createHmac('sha256', secret).update(canonicalDiditJson(body), 'utf8').digest('hex');
}

describe('firma de webhook KYC', () => {
  it('canonicaliza las claves en orden', () => {
    expect(canonicalDiditJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it('acepta una firma V2 válida', () => {
    const body: DiditWebhookPayload = {
      event_id: 'event-1',
      webhook_type: 'status.updated',
      session_id: 'session-1',
      status: 'Approved',
      vendor_data: '00000000-0000-0000-0000-000000000001',
      timestamp: now,
    };

    const valid = verifyDiditSignature(
      body,
      { signatureV2: sign(body), timestamp: String(now) },
      secret
    );

    expect(valid).toBe(true);
  });

  it('rechaza una firma inválida', () => {
    const body: DiditWebhookPayload = {
      session_id: 'session-1',
      status: 'Approved',
      webhook_type: 'status.updated',
      timestamp: now,
    };

    const valid = verifyDiditSignature(
      body,
      { signatureV2: 'firma-invalida', timestamp: String(now) },
      secret
    );

    expect(valid).toBe(false);
  });

  it('rechaza un timestamp viejo', () => {
    const body: DiditWebhookPayload = {
      session_id: 'session-1',
      status: 'Approved',
      webhook_type: 'status.updated',
      timestamp: now - 1_000,
    };

    const valid = verifyDiditSignature(
      body,
      { signatureV2: sign(body), timestamp: String(now - 1_000) },
      secret
    );

    expect(valid).toBe(false);
  });
});
