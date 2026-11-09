import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { sequelize } from '../config/database.js';
import { migrateUp } from '../config/migrator.js';
import { User } from '../modules/users/user.model.js';

const baseUser = {
  email: 'test@revia.test',
  password: 'password12345',
  fullName: 'Usuario Test',
  birthDate: '1990-01-01',
  acceptTerms: true as const,
};

function registerUser(overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/v1/auth/register')
    .send({ ...baseUser, ...overrides });
}

beforeAll(async () => {
  await migrateUp();
});

beforeEach(async () => {
  await sequelize.query(
    'TRUNCATE TABLE password_reset_tokens, email_verification_tokens, auth_identities, users RESTART IDENTITY CASCADE'
  );
});

afterAll(async () => {
  await sequelize.close();
});

describe('auth', () => {
  it('rechaza el registro de menores de 18', async () => {
    const response = await registerUser({
      birthDate: new Date().toISOString().slice(0, 10),
    });

    expect(response.status).toBe(422);
  });

  it('registra un usuario y devuelve el token de verificación en test', async () => {
    const response = await registerUser();

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(baseUser.email);
    expect(response.body.user.emailVerified).toBe(false);
    expect(response.body.devVerificationToken).toBeTruthy();
  });

  it('verifica el email y permite login con cookie httpOnly', async () => {
    const registration = await registerUser();
    const token = registration.body.devVerificationToken as string;

    const verification = await request(app).post('/api/v1/auth/verify-email').send({ token });

    expect(verification.status).toBe(200);

    const agent = request.agent(app);
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email: baseUser.email, password: baseUser.password });

    expect(login.status).toBe(200);

    const setCookie = login.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie ?? '');

    expect(cookieHeader).toContain('revia_at=');

    const me = await agent.get('/api/v1/auth/me');

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(baseUser.email);
  });

  it('rechaza login con contraseña incorrecta', async () => {
    await registerUser();

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: baseUser.email, password: 'incorrecta12345' });

    expect(response.status).toBe(401);
  });

  it('protege /auth/me sin sesión', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
  });

  it('recupera la contraseña con el token de desarrollo', async () => {
    await registerUser();

    const forgot = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: baseUser.email });

    expect(forgot.status).toBe(200);
    expect(forgot.body.devResetToken).toBeTruthy();

    const reset = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: forgot.body.devResetToken, password: 'nuevaPassword12345' });

    expect(reset.status).toBe(200);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: baseUser.email, password: 'nuevaPassword12345' });

    expect(login.status).toBe(200);
  });

  it('bloquea el login de un usuario suspendido', async () => {
    await registerUser();
    await User.update({ isSuspended: true }, { where: { email: baseUser.email } });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: baseUser.email, password: baseUser.password });

    expect(response.status).toBe(403);
  });

  it('completa el onboarding de una cuenta sin fecha de nacimiento', async () => {
    await registerUser();
    await User.update(
      {
        onboardingCompleted: false,
        birthDate: null,
        acceptedTermsAt: null,
      },
      { where: { email: baseUser.email } }
    );

    const agent = request.agent(app);
    const login = await agent
      .post('/api/v1/auth/login')
      .send({ email: baseUser.email, password: baseUser.password });

    expect(login.status).toBe(200);

    const onboarding = await agent
      .post('/api/v1/auth/complete-onboarding')
      .send({ birthDate: '1990-01-01', acceptTerms: true });

    expect(onboarding.status).toBe(200);
    expect(onboarding.body.user.onboardingCompleted).toBe(true);
  });
});
