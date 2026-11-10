import crypto from 'node:crypto';
import { Op } from 'sequelize';
import type { Transaction } from 'sequelize';
import { DEFAULTS } from '@revia/shared';
import { envs, isProduction } from '../../config/envs.js';
import { logger } from '../../config/logger.js';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../errors/appError.js';
import { decryptString, encryptString } from '../../utils/encryption.js';
import { hashToken } from '../../utils/tokens.js';
import {
  buildTaloWebhookUrl,
  createTaloPayment,
  getTaloPayment,
  simulateTaloTransfer,
  taloBaseUrl,
  type TaloPayment,
} from '../../config/talo.js';
import { createNotification } from '../notifications/notifications.service.js';
import { Listing } from '../listings/listing.model.js';
import { Order } from '../orders/order.model.js';
import { DeliveryCode } from '../orders/deliveryCode.model.js';
import { OrderEvent } from '../orders/orderEvent.model.js';
import { User } from '../users/user.model.js';
import { Payment } from './payment.model.js';
import { PaymentEvent } from './paymentEvent.model.js';

export interface PaymentView {
  id: string;
  status: string;
  amountArs: number;
  currency: string;
  cvu: string | null;
  alias: string | null;
  expiresAt: Date | null;
  paidAt: Date | null;
}

interface ProcessResult {
  status: string;
  orderId: string;
  duplicate: boolean;
  orderStatus: string;
}

function toPaymentView(payment: Payment, includeInstructions: boolean): PaymentView {
  return {
    id: payment.id,
    status: payment.status,
    amountArs: payment.amountArs,
    currency: payment.currency,
    cvu: includeInstructions ? payment.cvu : null,
    alias: includeInstructions ? payment.alias : null,
    expiresAt: payment.expiresAt,
    paidAt: payment.paidAt,
  };
}

export function paymentViewForOrder(payment: Payment | null, includeInstructions: boolean) {
  return payment ? toPaymentView(payment, includeInstructions) : null;
}

function generateDeliveryCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function issueDeliveryCode(orderId: string, transaction: Transaction): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateDeliveryCode();

    try {
      await DeliveryCode.create(
        {
          orderId,
          codeHash: hashToken(code),
          codeEncrypted: encryptString(code),
        },
        { transaction }
      );

      return code;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'SequelizeUniqueConstraintError' || /unique/i.test(error.message))
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('No se pudo generar el código de entrega');
}

async function logEvent(
  orderId: string,
  type: string,
  transaction: Transaction,
  data: Record<string, unknown> = {},
  actorId: string | null = null
): Promise<void> {
  await OrderEvent.create(
    {
      orderId,
      type,
      actorId,
      data,
    },
    { transaction }
  );
}

export async function createPaymentForOrder(order: Order, buyer: User): Promise<PaymentView> {
  const existing = await Payment.findOne({ where: { orderId: order.id } });

  if (existing) {
    return toPaymentView(existing, true);
  }

  const nameParts = buyer.fullName.trim().split(/\s+/);
  const firstName = nameParts.shift() ?? buyer.fullName;
  const lastName = nameParts.join(' ') || undefined;

  let taloPayment: TaloPayment;

  try {
    taloPayment = await createTaloPayment({
      amountArs: order.totalAmountArs,
      externalId: order.id,
      motive: `REVIA - ${order.listingTitleSnapshot}`.slice(0, 140),
      redirectUrl: `${envs.APP_URL.replace(/\/+$/, '')}/compras/${order.id}`,
      webhookUrl: buildTaloWebhookUrl() ?? undefined,
      clientData: {
        firstName,
        lastName,
        email: buyer.email,
      },
    });
  } catch (error) {
    logger.error('No se pudo crear el pago en Talo', {
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
      details: isProduction ? undefined : (error as { details?: unknown }).details,
    });
    throw new AppError(
      'No pudimos generar las instrucciones de pago. Reintentá en unos minutos.',
      503
    );
  }

  const quote = taloPayment.quotes?.[0];
  const payment = await Payment.create({
    orderId: order.id,
    providerPaymentId: taloPayment.id,
    externalId: taloPayment.external_id ?? order.id,
    status: taloPayment.payment_status,
    amountArs: taloPayment.price.amount,
    currency: taloPayment.price.currency,
    cvu: quote?.address ?? null,
    alias: quote?.alias ?? null,
    paymentUrl: taloPayment.payment_url ?? null,
    expiresAt: taloPayment.expiration_timestamp ? new Date(taloPayment.expiration_timestamp) : null,
    metadata: {
      network: quote?.network ?? null,
    },
  });

  return toPaymentView(payment, true);
}

async function notifyPaymentConfirmed(order: Order): Promise<void> {
  await Promise.all([
    createNotification({
      userId: order.buyerId,
      type: 'payment_confirmed',
      title: 'Pago confirmado',
      body: 'Recibimos tu pago. Coordiná la entrega con el vendedor y compartí tu código.',
      data: { orderId: order.id, role: 'buyer' },
    }),
    createNotification({
      userId: order.sellerId,
      type: 'payment_confirmed',
      title: 'Venta pagada',
      body: 'El comprador pagó. Coordiná la entrega y validá el código cuando la concretes.',
      data: { orderId: order.id, role: 'seller' },
    }),
    createNotification({
      userId: order.buyerId,
      type: 'delivery_code_issued',
      title: 'Código de entrega listo',
      body: 'Ya tenés tu código de 6 dígitos. Mostralo al vendedor al recibir el artículo.',
      data: { orderId: order.id, role: 'buyer' },
    }),
  ]);
}

async function notifyPaymentReview(order: Order): Promise<void> {
  await Promise.all([
    createNotification({
      userId: order.buyerId,
      type: 'payment_review',
      title: 'Pago en revisión',
      body: 'Recibimos tu pago, pero necesita una revisión manual. Te avisamos cuando esté listo.',
      data: { orderId: order.id, role: 'buyer' },
    }),
    createNotification({
      userId: order.sellerId,
      type: 'payment_review',
      title: 'Pago en revisión',
      body: 'El pago de esta venta está en revisión manual. No coordines la entrega todavía.',
      data: { orderId: order.id, role: 'seller' },
    }),
  ]);
}

async function notifyPaymentExpired(order: Order): Promise<void> {
  await createNotification({
    userId: order.buyerId,
    type: 'payment_expired',
    title: 'Pago vencido',
    body: 'El pago venció y la compra se canceló. El artículo sigue disponible.',
    data: { orderId: order.id, role: 'buyer' },
  });
}

async function applySuccessfulPayment(
  order: Order,
  payment: Payment,
  transaction: Transaction
): Promise<{ orderStatus: string; notify: 'paid' | 'review' }> {
  const listing = await Listing.findByPk(order.listingId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!listing || listing.status !== 'active') {
    await order.update({ status: 'payment_review' }, { transaction });
    await logEvent(order.id, 'listing_unavailable', transaction, {}, null);
    return { orderStatus: 'payment_review', notify: 'review' };
  }

  if (payment.status === 'OVERPAID' || payment.status === 'UNDERPAID') {
    await order.update({ status: 'payment_review' }, { transaction });
    await logEvent(
      order.id,
      'payment_review',
      transaction,
      {
        paymentStatus: payment.status,
        expectedAmountArs: order.totalAmountArs,
        receivedAmountArs: payment.amountArs,
      },
      null
    );
    return { orderStatus: 'payment_review', notify: 'review' };
  }

  await listing.update({ status: 'sold' }, { transaction });
  await order.update(
    {
      status: 'paid',
      paidAt: new Date(),
    },
    { transaction }
  );

  await issueDeliveryCode(order.id, transaction);
  await logEvent(order.id, 'payment_confirmed', transaction, {}, null);
  await logEvent(order.id, 'delivery_code_issued', transaction, {}, null);

  return { orderStatus: 'paid', notify: 'paid' };
}

export async function processTaloPayment(
  providerPaymentId: string,
  payload: Record<string, unknown> = {}
): Promise<ProcessResult | null> {
  const payment = await Payment.findOne({ where: { providerPaymentId } });

  if (!payment) {
    logger.warn('Webhook de pago sin registro local', { providerPaymentId });
    return null;
  }

  let taloPayment: TaloPayment;

  try {
    taloPayment = await getTaloPayment(providerPaymentId);
  } catch (error) {
    logger.error('No se pudo consultar el pago en Talo', {
      providerPaymentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  const eventKey = `${providerPaymentId}:${taloPayment.payment_status}`;
  const duplicate = await PaymentEvent.findOne({ where: { eventKey } });

  if (duplicate) {
    return {
      status: taloPayment.payment_status,
      orderId: payment.orderId,
      duplicate: true,
      orderStatus: '',
    };
  }

  let result: ProcessResult | null = null;
  let notify: 'paid' | 'review' | 'expired' | null = null;

  try {
    result = await sequelize.transaction(async (transaction) => {
      const lockedPayment = await Payment.findByPk(payment.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const order = await Order.findByPk(payment.orderId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!lockedPayment || !order) {
        return null;
      }

      const quote = taloPayment.quotes?.[0];
      await lockedPayment.update(
        {
          status: taloPayment.payment_status,
          amountArs: taloPayment.price.amount,
          currency: taloPayment.price.currency,
          cvu: quote?.address ?? lockedPayment.cvu,
          alias: quote?.alias ?? lockedPayment.alias,
          paymentUrl: taloPayment.payment_url ?? lockedPayment.paymentUrl,
          expiresAt: taloPayment.expiration_timestamp
            ? new Date(taloPayment.expiration_timestamp)
            : lockedPayment.expiresAt,
          paidAt: taloPayment.payment_status === 'SUCCESS' ? new Date() : lockedPayment.paidAt,
        },
        { transaction }
      );

      let orderStatus = order.status;
      let shouldNotify: 'paid' | 'review' | 'expired' | null = null;

      if (taloPayment.payment_status === 'SUCCESS') {
        if (order.status === 'pending_payment') {
          const applied = await applySuccessfulPayment(order, lockedPayment, transaction);
          orderStatus = applied.orderStatus;
          shouldNotify = applied.notify;
        }
      } else if (
        taloPayment.payment_status === 'OVERPAID' ||
        taloPayment.payment_status === 'UNDERPAID'
      ) {
        if (order.status === 'pending_payment' || order.status === 'payment_review') {
          await order.update({ status: 'payment_review' }, { transaction });
          await logEvent(
            order.id,
            'payment_review',
            transaction,
            {
              paymentStatus: taloPayment.payment_status,
              expectedAmountArs: order.totalAmountArs,
              receivedAmountArs: taloPayment.price.amount,
            },
            null
          );
          orderStatus = 'payment_review';
          shouldNotify = 'review';
        }
      } else if (taloPayment.payment_status === 'EXPIRED') {
        if (order.status === 'pending_payment') {
          await order.update({ status: 'expired' }, { transaction });
          await logEvent(order.id, 'payment_expired', transaction, {}, null);
          orderStatus = 'expired';
          shouldNotify = 'expired';
        }
      }

      await PaymentEvent.create(
        {
          paymentId: lockedPayment.id,
          providerPaymentId,
          eventKey,
          eventType: `talo.payment.${taloPayment.payment_status.toLowerCase()}`,
          payload: {
            paymentId: taloPayment.id,
            paymentStatus: taloPayment.payment_status,
            amountArs: taloPayment.price.amount,
            externalId: taloPayment.external_id ?? null,
            webhook: payload,
          },
          processedAt: new Date(),
        },
        { transaction }
      );

      notify = shouldNotify;

      return {
        status: taloPayment.payment_status,
        orderId: order.id,
        duplicate: false,
        orderStatus,
      };
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
      return {
        status: taloPayment.payment_status,
        orderId: payment.orderId,
        duplicate: true,
        orderStatus: '',
      };
    }
    throw error;
  }

  if (result && notify) {
    const order = await Order.findByPk(result.orderId);

    if (order) {
      if (notify === 'paid') {
        await notifyPaymentConfirmed(order);
      } else if (notify === 'review') {
        await notifyPaymentReview(order);
      } else if (notify === 'expired') {
        await notifyPaymentExpired(order);
      }
    }
  }

  return result;
}

export async function handleTaloWebhook(payload: Record<string, unknown>): Promise<void> {
  const paymentId = typeof payload.paymentId === 'string' ? payload.paymentId : null;
  const externalId = typeof payload.externalId === 'string' ? payload.externalId : null;

  if (!paymentId) {
    logger.warn('Webhook de Talo sin paymentId');
    return;
  }

  let payment = await Payment.findOne({ where: { providerPaymentId: paymentId } });

  if (!payment && externalId) {
    const order = await Order.findByPk(externalId);

    if (order) {
      payment = await Payment.findOne({ where: { orderId: order.id } });
    }
  }

  if (!payment) {
    logger.warn('Webhook de Talo sin pago local', { paymentId, externalId });
    return;
  }

  await processTaloPayment(payment.providerPaymentId, payload);
}

async function markPaymentExpired(payment: Payment): Promise<void> {
  const orderExpired = await sequelize.transaction(async (transaction) => {
    const lockedPayment = await Payment.findByPk(payment.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const order = await Order.findByPk(payment.orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lockedPayment || !order || lockedPayment.status !== 'PENDING') {
      return false;
    }

    await lockedPayment.update({ status: 'EXPIRED' }, { transaction });

    let expired = false;

    if (order.status === 'pending_payment') {
      await order.update({ status: 'expired' }, { transaction });
      await logEvent(order.id, 'payment_expired', transaction, {}, null);
      expired = true;
    }

    await PaymentEvent.create(
      {
        paymentId: lockedPayment.id,
        providerPaymentId: lockedPayment.providerPaymentId,
        eventKey: `${lockedPayment.providerPaymentId}:EXPIRED`,
        eventType: 'talo.payment.expired',
        payload: { paymentId: lockedPayment.providerPaymentId, paymentStatus: 'EXPIRED' },
        processedAt: new Date(),
      },
      { transaction }
    );

    return expired;
  });

  if (orderExpired) {
    const order = await Order.findByPk(payment.orderId);

    if (order) {
      await notifyPaymentExpired(order);
    }
  }
}

export async function expirePendingPayments(): Promise<void> {
  const payments = await Payment.findAll({
    where: {
      status: 'PENDING',
      expiresAt: { [Op.lt]: new Date() },
    },
    limit: 50,
  });

  for (const payment of payments) {
    try {
      const taloPayment = await getTaloPayment(payment.providerPaymentId);

      if (taloPayment.payment_status !== 'PENDING') {
        await processTaloPayment(payment.providerPaymentId);
        continue;
      }
    } catch (error) {
      logger.warn('No se pudo verificar el pago vencido en Talo', {
        providerPaymentId: payment.providerPaymentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await markPaymentExpired(payment);
  }
}

export async function simulateOrderPayment(
  orderId: string,
  userId: string
): Promise<ProcessResult | null> {
  if (isProduction || !taloBaseUrl().includes('sandbox')) {
    throw new AppError('La simulación de pagos solo está disponible en desarrollo.', 403);
  }

  const order = await Order.findByPk(orderId);

  if (!order || order.buyerId !== userId) {
    throw new AppError('No encontramos esa compra.', 404);
  }

  if (order.status !== 'pending_payment') {
    throw new AppError('Esta compra ya no admite un pago simulado.', 409);
  }

  const payment = await Payment.findOne({ where: { orderId } });

  if (!payment || payment.status !== 'PENDING' || !payment.cvu) {
    throw new AppError('No hay un pago pendiente para simular.', 409);
  }

  await simulateTaloTransfer(payment.cvu, payment.amountArs);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await processTaloPayment(payment.providerPaymentId);

    if (result && result.status !== 'PENDING') {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  return null;
}

export function decryptDeliveryCode(payload: string): string {
  return decryptString(payload);
}

export function deliveryCodeExpiry(order: Order): Date {
  const deliveredAt = order.deliveredAt ?? new Date();
  return new Date(deliveredAt.getTime() + DEFAULTS.claimWindowHours * 60 * 60 * 1000);
}
