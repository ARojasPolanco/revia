import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { sequelize } from '../config/database.js';
import { migrateUp } from '../config/migrator.js';
import { Offer } from '../modules/offers/offer.model.js';
import { expireOffers } from '../modules/offers/offers.service.js';
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
    fullName: 'Usuario Fase 5',
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

async function createSeller(email = 'seller-f5@revia.test') {
  const { agent } = await registerVerifyAndLogin(email);
  await agent.post('/api/v1/kyc/session');
  await agent.post('/api/v1/kyc/dev/verify').send({ status: 'approved' });
  return agent;
}

async function createAdmin(email = 'admin-f5@revia.test') {
  const { agent } = await registerVerifyAndLogin(email);
  await User.update({ role: 'admin' }, { where: { email } });
  return agent;
}

async function getMe(agent: Awaited<ReturnType<typeof createSeller>>) {
  const response = await agent.get('/api/v1/auth/me');
  return response.body.user as { id: string; fullName: string };
}

async function getLeafCategory() {
  const response = await request(app).get('/api/v1/categories');
  const parent = response.body.categories.find(
    (category: { slug: string }) => category.slug === 'moda'
  );

  return parent.children.find((category: { slug: string }) => category.slug === 'moda-mujer') as {
    id: string;
  };
}

async function createActiveListing(
  seller: Awaited<ReturnType<typeof createSeller>>,
  overrides: Record<string, unknown> = {}
): Promise<string> {
  const category = await getLeafCategory();

  const created = await seller.post('/api/v1/listings').send({
    title: 'Campera de prueba Fase 5',
    description: 'Campera de abrigo en muy buen estado para probar ofertas y chat.',
    categoryId: category.id,
    condition: 'very_good',
    priceArs: 15_000,
    deliveryModes: ['pickup_home', 'midpoint'],
    allowOffers: true,
    location: 'Bahía Blanca',
    attributes: { size: 'M', brand: 'Demo', gender: 'Unisex' },
    ...overrides,
  });
  const listingId = created.body.listing.id as string;

  await seller
    .post(`/api/v1/listings/${listingId}/photos`)
    .attach('photos', await makeImage({ r: 15, g: 118, b: 110 }), '1.png')
    .attach('photos', await makeImage({ r: 40, g: 80, b: 160 }), '2.png')
    .attach('photos', await makeImage({ r: 160, g: 80, b: 40 }), '3.png');

  await seller.post(`/api/v1/listings/${listingId}/submit`);

  const admin = await createAdmin(`admin-${Math.random().toString(36).slice(2)}@revia.test`);
  await admin.post(`/api/v1/admin/listings/${listingId}/approve`);

  return listingId;
}

beforeAll(async () => {
  await migrateUp();
  await seedCategories();
});

beforeEach(async () => {
  await sequelize.query(
    'TRUNCATE TABLE notifications, messages, conversations, offers, user_reports, user_blocks, favorites, follows, listing_reports, listing_photos, listings, payout_accounts, kyc_verifications, password_reset_tokens, email_verification_tokens, auth_identities, users RESTART IDENTITY CASCADE'
  );
});

afterAll(async () => {
  await sequelize.close();
});

describe('ofertas, chat y notificaciones', () => {
  it('crea una oferta, notifica al vendedor y permite aceptarla', async () => {
    const seller = await createSeller('seller-offer@revia.test');
    const listingId = await createActiveListing(seller);
    const { agent: buyer } = await registerVerifyAndLogin('buyer-offer@revia.test');

    const created = await buyer
      .post(`/api/v1/listings/${listingId}/offers`)
      .send({ amountArs: 12_000 });

    expect(created.status).toBe(201);
    expect(created.body.offer.status).toBe('pending');
    expect(created.body.offer.direction).toBe('buyer_to_seller');

    const sellerNotifications = await seller.get('/api/v1/notifications');
    expect(
      sellerNotifications.body.notifications.some(
        (notification: { type: string }) => notification.type === 'offer_received'
      )
    ).toBe(true);
    expect(sellerNotifications.body.unreadCount).toBeGreaterThan(0);

    const received = await seller.get('/api/v1/me/offers');
    expect(received.body.received).toHaveLength(1);

    const accepted = await seller.post(`/api/v1/offers/${created.body.offer.id}/accept`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.offer.status).toBe('accepted');
    expect(accepted.body.offer.paymentExpiresAt).toBeTruthy();

    const buyerNotifications = await buyer.get('/api/v1/notifications');
    expect(
      buyerNotifications.body.notifications.some(
        (notification: { type: string }) => notification.type === 'offer_accepted'
      )
    ).toBe(true);
  });

  it('rechaza ofertas menores al 70% y evita ofertas pendientes duplicadas', async () => {
    const seller = await createSeller('seller-limit@revia.test');
    const listingId = await createActiveListing(seller);
    const { agent: buyer } = await registerVerifyAndLogin('buyer-limit@revia.test');

    const tooLow = await buyer
      .post(`/api/v1/listings/${listingId}/offers`)
      .send({ amountArs: 5_000 });

    expect(tooLow.status).toBe(422);
    expect(tooLow.body.message).toContain('30% menos');

    const created = await buyer
      .post(`/api/v1/listings/${listingId}/offers`)
      .send({ amountArs: 12_000 });

    expect(created.status).toBe(201);

    const duplicate = await buyer
      .post(`/api/v1/listings/${listingId}/offers`)
      .send({ amountArs: 11_000 });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toContain('oferta pendiente');
  });

  it('permite contraofertar y que el comprador acepte la contraoferta', async () => {
    const seller = await createSeller('seller-counter@revia.test');
    const listingId = await createActiveListing(seller);
    const { agent: buyer } = await registerVerifyAndLogin('buyer-counter@revia.test');

    const created = await buyer
      .post(`/api/v1/listings/${listingId}/offers`)
      .send({ amountArs: 12_000 });

    const counter = await seller
      .post(`/api/v1/offers/${created.body.offer.id}/counter`)
      .send({ amountArs: 14_000 });

    expect(counter.status).toBe(200);
    expect(counter.body.offer.direction).toBe('seller_to_buyer');
    expect(counter.body.offer.status).toBe('pending');

    const accepted = await buyer.post(`/api/v1/offers/${counter.body.offer.id}/accept`);

    expect(accepted.status).toBe(200);
    expect(accepted.body.offer.status).toBe('accepted');
  });

  it('expira ofertas vencidas', async () => {
    const seller = await createSeller('seller-expire@revia.test');
    const listingId = await createActiveListing(seller);
    const { agent: buyer } = await registerVerifyAndLogin('buyer-expire@revia.test');

    const created = await buyer
      .post(`/api/v1/listings/${listingId}/offers`)
      .send({ amountArs: 12_000 });

    await Offer.update(
      { expiresAt: new Date(Date.now() - 60_000) },
      { where: { id: created.body.offer.id } }
    );
    await expireOffers();

    const offer = await Offer.findByPk(created.body.offer.id);
    expect(offer?.status).toBe('expired');
  });

  it('crea chat, marca contacto, notifica y bloquea', async () => {
    const seller = await createSeller('seller-chat@revia.test');
    const sellerUser = await getMe(seller);
    const listingId = await createActiveListing(seller);
    const { agent: buyer } = await registerVerifyAndLogin('buyer-chat@revia.test');
    const buyerUser = await getMe(buyer);

    const conversation = await buyer.post('/api/v1/conversations').send({ listingId });

    expect(conversation.status).toBe(201);
    const conversationId = conversation.body.conversation.id as string;

    const detail = await buyer.get(`/api/v1/conversations/${conversationId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.conversation.otherUser.fullName).toBe('Usuario Fase 5');

    const message = await buyer
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .send({ body: 'Hola, te paso mi whatsapp 11 2345 6789' });

    expect(message.status).toBe(201);
    expect(message.body.message.flaggedContact).toBe(true);
    expect(message.body.message.flaggedReasons).toContain('redes sociales');
    expect(message.body.warning).toContain('Por tu seguridad');

    const sellerNotifications = await seller.get('/api/v1/notifications');
    expect(
      sellerNotifications.body.notifications.some(
        (notification: { type: string }) => notification.type === 'new_message'
      )
    ).toBe(true);

    const conversations = await seller.get('/api/v1/conversations');
    expect(conversations.body.conversations[0].unreadCount).toBe(1);
    expect(conversations.body.conversations[0].listingTitle).toContain('Campera');

    await seller.post(`/api/v1/conversations/${conversationId}/read`);
    const afterRead = await seller.get('/api/v1/conversations');
    expect(afterRead.body.conversations[0].unreadCount).toBe(0);

    const blocked = await seller.post(`/api/v1/users/${buyerUser.id}/block`);
    expect(blocked.status).toBe(200);

    const blockedMessage = await buyer
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .send({ body: '¿Seguimos?' });

    expect(blockedMessage.status).toBe(403);

    const reported = await seller
      .post(`/api/v1/users/${buyerUser.id}/report`)
      .send({ reason: 'Compartió datos de contacto fuera de la plataforma.' });

    expect(reported.status).toBe(201);

    expect(sellerUser.id).toBeTruthy();
  });

  it('marca todas las notificaciones como leídas', async () => {
    const seller = await createSeller('seller-notify@revia.test');
    const listingId = await createActiveListing(seller);
    const { agent: buyer } = await registerVerifyAndLogin('buyer-notify@revia.test');

    await buyer.post(`/api/v1/listings/${listingId}/offers`).send({ amountArs: 12_000 });

    const before = await seller.get('/api/v1/notifications');
    expect(before.body.unreadCount).toBeGreaterThan(0);

    await seller.post('/api/v1/notifications/read-all');

    const after = await seller.get('/api/v1/notifications');
    expect(after.body.unreadCount).toBe(0);
  });
});
