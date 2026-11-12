import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app.js';
import { sequelize } from '../config/database.js';
import { migrateUp } from '../config/migrator.js';
import { Category } from '../modules/categories/category.model.js';
import { Coupon } from '../modules/coupons/coupon.model.js';
import { CouponRedemption } from '../modules/coupons/couponRedemption.model.js';
import { Dispute } from '../modules/disputes/dispute.model.js';
import { Listing } from '../modules/listings/listing.model.js';
import { Order } from '../modules/orders/order.model.js';
import { Payment } from '../modules/payments/payment.model.js';
import { Payout } from '../modules/payouts/payout.model.js';
import { Refund } from '../modules/payments/refund.model.js';
import { User } from '../modules/users/user.model.js';
import { seedCategories } from '../seeders/categories.js';

interface FakeRefund {
  refund_id: string;
  refund_type: 'FULL' | 'PARTIAL';
  refund_status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: string;
  currency: string;
  creation_timestamp: string;
}

const taloMock = vi.hoisted(() => ({
  createTaloPayment: vi.fn(),
  getTaloPayment: vi.fn(),
  simulateTaloTransfer: vi.fn(),
  createTaloRefund: vi.fn(),
  buildTaloWebhookUrl: vi.fn(() => null),
  taloBaseUrl: vi.fn(() => 'https://sandbox-api.talo.com.ar'),
}));

vi.mock('../config/talo.js', () => taloMock);

const password = 'password12345';

function fakePayment(providerPaymentId = 'PAY-TEST') {
  return {
    id: providerPaymentId,
    user_id: 'talo-user',
    external_id: 'order',
    payment_status: 'PENDING',
    price: { amount: 16_550, currency: 'ARS' },
    quotes: [
      {
        currency: 'ARS',
        network: 'MOCK',
        amount: '16550',
        address: '0000735981203251372981',
        alias: 'revia.demo.talo',
      },
    ],
    payment_url: 'https://sandbox.talo.com.ar/payments/demo',
    expiration_timestamp: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

function fakeRefund(input: { type: 'FULL' | 'PARTIAL'; amountArs?: number }): {
  id: string;
  refunds: FakeRefund[];
} {
  return {
    id: 'PAY-TEST',
    refunds: [
      {
        refund_id: `REF-${randomUUID()}`,
        refund_type: input.type,
        refund_status: 'PENDING',
        amount: String(input.amountArs ?? 16_550),
        currency: 'ARS',
        creation_timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function registerVerifyAndLogin(email: string, fullName: string) {
  const registration = await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    fullName,
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

async function createSeller(email: string, fullName = 'Vendedor Fase 8') {
  const agent = await registerVerifyAndLogin(email, fullName);
  await agent.post('/api/v1/kyc/session');
  await agent.post('/api/v1/kyc/dev/verify').send({ status: 'approved' });
  return agent;
}

async function createBuyer(email: string) {
  return registerVerifyAndLogin(email, 'Comprador Fase 8');
}

async function createAdmin(email = 'admin-f8@revia.test') {
  const agent = await registerVerifyAndLogin(email, 'Admin Fase 8');
  await User.update({ role: 'admin' }, { where: { email } });
  return agent;
}

async function getLeafCategory(): Promise<Category> {
  const category = await Category.findOne({ where: { slug: 'moda-mujer' } });

  if (!category) {
    throw new Error('Falta la categoría de prueba');
  }

  return category;
}

async function createListing(sellerId: string, title: string): Promise<Listing> {
  const category = await getLeafCategory();

  return Listing.create({
    sellerId,
    categoryId: category.id,
    title,
    description: 'Publicación creada para probar disputas, cupones y reseñas.',
    condition: 'very_good',
    priceArs: 15_000,
    deliveryModes: ['pickup_home', 'midpoint'],
    midpointFeeArs: 2_200,
    allowOffers: true,
    location: 'Bahía Blanca',
    attributes: {},
    status: 'active',
    publishedAt: new Date(),
  });
}

async function createOrder(
  buyerId: string,
  sellerId: string,
  input: {
    status: 'delivered' | 'completed';
    title?: string;
    deliveredAt?: Date;
    completedAt?: Date;
    claimWindowEndsAt?: Date;
  }
): Promise<Order> {
  const listing = await createListing(sellerId, input.title ?? `Orden ${randomUUID()}`);
  const now = new Date();

  return Order.create({
    buyerId,
    sellerId,
    listingId: listing.id,
    deliveryMode: 'pickup_home',
    status: input.status,
    itemPriceArs: 15_000,
    midpointFeeArs: 0,
    tasaPercent: 7,
    tasaFixedArs: 500,
    tasaAmountArs: 1_550,
    totalAmountArs: 16_550,
    sellerPayoutArs: 15_000,
    listingTitleSnapshot: listing.title,
    listingPhotoUrlSnapshot: null,
    paidAt: now,
    deliveredAt: input.deliveredAt ?? now,
    completedAt: input.completedAt ?? (input.status === 'completed' ? now : null),
    claimWindowEndsAt: input.claimWindowEndsAt ?? new Date(now.getTime() + 48 * 60 * 60 * 1000),
  });
}

async function createPayment(order: Order): Promise<Payment> {
  return Payment.create({
    orderId: order.id,
    providerPaymentId: `PAY-${randomUUID()}`,
    externalId: order.id,
    status: 'SUCCESS',
    amountArs: order.totalAmountArs,
    currency: 'ARS',
    cvu: '0000735981203251372981',
    alias: 'revia.demo.talo',
    paidAt: new Date(),
  });
}

async function setupDispute(input?: {
  sellerEmail?: string;
  buyerEmail?: string;
  status?: 'delivered' | 'completed';
  claimWindowEndsAt?: Date;
}) {
  const sellerEmail = input?.sellerEmail ?? 'seller-f8@revia.test';
  const buyerEmail = input?.buyerEmail ?? 'buyer-f8@revia.test';
  const seller = await createSeller(sellerEmail);
  const buyer = await createBuyer(buyerEmail);
  const sellerUser = await User.findOne({ where: { email: sellerEmail } });
  const buyerUser = await User.findOne({ where: { email: buyerEmail } });

  if (!sellerUser || !buyerUser) {
    throw new Error('No se crearon los usuarios de prueba');
  }

  const order = await createOrder(buyerUser.id, sellerUser.id, {
    status: input?.status ?? 'delivered',
    claimWindowEndsAt: input?.claimWindowEndsAt,
  });
  const payment = await createPayment(order);

  return { seller, buyer, sellerUser, buyerUser, order, payment };
}

async function openDispute(agent: Awaited<ReturnType<typeof createBuyer>>, orderId: string) {
  return agent.post(`/api/v1/orders/${orderId}/dispute`).send({
    reason: 'not_as_described',
    description: 'El artículo llegó con una mancha que no figuraba en la publicación.',
  });
}

beforeAll(async () => {
  await migrateUp();
  await seedCategories();
});

beforeEach(async () => {
  await sequelize.query(
    'TRUNCATE TABLE review_reports, reviews, dispute_evidence, dispute_events, disputes, coupon_redemptions, coupons, payout_events, payouts, refunds, payment_events, payments, delivery_codes, order_events, orders, notifications, messages, conversations, offers, user_reports, user_blocks, favorites, follows, listing_reports, listing_photos, listings, payout_accounts, kyc_verifications, password_reset_tokens, email_verification_tokens, auth_identities, users RESTART IDENTITY CASCADE'
  );
  taloMock.createTaloPayment.mockResolvedValue(fakePayment());
  taloMock.getTaloPayment.mockResolvedValue(fakePayment());
  taloMock.simulateTaloTransfer.mockResolvedValue(undefined);
  taloMock.createTaloRefund.mockImplementation(
    async (_paymentId: string, input: { type: 'FULL' | 'PARTIAL'; amountArs?: number }) =>
      fakeRefund(input)
  );
});

afterAll(async () => {
  await sequelize.close();
});

describe('disputas, reembolsos, cupones y reseñas', () => {
  it('abre una disputa dentro de las 48 h y bloquea duplicados', async () => {
    const { buyer, seller, order } = await setupDispute();

    const created = await openDispute(buyer, order.id);
    expect(created.status).toBe(201);
    expect(created.body.dispute.status).toBe('open');
    expect(created.body.dispute.reason).toBe('not_as_described');

    const updatedOrder = await Order.findByPk(order.id);
    expect(updatedOrder?.status).toBe('disputed');
    expect(await Dispute.count()).toBe(1);

    const sellerNotifications = await seller.get('/api/v1/notifications');
    expect(
      sellerNotifications.body.notifications.some(
        (notification: { type: string }) => notification.type === 'dispute_opened'
      )
    ).toBe(true);

    const duplicate = await openDispute(buyer, order.id);
    expect(duplicate.status).toBe(409);
  });

  it('rechaza disputas fuera de la ventana de 48 h', async () => {
    const { buyer, order } = await setupDispute({
      buyerEmail: 'buyer-late@revia.test',
      claimWindowEndsAt: new Date(Date.now() - 60_000),
    });

    const response = await openDispute(buyer, order.id);
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('48');
  });

  it('permite mensajes, evidencia y oferta del vendedor', async () => {
    const { buyer, seller, order } = await setupDispute({
      buyerEmail: 'buyer-chat-f8@revia.test',
    });
    const opened = await openDispute(buyer, order.id);
    const disputeId = opened.body.dispute.id as string;

    const sellerMessage = await seller
      .post(`/api/v1/disputes/${disputeId}/messages`)
      .send({ body: 'Puedo ofrecer un reembolso parcial.' });
    expect(sellerMessage.status).toBe(200);
    expect(sellerMessage.body.dispute.status).toBe('under_review');

    const evidence = await buyer.post(`/api/v1/disputes/${disputeId}/evidence`).send({
      kind: 'link',
      url: 'https://example.com/evidencia.jpg',
      body: 'Foto de la mancha',
    });
    expect(evidence.status).toBe(200);
    expect(evidence.body.dispute.evidence).toHaveLength(1);

    const offer = await seller
      .post(`/api/v1/disputes/${disputeId}/offer`)
      .send({ type: 'partial_refund', amountArs: 5_000 });
    expect(offer.status).toBe(200);
    expect(
      offer.body.dispute.events.some((event: { type: string }) => event.type === 'seller_offer')
    ).toBe(true);
  });

  it('resuelve con reembolso total de Talo y es idempotente', async () => {
    const { buyer, order, payment } = await setupDispute({
      buyerEmail: 'buyer-refund-f8@revia.test',
    });
    const admin = await createAdmin('admin-refund-f8@revia.test');
    const opened = await openDispute(buyer, order.id);
    const disputeId = opened.body.dispute.id as string;

    const resolved = await admin
      .post(`/api/v1/admin/disputes/${disputeId}/resolve`)
      .send({ resolution: 'refund_money', notes: 'Corresponde el reembolso.' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.dispute.status).toBe('resolved_refund');
    expect(resolved.body.dispute.refund.status).toBe('PENDING');

    const updatedOrder = await Order.findByPk(order.id);
    expect(updatedOrder?.status).toBe('refunded');

    const refund = await Refund.findOne({ where: { orderId: order.id } });
    expect(refund?.amountArs).toBe(order.totalAmountArs);
    expect(refund?.refundType).toBe('FULL');
    expect(refund?.providerRefundId).toBeTruthy();
    expect(taloMock.createTaloRefund).toHaveBeenCalledWith(payment.providerPaymentId, {
      type: 'FULL',
    });

    const duplicate = await admin
      .post(`/api/v1/admin/disputes/${disputeId}/resolve`)
      .send({ resolution: 'refund_money' });
    expect(duplicate.status).toBe(409);
  });

  it('resuelve con cupón y permite usarlo en una compra sin oferta', async () => {
    const { buyer, sellerUser, order } = await setupDispute({
      buyerEmail: 'buyer-coupon-f8@revia.test',
    });
    const admin = await createAdmin('admin-coupon-f8@revia.test');
    const opened = await openDispute(buyer, order.id);
    const disputeId = opened.body.dispute.id as string;

    const resolved = await admin
      .post(`/api/v1/admin/disputes/${disputeId}/resolve`)
      .send({ resolution: 'refund_coupon' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.dispute.status).toBe('resolved_coupon');
    expect(resolved.body.dispute.coupon.code).toMatch(/^RV-/);

    const coupons = await buyer.get('/api/v1/me/coupons/active');
    expect(coupons.body.coupons).toHaveLength(1);
    const couponId = coupons.body.coupons[0].id as string;

    const newListing = await createListing(sellerUser.id, 'Artículo para cupón');
    const quote = await buyer.post('/api/v1/orders/quote').send({
      listingId: newListing.id,
      couponId,
      deliveryMode: 'pickup_home',
    });
    expect(quote.status).toBe(200);
    expect(quote.body.quote.couponAmountArs).toBe(15_000);
    expect(quote.body.quote.totalAmountArs).toBe(1_550);

    const created = await buyer.post('/api/v1/orders').send({
      listingId: newListing.id,
      couponId,
      deliveryMode: 'pickup_home',
    });
    expect(created.status).toBe(201);
    expect(created.body.order.couponAmountArs).toBe(15_000);

    const coupon = await Coupon.findByPk(couponId);
    expect(coupon?.status).toBe('used');
    expect(await CouponRedemption.count()).toBe(1);

    const cancelled = await buyer.delete(`/api/v1/me/orders/${created.body.order.id}`);
    expect(cancelled.status).toBe(200);

    const releasedCoupon = await Coupon.findByPk(couponId);
    expect(releasedCoupon?.status).toBe('active');
    expect(await CouponRedemption.count()).toBe(0);
  });

  it('rechaza una disputa, completa la orden y habilita el payout', async () => {
    const { buyer, sellerUser, order } = await setupDispute({
      buyerEmail: 'buyer-reject-f8@revia.test',
    });
    const admin = await createAdmin('admin-reject-f8@revia.test');
    const opened = await openDispute(buyer, order.id);
    const disputeId = opened.body.dispute.id as string;

    const rejected = await admin
      .post(`/api/v1/admin/disputes/${disputeId}/resolve`)
      .send({ resolution: 'reject', notes: 'No se encontraron pruebas.' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.dispute.status).toBe('resolved_rejected');

    const updatedOrder = await Order.findByPk(order.id);
    expect(updatedOrder?.status).toBe('completed');
    expect(await Payout.count({ where: { orderId: order.id } })).toBe(1);

    const seller = await User.findByPk(sellerUser.id);
    expect(seller?.sellerVerifiedAt).toBeTruthy();
  });

  it('crea reseñas bidireccionales y permite moderar una reseña reportada', async () => {
    const { buyer, seller, sellerUser, buyerUser, order } = await setupDispute({
      buyerEmail: 'buyer-review-f8@revia.test',
      status: 'completed',
    });
    const admin = await createAdmin('admin-review-f8@revia.test');

    const buyerReview = await buyer.post(`/api/v1/orders/${order.id}/reviews`).send({
      rating: 5,
      comment: 'Excelente vendedor.',
    });
    expect(buyerReview.status).toBe(201);

    const sellerReview = await seller.post(`/api/v1/orders/${order.id}/reviews`).send({
      rating: 4,
      comment: 'Comprador puntual.',
    });
    expect(sellerReview.status).toBe(201);

    const duplicate = await buyer.post(`/api/v1/orders/${order.id}/reviews`).send({
      rating: 5,
    });
    expect(duplicate.status).toBe(409);

    const sellerReviews = await request(app).get(`/api/v1/users/${sellerUser.id}/reviews`);
    expect(sellerReviews.status).toBe(200);
    expect(sellerReviews.body.total).toBe(1);
    expect(sellerReviews.body.averageRating).toBe(5);

    const buyerReviews = await request(app).get(`/api/v1/users/${buyerUser.id}/reviews`);
    expect(buyerReviews.body.averageRating).toBe(4);

    const reported = await seller
      .post(`/api/v1/reviews/${buyerReview.body.review.id}/report`)
      .send({ reason: 'La reseña contiene datos personales.' });
    expect(reported.status).toBe(201);

    const reports = await admin.get('/api/v1/admin/reviews/reports?status=open');
    expect(reports.body.reports).toHaveLength(1);

    const hidden = await admin.post(`/api/v1/admin/reviews/${buyerReview.body.review.id}/hide`);
    expect(hidden.status).toBe(200);
    expect(hidden.body.review.isVisible).toBe(false);

    const publicReviews = await request(app).get(`/api/v1/users/${sellerUser.id}/reviews`);
    expect(publicReviews.body.total).toBe(0);
  });
});
