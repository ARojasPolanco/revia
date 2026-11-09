import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { sequelize } from '../config/database.js';
import { migrateUp } from '../config/migrator.js';

const baseUser = {
  email: 'kyc-payout@revia.test',
  password: 'password12345',
  fullName: 'Usuario Test',
  birthDate: '1990-01-01',
  acceptTerms: true as const,
};

async function registerVerifyAndLogin() {
  const registration = await request(app).post('/api/v1/auth/register').send(baseUser);

  const token = registration.body.devVerificationToken as string;

  await request(app).post('/api/v1/auth/verify-email').send({ token });

  const agent = request.agent(app);
  const login = await agent
    .post('/api/v1/auth/login')
    .send({ email: baseUser.email, password: baseUser.password });

  return { agent, login };
}

beforeAll(async () => {
  await migrateUp();
});

beforeEach(async () => {
  await sequelize.query(
    'TRUNCATE TABLE payout_accounts, kyc_verifications, password_reset_tokens, email_verification_tokens, auth_identities, users RESTART IDENTITY CASCADE'
  );
});

afterAll(async () => {
  await sequelize.close();
});

describe('KYC y payout', () => {
  it('bloquea el payout sin KYC aprobado', async () => {
    const { agent, login } = await registerVerifyAndLogin();

    expect(login.status).toBe(200);

    const response = await agent.put('/api/v1/me/payout-account').send({
      method: 'cbu',
      account: '0123456789012345678901',
      holderName: baseUser.fullName,
    });

    expect(response.status).toBe(403);
  });

  it('permite aprobar KYC en modo desarrollo y guardar el payout', async () => {
    const { agent } = await registerVerifyAndLogin();

    const session = await agent.post('/api/v1/kyc/session');
    expect(session.status).toBe(200);
    expect(session.body.verification.mode).toBe('mock');

    const approval = await agent.post('/api/v1/kyc/dev/verify').send({ status: 'approved' });
    expect(approval.status).toBe(200);

    const status = await agent.get('/api/v1/kyc/status');
    expect(status.status).toBe(200);
    expect(status.body.verification.status).toBe('approved');

    const payout = await agent.put('/api/v1/me/payout-account').send({
      method: 'cbu',
      account: '0123456789012345678901',
      holderName: baseUser.fullName,
    });

    expect(payout.status).toBe(200);
    expect(payout.body.payoutAccount.configured).toBe(true);
    expect(payout.body.payoutAccount.status).toBe('active');
    expect(payout.body.payoutAccount.accountMasked).toContain('8901');

    const listed = await agent.get('/api/v1/me/payout-account');
    expect(listed.status).toBe(200);
    expect(listed.body.payoutAccount.accountMasked).toContain('8901');
  });

  it('deja en revisión un titular distinto al verificado', async () => {
    const { agent } = await registerVerifyAndLogin();

    await agent.post('/api/v1/kyc/session');
    await agent.post('/api/v1/kyc/dev/verify').send({ status: 'approved' });

    const payout = await agent.put('/api/v1/me/payout-account').send({
      method: 'alias',
      account: 'mi.alias.revia',
      holderName: 'Otra Persona',
    });

    expect(payout.status).toBe(200);
    expect(payout.body.payoutAccount.status).toBe('pending_review');
    expect(payout.body.payoutAccount.holderMatchesKyc).toBe(false);
  });

  it('rechaza un alias inválido', async () => {
    const { agent } = await registerVerifyAndLogin();

    await agent.post('/api/v1/kyc/session');
    await agent.post('/api/v1/kyc/dev/verify').send({ status: 'approved' });

    const payout = await agent.put('/api/v1/me/payout-account').send({
      method: 'alias',
      account: 'ab',
      holderName: baseUser.fullName,
    });

    expect(payout.status).toBe(422);
  });
});
