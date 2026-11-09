import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { sequelize } from '../config/database.js';
import { migrateUp } from '../config/migrator.js';
import { User } from '../modules/users/user.model.js';
import { seedCategories } from '../seeders/categories.js';

const password = 'password12345';

async function makeImage(color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({
    create: {
      width: 24,
      height: 24,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();
}

async function registerVerifyAndLogin(email: string) {
  const registration = await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    fullName: 'Usuario Listing',
    birthDate: '1990-01-01',
    acceptTerms: true,
  });

  await request(app)
    .post('/api/v1/auth/verify-email')
    .send({ token: registration.body.devVerificationToken });

  const agent = request.agent(app);
  const login = await agent.post('/api/v1/auth/login').send({ email, password });

  return { agent, login };
}

async function createSeller(email = 'seller@revia.test') {
  const { agent, login } = await registerVerifyAndLogin(email);

  if (login.status !== 200) {
    throw new Error('No se pudo iniciar sesión');
  }

  await agent.post('/api/v1/kyc/session');
  await agent.post('/api/v1/kyc/dev/verify').send({ status: 'approved' });

  return agent;
}

async function createAdmin(email = 'admin@revia.test') {
  const { agent } = await registerVerifyAndLogin(email);
  await User.update({ role: 'admin' }, { where: { email } });
  return agent;
}

async function getLeafCategory(): Promise<{
  id: string;
  name: string;
  attributes: { key: string; label: string; required: boolean }[];
}> {
  const response = await request(app).get('/api/v1/categories');
  const parent = response.body.categories.find(
    (category: { slug: string }) => category.slug === 'moda'
  );

  return parent.children.find((category: { slug: string }) => category.slug === 'moda-mujer');
}

async function createDraftListing(
  agent: Awaited<ReturnType<typeof createSeller>>,
  overrides: Record<string, unknown> = {}
) {
  const category = await getLeafCategory();

  const response = await agent.post('/api/v1/listings').send({
    title: 'Campera de prueba',
    description: 'Campera de abrigo en muy buen estado, talle M.',
    categoryId: category.id,
    condition: 'very_good',
    priceArs: 15_000,
    deliveryModes: ['pickup_home', 'midpoint'],
    allowOffers: true,
    location: 'Bahía Blanca',
    attributes: {
      size: 'M',
      brand: 'Marca Test',
      gender: 'Unisex',
    },
    ...overrides,
  });

  return { response, category };
}

async function uploadThreePhotos(
  agent: Awaited<ReturnType<typeof createSeller>>,
  listingId: string
) {
  return agent
    .post(`/api/v1/listings/${listingId}/photos`)
    .attach('photos', await makeImage({ r: 15, g: 118, b: 110 }), 'foto1.png')
    .attach('photos', await makeImage({ r: 40, g: 80, b: 120 }), 'foto2.png')
    .attach('photos', await makeImage({ r: 120, g: 80, b: 40 }), 'foto3.png');
}

beforeAll(async () => {
  await migrateUp();
  await seedCategories();
});

beforeEach(async () => {
  await sequelize.query(
    'TRUNCATE TABLE listing_reports, listing_photos, listings, payout_accounts, kyc_verifications, password_reset_tokens, email_verification_tokens, auth_identities, users RESTART IDENTITY CASCADE'
  );
});

afterAll(async () => {
  await sequelize.close();
});

describe('publicaciones', () => {
  it('devuelve la taxonomía con atributos', async () => {
    const response = await request(app).get('/api/v1/categories');

    expect(response.status).toBe(200);
    expect(response.body.categories).toHaveLength(8);

    const moda = response.body.categories.find(
      (category: { slug: string }) => category.slug === 'moda'
    );
    const mujer = moda.children.find(
      (category: { slug: string }) => category.slug === 'moda-mujer'
    );

    expect(mujer.attributes.some((attribute: { key: string }) => attribute.key === 'size')).toBe(
      true
    );
  });

  it('crea borrador, sube 3 fotos, envía a revisión y se aprueba', async () => {
    const seller = await createSeller();
    const { response: created } = await createDraftListing(seller);

    expect(created.status).toBe(201);
    expect(created.body.listing.status).toBe('draft');
    expect(created.body.listing.midpointFeeArs).toBe(2_200);

    const listingId = created.body.listing.id as string;
    const photos = await uploadThreePhotos(seller, listingId);

    expect(photos.status).toBe(201);
    expect(photos.body.photos).toHaveLength(3);

    const submitted = await seller.post(`/api/v1/listings/${listingId}/submit`);
    expect(submitted.status).toBe(200);
    expect(submitted.body.listing.status).toBe('pending');

    const publicBefore = await request(app).get('/api/v1/listings');
    expect(publicBefore.body.listings).toHaveLength(0);

    const admin = await createAdmin();
    const pending = await admin.get('/api/v1/admin/listings?status=pending');
    expect(pending.status).toBe(200);
    expect(pending.body.listings).toHaveLength(1);

    const approved = await admin.post(`/api/v1/admin/listings/${listingId}/approve`);
    expect(approved.status).toBe(200);
    expect(approved.body.listing.status).toBe('active');

    const publicAfter = await request(app).get('/api/v1/listings');
    expect(publicAfter.body.listings).toHaveLength(1);
    expect(publicAfter.body.listings[0].photos).toHaveLength(3);

    const detail = await request(app).get(`/api/v1/listings/${listingId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.listing.seller.fullName).toBe('Usuario Listing');
  });

  it('rechaza con motivo y permite reenviar', async () => {
    const seller = await createSeller();
    const { response: created } = await createDraftListing(seller);
    const listingId = created.body.listing.id as string;

    await uploadThreePhotos(seller, listingId);
    await seller.post(`/api/v1/listings/${listingId}/submit`);

    const admin = await createAdmin();
    const rejected = await admin
      .post(`/api/v1/admin/listings/${listingId}/reject`)
      .send({ reason: 'Las fotos no son claras.' });

    expect(rejected.status).toBe(200);
    expect(rejected.body.listing.status).toBe('rejected');
    expect(rejected.body.listing.rejectionReason).toBe('Las fotos no son claras.');

    const mine = await seller.get(`/api/v1/me/listings/${listingId}`);
    expect(mine.body.listing.status).toBe('rejected');

    const resubmitted = await seller.post(`/api/v1/listings/${listingId}/submit`);
    expect(resubmitted.status).toBe(200);
    expect(resubmitted.body.listing.status).toBe('pending');
  });

  it('bloquea el envío con menos de 3 fotos', async () => {
    const seller = await createSeller();
    const { response: created } = await createDraftListing(seller);
    const listingId = created.body.listing.id as string;

    await seller
      .post(`/api/v1/listings/${listingId}/photos`)
      .attach('photos', await makeImage({ r: 15, g: 118, b: 110 }), 'foto1.png');

    const submitted = await seller.post(`/api/v1/listings/${listingId}/submit`);

    expect(submitted.status).toBe(422);
    expect(submitted.body.message).toContain('al menos 3 fotos');
  });

  it('bloquea el envío si falta un atributo obligatorio', async () => {
    const seller = await createSeller();
    const { response: created } = await createDraftListing(seller, {
      attributes: { brand: 'Marca Test', gender: 'Unisex' },
    });
    const listingId = created.body.listing.id as string;

    await uploadThreePhotos(seller, listingId);

    const submitted = await seller.post(`/api/v1/listings/${listingId}/submit`);

    expect(submitted.status).toBe(422);
    expect(submitted.body.message).toContain('Talle');
  });

  it('bloquea la creación sin KYC aprobado', async () => {
    const { agent } = await registerVerifyAndLogin('sin-kyc@revia.test');
    const category = await getLeafCategory();

    const response = await agent.post('/api/v1/listings').send({
      title: 'Campera de prueba',
      description: 'Campera de abrigo en muy buen estado, talle M.',
      categoryId: category.id,
      condition: 'very_good',
      priceArs: 15_000,
      deliveryModes: ['pickup_home'],
      allowOffers: true,
      location: 'Bahía Blanca',
      attributes: { size: 'M' },
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('verificación de identidad');
  });
});
