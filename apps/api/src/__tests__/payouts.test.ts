import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app.js';
import { sequelize } from '../config/database.js';
import { migrateUp } from '../config/migrator.js';
import { Category } from '../modules/categories/category.model.js';
import { Listing } from '../modules/listings/listing.model.js';
import { Order } from '../modules/orders/order.model.js';
import { Payment } from '../modules/payments/payment.model.js';
import { Refund } from '../modules/payments/refund.model.js';
import { Payout } from '../modules/payouts/payout.model.js';
import { PayoutEvent } from '../modules/payouts/payoutEvent.model.js';
import { User } from '../modules/users/user.model.js';
import { seedCategories } from '../seeders/categories.js';

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

function fakeTaloPayment(providerPaymentId: string) {
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

async function createSeller(email: string, fullName = 'Vendedor Fase 7') {
  const agent = await registerVerifyAndLogin(email, fullName);
  await agent.post('/api/v1/kyc/session');
  await agent.post('/api/v1/kyc/dev/verify').send({ status: 'approved' });
  return agent;
}

async function createFinance(email = 'finance-f7@revia.test') {
  const agent = await registerVerifyAndLogin(email, 'Finanzas Fase 7');
  await User.update({ role: 'finance' }, { where: { email } });
  return agent;
}

async function createBuyer(email: string) {
  return registerVerifyAndLogin(email, 'Comprador Fase 7');
}

async function createPayoutAccount(
  agent: Awaited<ReturnType<typeof createSeller>>,
  holderName: string
) {
  return agent.put('/api/v1/me/payout-account').send({
    method: 'alias',
    account: 'revia.fase7.cobros',
    holderName,
  });
}

async function createCompletedOrder(sellerId: string, buyerId: string): Promise<Order> {
  const category = await Category.findOne({ where: { slug: 'moda-mujer' } });

  if (!category) {
    throw new Error('Falta la categoría de prueba');
  }

  const listing = await Listing.create({
    sellerId,
    categoryId: category.id,
    title: 'Campera payout Fase 7',
    description: 'Publicación creada para probar payouts manuales y bloqueos de finanzas.',
    condition: 'very_good',
    priceArs: 15_000,
    deliveryModes: ['pickup_home'],
    midpointFeeArs: 0,
    allowOffers: true,
    location: 'Bahía Blanca',
    attributes: {},
    status: 'sold',
    publishedAt: new Date(),
  });
  const now = new Date();

  return Order.create({
    buyerId,
    sellerId,
    listingId: listing.id,
    deliveryMode: 'pickup_home',
    status: 'completed',
    itemPriceArs: 15_000,
    midpointFeeArs: 0,
    tasaPercent: 7,
    tasaFixedArs: 500,
    tasaAmountArs: 1_550,
    totalAmountArs: 16_550,
    sellerPayoutArs: 15_000,
    listingTitleSnapshot: 'Campera payout Fase 7',
    listingPhotoUrlSnapshot: null,
    paidAt: now,
    deliveredAt: now,
    completedAt: now,
    claimWindowEndsAt: now,
  });
}

async function setupCompletedSale(input?: {
  sellerEmail?: string;
  sellerName?: string;
  withAccount?: boolean;
  holderName?: string;
}) {
  const sellerEmail = input?.sellerEmail ?? 'seller-payout@revia.test';
  const sellerName = input?.sellerName ?? 'Vendedor Fase 7';
  const seller = await createSeller(sellerEmail, sellerName);
  const buyer = await createBuyer(`buyer-${sellerEmail}`);
  const sellerUser = await User.findOne({ where: { email: sellerEmail } });
  const buyerUser = await User.findOne({ where: { email: `buyer-${sellerEmail}` } });

  if (!sellerUser || !buyerUser) {
    throw new Error('No se crearon los usuarios de prueba');
  }

  if (input?.withAccount !== false) {
    await createPayoutAccount(seller, input?.holderName ?? sellerName);
  }

  const order = await createCompletedOrder(sellerUser.id, buyerUser.id);

  return { seller, buyer, sellerUser, buyerUser, order };
}

beforeAll(async () => {
  await migrateUp();
  await seedCategories();
});

beforeEach(async () => {
  await sequelize.query(
    'TRUNCATE TABLE payout_events, payouts, refunds, payment_events, payments, delivery_codes, order_events, orders, notifications, messages, conversations, offers, user_reports, user_blocks, favorites, follows, listing_reports, listing_photos, listings, payout_accounts, kyc_verifications, password_reset_tokens, email_verification_tokens, auth_identities, users RESTART IDENTITY CASCADE'
  );
  taloMock.getTaloPayment.mockImplementation(async (paymentId: string) =>
    fakeTaloPayment(paymentId)
  );
  taloMock.createTaloPayment.mockResolvedValue(fakeTaloPayment('PAY-TEST'));
  taloMock.simulateTaloTransfer.mockResolvedValue(undefined);
});

afterAll(async () => {
  await sequelize.close();
});

describe('payouts manuales, bloqueos y finanzas', () => {
  it('crea un payout pendiente bloqueado si falta la cuenta de cobro', async () => {
    const { seller } = await setupCompletedSale({ withAccount: false });

    const payouts = await seller.get('/api/v1/me/payouts');
    expect(payouts.status).toBe(200);
    expect(payouts.body.payouts).toHaveLength(1);
    expect(payouts.body.payouts[0].status).toBe('pending');
    expect(payouts.body.payouts[0].amountArs).toBe(15_000);
    expect(payouts.body.payouts[0].blockReason).toBe('payout_account_missing');
    expect(payouts.body.payouts[0].blockReasonLabel).toContain('cuenta de cobro');

    const summary = await seller.get('/api/v1/me/payouts/summary');
    expect(summary.body.summary.pendingAmountArs).toBe(15_000);
    expect(summary.body.summary.blockedCount).toBe(1);

    expect(await Payout.count()).toBe(1);
    expect(await PayoutEvent.count()).toBe(1);
  });

  it('permite procesar y pagar un payout, marcando la orden y generando recibo', async () => {
    const { seller, order } = await setupCompletedSale();
    const finance = await createFinance();

    const sellerPayouts = await seller.get('/api/v1/me/payouts');
    const payoutId = sellerPayouts.body.payouts[0].id as string;
    expect(sellerPayouts.body.payouts[0].blockReason).toBeNull();
    expect(sellerPayouts.body.payouts[0].account.accountFull).toBeUndefined();

    const queue = await finance.get('/api/v1/admin/payouts?status=pending');
    expect(queue.status).toBe(200);
    expect(queue.body.payouts).toHaveLength(1);
    expect(queue.body.payouts[0].account.accountMasked).toBeTruthy();
    expect(queue.body.payouts[0].account.accountFull).toBe('revia.fase7.cobros');

    const processing = await finance.post(`/api/v1/admin/payouts/${payoutId}/processing`);
    expect(processing.status).toBe(200);
    expect(processing.body.payout.status).toBe('processing');

    const updatedOrder = await Order.findByPk(order.id);
    expect(updatedOrder?.status).toBe('payout_pending');

    const paid = await finance
      .post(`/api/v1/admin/payouts/${payoutId}/mark-paid`)
      .send({ operationId: 'OP-F7-001' });
    expect(paid.status).toBe(200);
    expect(paid.body.payout.status).toBe('paid');
    expect(paid.body.payout.operationId).toBe('OP-F7-001');

    const paidOrder = await Order.findByPk(order.id);
    expect(paidOrder?.status).toBe('paid_out');

    const notifications = await seller.get('/api/v1/notifications');
    expect(
      notifications.body.notifications.some(
        (notification: { type: string }) => notification.type === 'payout_sent'
      )
    ).toBe(true);

    const receipt = await seller.get(`/api/v1/me/payouts/${payoutId}/receipt`);
    expect(receipt.status).toBe(200);
    expect(receipt.text).toContain('OP-F7-001');
    expect(receipt.text).toContain('Comprobante de payout');

    const financeSummary = await finance.get('/api/v1/admin/payouts/summary');
    expect(financeSummary.body.summary.paidCount).toBe(1);
    expect(financeSummary.body.summary.paidAmountArs).toBe(15_000);

    const earnings = await finance.get('/api/v1/admin/payouts/earnings');
    expect(earnings.status).toBe(200);
    expect(earnings.body.earnings.totalTasaArs).toBe(1_550);
    expect(earnings.body.earnings.totalOrders).toBe(1);
    expect(earnings.body.earnings.lastOrders[0].tasaAmountArs).toBe(1_550);
  });

  it('bloquea el procesamiento sin cuenta y lo desbloquea al configurarla', async () => {
    const { seller } = await setupCompletedSale({
      sellerEmail: 'seller-block@revia.test',
      withAccount: false,
    });
    const finance = await createFinance('finance-block@revia.test');

    const payouts = await seller.get('/api/v1/me/payouts');
    const payoutId = payouts.body.payouts[0].id as string;

    const blocked = await finance.post(`/api/v1/admin/payouts/${payoutId}/processing`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toContain('cuenta de cobro');

    const account = await createPayoutAccount(seller, 'Vendedor Fase 7');
    expect(account.status).toBe(200);

    const unlocked = await finance.post(`/api/v1/admin/payouts/${payoutId}/processing`);
    expect(unlocked.status).toBe(200);
    expect(unlocked.body.payout.status).toBe('processing');
    expect(unlocked.body.payout.account).not.toBeNull();
  });

  it('bloquea si la cuenta de cobro está en revisión por titular distinto', async () => {
    const { seller } = await setupCompletedSale({
      sellerEmail: 'seller-holder@revia.test',
      holderName: 'Otro Titular',
    });
    const finance = await createFinance('finance-holder@revia.test');

    const payouts = await seller.get('/api/v1/me/payouts');
    expect(payouts.body.payouts[0].blockReason).toBe('payout_account_pending_review');

    const blocked = await finance.post(
      `/api/v1/admin/payouts/${payouts.body.payouts[0].id}/processing`
    );
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toContain('revisión');
  });

  it('bloquea si hay un reembolso pendiente', async () => {
    const { seller, buyerUser, order } = await setupCompletedSale({
      sellerEmail: 'seller-refund@revia.test',
    });
    const finance = await createFinance('finance-refund@revia.test');
    const payment = await Payment.create({
      orderId: order.id,
      providerPaymentId: 'PAY-REFUND-PENDING',
      externalId: order.id,
      status: 'SUCCESS',
      amountArs: order.totalAmountArs,
      currency: 'ARS',
      cvu: '0000735981203251372981',
      alias: 'revia.demo.talo',
      paidAt: new Date(),
    });

    await Refund.create({
      orderId: order.id,
      paymentId: payment.id,
      refundType: 'FULL',
      amountArs: order.totalAmountArs,
      currency: 'ARS',
      status: 'PENDING',
      requestedBy: buyerUser.id,
    });

    const payouts = await seller.get('/api/v1/me/payouts');
    expect(payouts.body.payouts[0].blockReason).toBe('refund_pending');

    const blocked = await finance.post(
      `/api/v1/admin/payouts/${payouts.body.payouts[0].id}/processing`
    );
    expect(blocked.status).toBe(409);
    expect(blocked.body.message).toContain('reembolso pendiente');
  });

  it('permite reintentar un payout fallido y exige rol finance', async () => {
    const { seller } = await setupCompletedSale({ sellerEmail: 'seller-retry@revia.test' });
    const finance = await createFinance('finance-retry@revia.test');
    const regular = await createBuyer('regular-retry@revia.test');

    const forbidden = await regular.get('/api/v1/admin/payouts');
    expect(forbidden.status).toBe(403);

    const payouts = await seller.get('/api/v1/me/payouts');
    const payoutId = payouts.body.payouts[0].id as string;

    await finance.post(`/api/v1/admin/payouts/${payoutId}/processing`);
    const failed = await finance
      .post(`/api/v1/admin/payouts/${payoutId}/mark-failed`)
      .send({ reason: 'Datos bancarios rechazados' });
    expect(failed.status).toBe(200);
    expect(failed.body.payout.status).toBe('failed');

    const retry = await finance.post(`/api/v1/admin/payouts/${payoutId}/processing`);
    expect(retry.status).toBe(200);
    expect(retry.body.payout.status).toBe('processing');

    const paid = await finance
      .post(`/api/v1/admin/payouts/${payoutId}/mark-paid`)
      .send({ operationId: 'OP-RETRY-001' });
    expect(paid.status).toBe(200);
    expect(paid.body.payout.status).toBe('paid');
  });

  it('expone conciliación Talo a finanzas', async () => {
    const { order } = await setupCompletedSale({ sellerEmail: 'seller-reconcile@revia.test' });
    const finance = await createFinance('finance-reconcile@revia.test');

    await Payment.create({
      orderId: order.id,
      providerPaymentId: 'PAY-RECONCILE-001',
      externalId: order.id,
      status: 'PENDING',
      amountArs: order.totalAmountArs,
      currency: 'ARS',
      cvu: '0000735981203251372981',
      alias: 'revia.demo.talo',
    });

    const reconciliation = await finance.post('/api/v1/admin/payouts/reconcile');
    expect(reconciliation.status).toBe(200);
    expect(reconciliation.body.reconciliation.checked).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(reconciliation.body.reconciliation.mismatches)).toBe(true);
  });
});
