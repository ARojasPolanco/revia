import { randomUUID } from 'node:crypto';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app.js';
import { envs } from '../config/envs.js';
import { sequelize } from '../config/database.js';
import { migrateUp } from '../config/migrator.js';
import { Listing } from '../modules/listings/listing.model.js';
import { Offer } from '../modules/offers/offer.model.js';
import { Order } from '../modules/orders/order.model.js';
import { completeDeliveredOrders } from '../modules/orders/orders.service.js';
import { Payment } from '../modules/payments/payment.model.js';
import { PaymentEvent } from '../modules/payments/paymentEvent.model.js';
import { expirePendingPayments } from '../modules/payments/payments.service.js';
import { User } from '../modules/users/user.model.js';
import { seedCategories } from '../seeders/categories.js';

interface FakeTaloPayment {
  id: string;
  user_id: string;
  external_id: string;
  payment_status: 'PENDING' | 'SUCCESS' | 'OVERPAID' | 'UNDERPAID' | 'EXPIRED';
  price: { amount: number; currency: string };
  quotes: {
    currency: string;
    network: string;
    amount: string;
    address: string;
    alias: string;
  }[];
  payment_url: string;
  expiration_timestamp: string;
  refunds?: unknown[];
}

const taloMock = vi.hoisted(() => ({
  createTaloPayment: vi.fn(),
  getTaloPayment: vi.fn(),
  simulateTaloTransfer: vi.fn(),
  createTaloRefund: vi.fn(),
  buildTaloWebhookUrl: vi.fn(() => 'http://localhost:4000/api/v1/webhooks/talo'),
  taloBaseUrl: vi.fn(() => 'https://sandbox-api.talo.com.ar'),
}));

vi.mock('../config/talo.js', () => taloMock);

const password = 'password12345';
const taloPayments = new Map<string, FakeTaloPayment>();

function webhookPath(): string {
  const token = envs.TALO_WEBHOOK_SECRET;

  return token
    ? `/api/v1/webhooks/talo?token=${encodeURIComponent(token)}`
    : '/api/v1/webhooks/talo';
}

function makeTaloPayment(input: {
  id?: string;
  externalId: string;
  amountArs: number;
  status?: FakeTaloPayment['payment_status'];
}): FakeTaloPayment {
  return {
    id: input.id ?? `PAY-${randomUUID()}`,
    user_id: 'talo-user',
    external_id: input.externalId,
    payment_status: input.status ?? 'PENDING',
    price: { amount: input.amountArs, currency: 'ARS' },
    quotes: [
      {
        currency: 'ARS',
        network: 'MOCK_NETWORK',
        amount: String(input.amountArs),
        address: '0000735981203251372981',
        alias: 'revia.demo.talo',
      },
    ],
    payment_url: 'https://sandbox.talo.com.ar/payments/demo',
    expiration_timestamp: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

function markPaymentStatus(
  providerPaymentId: string,
  status: FakeTaloPayment['payment_status'],
  amountArs?: number
): void {
  const payment = taloPayments.get(providerPaymentId);

  if (!payment) {
    throw new Error(`No existe el pago falso ${providerPaymentId}`);
  }

  payment.payment_status = status;

  if (amountArs !== undefined) {
    payment.price.amount = amountArs;
  }
}

async function makeImage(color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({
    create: { width: 24, height: 24, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}

async function registerVerifyAndLogin(email: string) {
  const registration = await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    fullName: 'Usuario Fase 6',
    birthDate: '1990-01-01',
    acceptTerms: true,
  });

  await request(app)
    .post('/api/v1/auth/verify-email')
    .send({ token: registration.body.devVerificationToken });

  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password });

  return agent;
}

async function createSeller(email = 'seller-f6@revia.test') {
  const agent = await registerVerifyAndLogin(email);
  await agent.post('/api/v1/kyc/session');
  await agent.post('/api/v1/kyc/dev/verify').send({ status: 'approved' });
  return agent;
}

async function createAdmin(email = 'admin-f6@revia.test') {
  const agent = await registerVerifyAndLogin(email);
  await User.update({ role: 'admin' }, { where: { email } });
  return agent;
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
    title: 'Campera de prueba Fase 6',
    description: 'Campera de abrigo en muy buen estado para probar órdenes y pagos.',
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
  const admin = await createAdmin(`admin-${randomUUID()}@revia.test`);
  await admin.post(`/api/v1/admin/listings/${listingId}/approve`);

  return listingId;
}

async function createOrder(
  buyer: Awaited<ReturnType<typeof registerVerifyAndLogin>>,
  listingId: string,
  extra: Record<string, unknown> = {}
) {
  return buyer.post('/api/v1/orders').send({
    listingId,
    deliveryMode: 'pickup_home',
    ...extra,
  });
}

async function sendWebhook(orderId: string) {
  const payment = await Payment.findOne({ where: { orderId } });

  if (!payment) {
    throw new Error('No se encontró el pago de la orden');
  }

  return request(app).post(webhookPath()).send({
    message: 'Pago actualizado',
    externalId: orderId,
    paymentId: payment.providerPaymentId,
  });
}

beforeAll(async () => {
  await migrateUp();
  await seedCategories();
});

beforeEach(async () => {
  await sequelize.query(
    'TRUNCATE TABLE refunds, payment_events, payments, delivery_codes, order_events, orders, notifications, messages, conversations, offers, user_reports, user_blocks, favorites, follows, listing_reports, listing_photos, listings, payout_accounts, kyc_verifications, password_reset_tokens, email_verification_tokens, auth_identities, users RESTART IDENTITY CASCADE'
  );
  taloPayments.clear();
  taloMock.createTaloPayment.mockImplementation(
    async (input: { amountArs: number; externalId: string }): Promise<FakeTaloPayment> => {
      const payment = makeTaloPayment(input);
      taloPayments.set(payment.id, payment);
      return payment;
    }
  );
  taloMock.getTaloPayment.mockImplementation(async (paymentId: string) => {
    return taloPayments.get(paymentId) ?? makeTaloPayment({ externalId: 'unknown', amountArs: 1 });
  });
  taloMock.simulateTaloTransfer.mockResolvedValue(undefined);
});

afterAll(async () => {
  await sequelize.close();
});

describe('órdenes, pago y entrega', () => {
  it('crea la orden con snapshot, genera pago y confirma el webhook con código', async () => {
    const seller = await createSeller();
    const listingId = await createActiveListing(seller);
    const buyer = await registerVerifyAndLogin('buyer-orders@revia.test');

    const quote = await buyer
      .post('/api/v1/orders/quote')
      .send({ listingId, deliveryMode: 'pickup_home' });

    expect(quote.status).toBe(200);
    expect(quote.body.quote.itemPriceArs).toBe(15_000);
    expect(quote.body.quote.tasaAmountArs).toBe(1_550);
    expect(quote.body.quote.totalAmountArs).toBe(16_550);

    const created = await createOrder(buyer, listingId);

    expect(created.status).toBe(201);
    expect(created.body.order.status).toBe('pending_payment');
    expect(created.body.order.payment.status).toBe('PENDING');
    expect(created.body.order.payment.cvu).toBe('0000735981203251372981');

    const orders = await Order.findAll();
    expect(orders).toHaveLength(1);
    expect(orders[0]?.totalAmountArs).toBe(16_550);

    const payment = await Payment.findOne();
    markPaymentStatus(payment!.providerPaymentId, 'SUCCESS');

    const webhook = await sendWebhook(created.body.order.id);
    expect(webhook.status).toBe(200);

    const buyerOrder = await buyer.get(`/api/v1/me/orders/${created.body.order.id}`);
    expect(buyerOrder.body.order.status).toBe('paid');
    expect(buyerOrder.body.order.deliveryCode).toMatch(/^\d{6}$/);
    expect(buyerOrder.body.order.payment.status).toBe('SUCCESS');

    const sellerOrder = await seller.get(`/api/v1/me/orders/${created.body.order.id}`);
    expect(sellerOrder.body.order.deliveryCode).toBeNull();
    expect(sellerOrder.body.order.role).toBe('seller');

    const listing = await Listing.findByPk(listingId);
    expect(listing?.status).toBe('sold');

    const duplicate = await sendWebhook(created.body.order.id);
    expect(duplicate.status).toBe(200);
    expect(await PaymentEvent.count()).toBe(1);
  });

  it('valida el código, marca entregado y completa a las 48 horas', async () => {
    const seller = await createSeller('seller-delivery@revia.test');
    const listingId = await createActiveListing(seller);
    const buyer = await registerVerifyAndLogin('buyer-delivery@revia.test');
    const created = await createOrder(buyer, listingId);
    const payment = await Payment.findOne();
    markPaymentStatus(payment!.providerPaymentId, 'SUCCESS');
    await sendWebhook(created.body.order.id);

    const buyerOrder = await buyer.get(`/api/v1/me/orders/${created.body.order.id}`);
    const code = buyerOrder.body.order.deliveryCode as string;

    const wrong = await seller
      .post(`/api/v1/me/orders/${created.body.order.id}/validate-delivery`)
      .send({ code: '000000' });
    expect(wrong.status).toBe(422);

    const delivered = await seller
      .post(`/api/v1/me/orders/${created.body.order.id}/validate-delivery`)
      .send({ code });
    expect(delivered.status).toBe(200);
    expect(delivered.body.order.status).toBe('delivered');

    await Order.update(
      { claimWindowEndsAt: new Date(Date.now() - 60_000) },
      { where: { id: created.body.order.id } }
    );
    const completed = await completeDeliveredOrders();
    expect(completed).toBe(1);

    const finalOrder = await seller.get(`/api/v1/me/orders/${created.body.order.id}`);
    expect(finalOrder.body.order.status).toBe('completed');

    const sellerUser = await User.findOne({ where: { email: 'seller-delivery@revia.test' } });
    expect(sellerUser?.sellerVerifiedAt).toBeTruthy();
  });

  it('permite al comprador confirmar la recepción y completa la orden', async () => {
    const seller = await createSeller('seller-confirm@revia.test');
    const listingId = await createActiveListing(seller);
    const buyer = await registerVerifyAndLogin('buyer-confirm@revia.test');
    const created = await createOrder(buyer, listingId);
    const payment = await Payment.findOne();
    markPaymentStatus(payment!.providerPaymentId, 'SUCCESS');
    await sendWebhook(created.body.order.id);

    const confirmed = await buyer.post(
      `/api/v1/me/orders/${created.body.order.id}/confirm-receipt`
    );
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.order.status).toBe('completed');
    expect(confirmed.body.order.completedAt).toBeTruthy();
  });

  it('usa el monto de la oferta aceptada y rechaza ofertas vencidas', async () => {
    const seller = await createSeller('seller-offer-order@revia.test');
    const listingId = await createActiveListing(seller);
    const buyer = await registerVerifyAndLogin('buyer-offer-order@revia.test');

    const offerResponse = await buyer
      .post(`/api/v1/listings/${listingId}/offers`)
      .send({ amountArs: 12_000 });
    const offerId = offerResponse.body.offer.id as string;
    await seller.post(`/api/v1/offers/${offerId}/accept`);

    const quote = await buyer.post('/api/v1/orders/quote').send({
      listingId,
      offerId,
      deliveryMode: 'pickup_home',
    });
    expect(quote.body.quote.itemPriceArs).toBe(12_000);
    expect(quote.body.quote.tasaAmountArs).toBe(1_340);
    expect(quote.body.quote.totalAmountArs).toBe(13_340);

    const created = await createOrder(buyer, listingId, { offerId });
    expect(created.status).toBe(201);
    expect(created.body.order.itemPriceArs).toBe(12_000);

    await Offer.update(
      { paymentExpiresAt: new Date(Date.now() - 60_000) },
      { where: { id: offerId } }
    );

    const expired = await createOrder(buyer, listingId, { offerId });
    expect(expired.status).toBe(409);
  });

  it('rechaza modalidad no disponible, autocompra y compra duplicada', async () => {
    const seller = await createSeller('seller-guards@revia.test');
    const listingId = await createActiveListing(seller);
    const buyer = await registerVerifyAndLogin('buyer-guards@revia.test');

    const invalidDelivery = await createOrder(buyer, listingId, {
      deliveryMode: 'home_delivery',
    });
    expect(invalidDelivery.status).toBe(422);

    const ownPurchase = await createOrder(seller, listingId);
    expect(ownPurchase.status).toBe(400);

    const first = await createOrder(buyer, listingId);
    expect(first.status).toBe(201);

    const duplicate = await createOrder(buyer, listingId);
    expect(duplicate.status).toBe(409);
  });

  it('deja la orden en revisión si el pago no coincide', async () => {
    const seller = await createSeller('seller-review@revia.test');
    const listingId = await createActiveListing(seller);
    const buyer = await registerVerifyAndLogin('buyer-review@revia.test');
    const created = await createOrder(buyer, listingId);
    const payment = await Payment.findOne();
    markPaymentStatus(payment!.providerPaymentId, 'OVERPAID', 20_000);
    await sendWebhook(created.body.order.id);

    const order = await buyer.get(`/api/v1/me/orders/${created.body.order.id}`);
    expect(order.body.order.status).toBe('payment_review');
  });

  it('expira una orden cuyo pago venció sin acreditarse', async () => {
    const seller = await createSeller('seller-expire@revia.test');
    const listingId = await createActiveListing(seller);
    const buyer = await registerVerifyAndLogin('buyer-expire@revia.test');
    const created = await createOrder(buyer, listingId);
    const payment = await Payment.findOne();

    await Payment.update(
      { expiresAt: new Date(Date.now() - 60_000) },
      { where: { id: payment!.id } }
    );
    markPaymentStatus(payment!.providerPaymentId, 'PENDING');

    await expirePendingPayments();

    const order = await buyer.get(`/api/v1/me/orders/${created.body.order.id}`);
    expect(order.body.order.status).toBe('expired');
    const updatedPayment = await Payment.findByPk(payment!.id);
    expect(updatedPayment?.status).toBe('EXPIRED');
  });
});
