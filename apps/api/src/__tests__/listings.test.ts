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

async function getMe(agent: Awaited<ReturnType<typeof createSeller>>) {
  const response = await agent.get('/api/v1/auth/me');
  return response.body.user as { id: string; fullName: string };
}

async function createActiveListing(
  seller: Awaited<ReturnType<typeof createSeller>>,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const { response } = await createDraftListing(seller, overrides);
  const listingId = response.body.listing.id as string;

  await uploadThreePhotos(seller, listingId);
  await seller.post(`/api/v1/listings/${listingId}/submit`);

  const admin = await createAdmin(`admin-${Math.random().toString(36).slice(2)}@revia.test`);
  await admin.post(`/api/v1/admin/listings/${listingId}/approve`);

  return listingId;
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
    'TRUNCATE TABLE favorites, follows, listing_reports, listing_photos, listings, payout_accounts, kyc_verifications, password_reset_tokens, email_verification_tokens, auth_identities, users RESTART IDENTITY CASCADE'
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

  it('permite seguir, listar seguidores y dejar de seguir', async () => {
    const seller = await createSeller('seller-follow@revia.test');
    const sellerUser = await getMe(seller);
    const { agent: buyer } = await registerVerifyAndLogin('buyer-follow@revia.test');

    const followed = await buyer.post(`/api/v1/users/${sellerUser.id}/follow`);
    expect(followed.status).toBe(200);

    const relationship = await buyer.get(`/api/v1/users/${sellerUser.id}/relationship`);
    expect(relationship.body.isFollowing).toBe(true);

    const following = await buyer.get('/api/v1/me/following');
    expect(following.body.following.some((user: { id: string }) => user.id === sellerUser.id)).toBe(
      true
    );

    const followers = await seller.get('/api/v1/me/followers');
    expect(followers.body.followers).toHaveLength(1);

    const unfollowed = await buyer.delete(`/api/v1/users/${sellerUser.id}/follow`);
    expect(unfollowed.status).toBe(200);

    const after = await buyer.get(`/api/v1/users/${sellerUser.id}/relationship`);
    expect(after.body.isFollowing).toBe(false);
  });

  it('agrega favoritos y arma el feed de seguidos', async () => {
    const seller = await createSeller('seller-feed@revia.test');
    const sellerUser = await getMe(seller);
    const listingId = await createActiveListing(seller);
    const { agent: buyer } = await registerVerifyAndLogin('buyer-feed@revia.test');

    const feed = await request(app).get('/api/v1/feed');
    expect(feed.body.listings.some((listing: { id: string }) => listing.id === listingId)).toBe(
      true
    );

    await buyer.post(`/api/v1/users/${sellerUser.id}/follow`);
    const followingFeed = await buyer.get('/api/v1/me/feed');
    expect(
      followingFeed.body.listings.some((listing: { id: string }) => listing.id === listingId)
    ).toBe(true);

    const favorite = await buyer.post(`/api/v1/listings/${listingId}/favorite`);
    expect(favorite.status).toBe(200);

    const favoriteStatus = await buyer.get(`/api/v1/listings/${listingId}/favorite`);
    expect(favoriteStatus.body.favorite).toBe(true);

    const favorites = await buyer.get('/api/v1/me/favorites');
    expect(
      favorites.body.listings.some((listing: { id: string }) => listing.id === listingId)
    ).toBe(true);

    await buyer.delete(`/api/v1/listings/${listingId}/favorite`);
    const after = await buyer.get(`/api/v1/listings/${listingId}/favorite`);
    expect(after.body.favorite).toBe(false);
  });

  it('busca por texto y filtra por categoría, precio y orden', async () => {
    const seller = await createSeller('seller-search@revia.test');
    const listingId = await createActiveListing(seller, {
      title: 'Campera azul de abrigo',
      priceArs: 12_000,
    });
    const category = await getLeafCategory();

    const search = await request(app).get('/api/v1/listings?q=Campera');
    expect(search.body.listings.some((listing: { id: string }) => listing.id === listingId)).toBe(
      true
    );

    const none = await request(app).get('/api/v1/listings?q=zzzz');
    expect(none.body.listings).toHaveLength(0);

    const byCategory = await request(app).get(`/api/v1/listings?categoryId=${category.id}`);
    expect(
      byCategory.body.listings.some((listing: { id: string }) => listing.id === listingId)
    ).toBe(true);

    const byPrice = await request(app).get('/api/v1/listings?minPrice=10000&maxPrice=13000');
    expect(byPrice.body.listings.some((listing: { id: string }) => listing.id === listingId)).toBe(
      true
    );

    const sorted = await request(app).get('/api/v1/listings?sort=price_asc');
    expect(sorted.status).toBe(200);
  });
});
