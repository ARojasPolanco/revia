import { Op } from 'sequelize';
import type { Includeable, Transaction } from 'sequelize';
import { DEFAULTS, DISPUTE_REASON_LABELS, type DisputeReason } from '@revia/shared';
import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { createTaloRefund } from '../../config/talo.js';
import { AppError } from '../../errors/appError.js';
import { toPublicUser, type PublicUser } from '../auth/auth.service.js';
import { Coupon } from '../coupons/coupon.model.js';
import { issueCouponForUser } from '../coupons/coupons.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import { Order } from '../orders/order.model.js';
import { OrderEvent } from '../orders/orderEvent.model.js';
import {
  ensurePayoutForOrder,
  blockPayoutForOrder,
  refreshPayoutBlockForOrder,
  voidPayoutForOrder,
} from '../payouts/payoutRecords.service.js';
import { verifySellerFirstSale } from '../orders/orders.service.js';
import { Payment } from '../payments/payment.model.js';
import { Refund } from '../payments/refund.model.js';
import { User } from '../users/user.model.js';
import { Dispute } from './dispute.model.js';
import { DisputeEvent } from './disputeEvent.model.js';
import { DisputeEvidence } from './disputeEvidence.model.js';

export interface DisputeEventView {
  id: string;
  type: string;
  actor: PublicUser | null;
  message: string | null;
  data: Record<string, unknown>;
  createdAt: Date;
}

export interface DisputeEvidenceView {
  id: string;
  uploader: PublicUser | null;
  kind: string;
  url: string | null;
  body: string | null;
  createdAt: Date;
}

export interface DisputeRefundView {
  id: string;
  refundType: string;
  amountArs: number;
  status: string;
  providerRefundId: string | null;
  createdAt: Date;
}

export interface DisputeCouponView {
  id: string;
  code: string;
  amountArs: number;
  status: string;
  expiresAt: Date;
}

export interface DisputeView {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  reasonLabel: string;
  description: string;
  resolutionNotes: string | null;
  slaDueAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  buyer: PublicUser | null;
  seller: PublicUser | null;
  resolver: PublicUser | null;
  order: {
    id: string;
    title: string;
    status: string;
    itemPriceArs: number;
    totalAmountArs: number;
    sellerPayoutArs: number;
    deliveredAt: Date | null;
    completedAt: Date | null;
    claimWindowEndsAt: Date | null;
  };
  events: DisputeEventView[];
  evidence: DisputeEvidenceView[];
  refund: DisputeRefundView | null;
  coupon: DisputeCouponView | null;
}

type DisputeWithRelations = Dispute & {
  buyer?: User | null;
  seller?: User | null;
  resolver?: User | null;
  order?: (Order & { refunds?: Refund[] }) | null;
  coupon?: Coupon | null;
  events?: (DisputeEvent & { actor?: User | null })[];
  evidence?: (DisputeEvidence & { uploader?: User | null })[];
};

const userAttributes = [
  'id',
  'fullName',
  'bio',
  'location',
  'avatarUrl',
  'sellerVerifiedAt',
  'createdAt',
];

const disputeIncludes: Includeable[] = [
  {
    model: Order,
    as: 'order',
    attributes: [
      'id',
      'listingTitleSnapshot',
      'status',
      'itemPriceArs',
      'totalAmountArs',
      'sellerPayoutArs',
      'deliveredAt',
      'completedAt',
      'claimWindowEndsAt',
    ],
    include: [
      {
        model: Refund,
        as: 'refunds',
        required: false,
        separate: true,
        order: [['createdAt', 'DESC']],
        limit: 1,
      },
    ],
  },
  { model: User, as: 'buyer', attributes: userAttributes },
  { model: User, as: 'seller', attributes: userAttributes },
  { model: User, as: 'resolver', attributes: userAttributes },
  { model: Coupon, as: 'coupon', required: false },
  {
    model: DisputeEvent,
    as: 'events',
    required: false,
    separate: true,
    order: [['createdAt', 'ASC']],
    include: [{ model: User, as: 'actor', attributes: userAttributes }],
  },
  {
    model: DisputeEvidence,
    as: 'evidence',
    required: false,
    separate: true,
    order: [['createdAt', 'ASC']],
    include: [{ model: User, as: 'uploader', attributes: userAttributes }],
  },
];

function toDisputeView(dispute: Dispute): DisputeView {
  const related = dispute as DisputeWithRelations;
  const latestRefund = related.order?.refunds?.[0];

  return {
    id: dispute.id,
    orderId: dispute.orderId,
    status: dispute.status,
    reason: dispute.reason,
    reasonLabel: DISPUTE_REASON_LABELS[dispute.reason as DisputeReason] ?? dispute.reason,
    description: dispute.description,
    resolutionNotes: dispute.resolutionNotes,
    slaDueAt: dispute.slaDueAt,
    resolvedAt: dispute.resolvedAt,
    createdAt: dispute.createdAt,
    buyer: related.buyer ? toPublicUser(related.buyer) : null,
    seller: related.seller ? toPublicUser(related.seller) : null,
    resolver: related.resolver ? toPublicUser(related.resolver) : null,
    order: {
      id: dispute.orderId,
      title: related.order?.listingTitleSnapshot ?? 'Orden de REVIA',
      status: related.order?.status ?? 'disputed',
      itemPriceArs: related.order?.itemPriceArs ?? 0,
      totalAmountArs: related.order?.totalAmountArs ?? 0,
      sellerPayoutArs: related.order?.sellerPayoutArs ?? 0,
      deliveredAt: related.order?.deliveredAt ?? null,
      completedAt: related.order?.completedAt ?? null,
      claimWindowEndsAt: related.order?.claimWindowEndsAt ?? null,
    },
    events: (related.events ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor ? toPublicUser(event.actor) : null,
      message: event.message,
      data: event.data,
      createdAt: event.createdAt,
    })),
    evidence: (related.evidence ?? []).map((item) => ({
      id: item.id,
      uploader: item.uploader ? toPublicUser(item.uploader) : null,
      kind: item.kind,
      url: item.url,
      body: item.body,
      createdAt: item.createdAt,
    })),
    refund: latestRefund
      ? {
          id: latestRefund.id,
          refundType: latestRefund.refundType,
          amountArs: latestRefund.amountArs,
          status: latestRefund.status,
          providerRefundId: latestRefund.providerRefundId,
          createdAt: latestRefund.createdAt,
        }
      : null,
    coupon: related.coupon
      ? {
          id: related.coupon.id,
          code: related.coupon.code,
          amountArs: related.coupon.amountArs,
          status: related.coupon.status,
          expiresAt: related.coupon.expiresAt,
        }
      : null,
  };
}

function isStaff(role: string): boolean {
  return role === 'support' || role === 'admin';
}

function assertParticipant(dispute: Dispute, userId: string, role: string): void {
  if (!isStaff(role) && dispute.buyerId !== userId && dispute.sellerId !== userId) {
    throw new AppError('No encontramos esa disputa.', 404);
  }
}

async function findDisputeWithRelations(disputeId: string): Promise<Dispute | null> {
  return Dispute.findByPk(disputeId, { include: disputeIncludes });
}

async function addDisputeEvent(
  disputeId: string,
  type: string,
  actorId: string | null,
  message: string | null,
  data: Record<string, unknown> = {},
  transaction?: Transaction
): Promise<void> {
  await DisputeEvent.create({ disputeId, type, actorId, message, data }, { transaction });
}

async function addOrderEvent(
  orderId: string,
  type: string,
  actorId: string | null,
  data: Record<string, unknown> = {},
  transaction?: Transaction
): Promise<void> {
  await OrderEvent.create({ orderId, type, actorId, data }, { transaction });
}

async function notifyDisputeOpened(dispute: Dispute, order: Order): Promise<void> {
  await createNotification({
    userId: dispute.sellerId,
    type: 'dispute_opened',
    title: 'Nueva disputa',
    body: `El comprador abrió una disputa por "${order.listingTitleSnapshot}". Podés responder y aportar evidencia.`,
    data: { disputeId: dispute.id, orderId: order.id, role: 'seller' },
  });
}

async function notifyDisputeUpdated(
  dispute: Dispute,
  recipientId: string,
  body: string
): Promise<void> {
  await createNotification({
    userId: recipientId,
    type: 'dispute_updated',
    title: 'Actualización de la disputa',
    body,
    data: { disputeId: dispute.id, orderId: dispute.orderId },
  });
}

async function notifyDisputeResolved(
  dispute: Dispute,
  order: Order,
  title: string,
  body: string
): Promise<void> {
  await Promise.all([
    createNotification({
      userId: dispute.buyerId,
      type: 'dispute_resolved',
      title,
      body,
      data: { disputeId: dispute.id, orderId: order.id, role: 'buyer' },
    }),
    createNotification({
      userId: dispute.sellerId,
      type: 'dispute_resolved',
      title,
      body,
      data: { disputeId: dispute.id, orderId: order.id, role: 'seller' },
    }),
  ]);
}

export async function getDisputeView(
  userId: string,
  role: string,
  disputeId: string
): Promise<DisputeView> {
  const dispute = await findDisputeWithRelations(disputeId);

  if (!dispute) {
    throw new AppError('No encontramos esa disputa.', 404);
  }

  assertParticipant(dispute, userId, role);

  return toDisputeView(dispute);
}

export async function listMyDisputes(userId: string): Promise<DisputeView[]> {
  const disputes = await Dispute.findAll({
    where: { [Op.or]: [{ buyerId: userId }, { sellerId: userId }] },
    include: disputeIncludes,
    order: [['createdAt', 'DESC']],
  });

  return disputes.map(toDisputeView);
}

export async function listAdminDisputes(status?: string): Promise<DisputeView[]> {
  const disputes = await Dispute.findAll({
    where: status ? { status } : {},
    include: disputeIncludes,
    order: [['createdAt', 'DESC']],
  });

  return disputes.map(toDisputeView);
}

export async function openDispute(
  buyerId: string,
  orderId: string,
  input: { reason: string; description: string }
): Promise<DisputeView> {
  const dispute = await sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order || order.buyerId !== buyerId) {
      throw new AppError('No encontramos esa compra.', 404);
    }

    if (order.status !== 'delivered') {
      throw new AppError('Solo podés abrir una disputa después de recibir la orden.', 409);
    }

    const claimWindowEndsAt =
      order.claimWindowEndsAt ??
      (order.deliveredAt
        ? new Date(order.deliveredAt.getTime() + DEFAULTS.claimWindowHours * 60 * 60 * 1000)
        : null);

    if (!claimWindowEndsAt || claimWindowEndsAt.getTime() < Date.now()) {
      throw new AppError('El plazo de 48 horas para abrir una disputa venció.', 409);
    }

    const existing = await Dispute.findOne({ where: { orderId }, transaction });

    if (existing) {
      throw new AppError('Ya existe una disputa para esta orden.', 409);
    }

    const created = await Dispute.create(
      {
        orderId,
        buyerId,
        sellerId: order.sellerId,
        reason: input.reason,
        description: input.description,
        status: 'open',
        slaDueAt: new Date(Date.now() + DEFAULTS.disputeSlaHours * 60 * 60 * 1000),
      },
      { transaction }
    );

    await order.update({ status: 'disputed' }, { transaction });
    await addOrderEvent(order.id, 'dispute_opened', buyerId, {}, transaction);
    await addDisputeEvent(
      created.id,
      'opened',
      buyerId,
      input.description,
      { reason: input.reason },
      transaction
    );

    return created;
  });

  const order = await Order.findByPk(orderId);

  if (order) {
    await blockPayoutForOrder(orderId, 'dispute_open', buyerId);
    await notifyDisputeOpened(dispute, order);
  }

  return getDisputeView(buyerId, 'user', dispute.id);
}

export async function addDisputeMessage(
  userId: string,
  role: string,
  disputeId: string,
  body: string
): Promise<DisputeView> {
  const dispute = await Dispute.findByPk(disputeId);

  if (!dispute) {
    throw new AppError('No encontramos esa disputa.', 404);
  }

  assertParticipant(dispute, userId, role);

  if (
    ['resolved_refund', 'resolved_coupon', 'resolved_rejected', 'cancelled'].includes(
      dispute.status
    )
  ) {
    throw new AppError('La disputa ya está cerrada.', 409);
  }

  await addDisputeEvent(disputeId, 'message', userId, body);
  await dispute.update({ status: 'under_review' });

  const recipientId = userId === dispute.buyerId ? dispute.sellerId : dispute.buyerId;

  await notifyDisputeUpdated(dispute, recipientId, body.slice(0, 300));

  return getDisputeView(userId, role, disputeId);
}

export async function addDisputeEvidence(
  userId: string,
  role: string,
  disputeId: string,
  input: { kind: string; url?: string; body?: string }
): Promise<DisputeView> {
  const dispute = await Dispute.findByPk(disputeId);

  if (!dispute) {
    throw new AppError('No encontramos esa disputa.', 404);
  }

  assertParticipant(dispute, userId, role);

  if (
    ['resolved_refund', 'resolved_coupon', 'resolved_rejected', 'cancelled'].includes(
      dispute.status
    )
  ) {
    throw new AppError('La disputa ya está cerrada.', 409);
  }

  await DisputeEvidence.create({
    disputeId,
    uploaderId: userId,
    kind: input.kind,
    url: input.url ?? null,
    body: input.body ?? null,
  });
  await addDisputeEvent(disputeId, 'evidence', userId, input.body ?? null, {
    kind: input.kind,
    url: input.url ?? null,
  });
  await dispute.update({ status: 'under_review' });

  const recipientId = userId === dispute.buyerId ? dispute.sellerId : dispute.buyerId;
  await notifyDisputeUpdated(dispute, recipientId, 'Se agregó nueva evidencia a la disputa.');

  return getDisputeView(userId, role, disputeId);
}

export async function sellerDisputeOffer(
  userId: string,
  disputeId: string,
  input: { type: 'partial_refund' | 'cover_return'; amountArs?: number }
): Promise<DisputeView> {
  const dispute = await Dispute.findByPk(disputeId);

  if (!dispute || dispute.sellerId !== userId) {
    throw new AppError('No encontramos esa disputa.', 404);
  }

  if (
    ['resolved_refund', 'resolved_coupon', 'resolved_rejected', 'cancelled'].includes(
      dispute.status
    )
  ) {
    throw new AppError('La disputa ya está cerrada.', 409);
  }

  await addDisputeEvent(disputeId, 'seller_offer', userId, null, {
    type: input.type,
    amountArs: input.amountArs ?? null,
  });
  await dispute.update({ status: 'under_review' });
  await notifyDisputeUpdated(
    dispute,
    dispute.buyerId,
    input.type === 'partial_refund'
      ? `El vendedor ofreció un reembolso parcial de ${input.amountArs ?? 0} ARS.`
      : 'El vendedor ofreció cubrir el envío de devolución.'
  );

  return getDisputeView(userId, 'user', disputeId);
}

export async function resolveDispute(
  actorId: string,
  disputeId: string,
  input: {
    resolution: 'refund_money' | 'refund_coupon' | 'reject';
    notes?: string;
    amountArs?: number;
  }
): Promise<DisputeView> {
  const dispute = await Dispute.findByPk(disputeId);
  const order = await Order.findByPk(dispute?.orderId ?? '');

  if (!dispute || !order) {
    throw new AppError('No encontramos esa disputa.', 404);
  }

  if (
    ['resolved_refund', 'resolved_coupon', 'resolved_rejected', 'cancelled'].includes(
      dispute.status
    )
  ) {
    throw new AppError('Esta disputa ya fue resuelta.', 409);
  }

  if (input.resolution === 'refund_money') {
    const payment = await Payment.findOne({
      where: { orderId: order.id, status: 'SUCCESS' },
      order: [['createdAt', 'DESC']],
    });

    if (!payment) {
      throw new AppError('No encontramos un pago acreditado para reembolsar.', 409);
    }

    const pendingRefund = await Refund.findOne({
      where: { paymentId: payment.id, status: 'PENDING' },
    });

    if (pendingRefund) {
      throw new AppError('Ya hay un reembolso pendiente para esta orden.', 409);
    }

    const amountArs = input.amountArs ?? order.totalAmountArs;

    if (!Number.isInteger(amountArs) || amountArs <= 0 || amountArs > order.totalAmountArs) {
      throw new AppError('El monto del reembolso no es válido.', 422);
    }

    const refundType = amountArs === order.totalAmountArs ? 'FULL' : 'PARTIAL';
    let taloPayment;

    try {
      taloPayment = await createTaloRefund(
        payment.providerPaymentId,
        refundType === 'FULL' ? { type: 'FULL' } : { type: 'PARTIAL', amountArs }
      );
    } catch (error) {
      logger.error('No se pudo crear el reembolso en Talo', {
        disputeId,
        orderId: order.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError('No pudimos iniciar el reembolso. Intentá nuevamente.', 503);
    }

    const taloRefund = taloPayment.refunds?.[taloPayment.refunds.length - 1];

    if (!taloRefund) {
      throw new AppError('Talo no devolvió el reembolso creado.', 503);
    }

    await sequelize.transaction(async (transaction) => {
      const lockedDispute = await Dispute.findByPk(disputeId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const lockedOrder = await Order.findByPk(order.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!lockedDispute || !lockedOrder) {
        throw new AppError('No encontramos esa disputa.', 404);
      }

      await Refund.create(
        {
          orderId: lockedOrder.id,
          paymentId: payment.id,
          providerRefundId: taloRefund.refund_id,
          refundType,
          amountArs,
          currency: 'ARS',
          status: taloRefund.refund_status,
          reason: input.notes ?? null,
          requestedBy: actorId,
        },
        { transaction }
      );

      await lockedDispute.update(
        {
          status: 'resolved_refund',
          resolutionNotes: input.notes ?? null,
          resolvedBy: actorId,
          resolvedAt: new Date(),
        },
        { transaction }
      );
      await lockedOrder.update({ status: 'refunded' }, { transaction });
      await addOrderEvent(lockedOrder.id, 'order_refunded', actorId, { amountArs }, transaction);
      await addDisputeEvent(
        lockedDispute.id,
        'resolved_refund',
        actorId,
        input.notes ?? null,
        { amountArs, refundType },
        transaction
      );
    });

    await voidPayoutForOrder(order.id, 'refund_pending', actorId);
    await notifyDisputeResolved(
      dispute,
      order,
      'Disputa resuelta',
      amountArs === order.totalAmountArs
        ? 'Se aprobó el reembolso total. El dinero se está procesando.'
        : `Se aprobó un reembolso de ${amountArs} ARS.`
    );

    return getDisputeView(actorId, 'admin', disputeId);
  }

  if (input.resolution === 'refund_coupon') {
    await sequelize.transaction(async (transaction) => {
      const lockedDispute = await Dispute.findByPk(disputeId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const lockedOrder = await Order.findByPk(order.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!lockedDispute || !lockedOrder) {
        throw new AppError('No encontramos esa disputa.', 404);
      }

      const coupon = await issueCouponForUser(
        lockedOrder.buyerId,
        lockedOrder.itemPriceArs,
        transaction,
        lockedDispute.id
      );

      await lockedDispute.update(
        {
          status: 'resolved_coupon',
          resolutionNotes: input.notes ?? null,
          resolvedBy: actorId,
          resolvedAt: new Date(),
        },
        { transaction }
      );
      await lockedOrder.update({ status: 'refunded' }, { transaction });
      await addOrderEvent(lockedOrder.id, 'order_refunded', actorId, {}, transaction);
      await addDisputeEvent(
        lockedDispute.id,
        'resolved_coupon',
        actorId,
        input.notes ?? null,
        { couponCode: coupon.code, amountArs: coupon.amountArs },
        transaction
      );
    });

    await voidPayoutForOrder(order.id, 'order_refunded', actorId);
    await notifyDisputeResolved(
      dispute,
      order,
      'Disputa resuelta con cupón',
      `Se emitió un cupón por ${order.itemPriceArs} ARS para tu próxima compra.`
    );

    return getDisputeView(actorId, 'admin', disputeId);
  }

  await sequelize.transaction(async (transaction) => {
    const lockedDispute = await Dispute.findByPk(disputeId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const lockedOrder = await Order.findByPk(order.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lockedDispute || !lockedOrder) {
      throw new AppError('No encontramos esa disputa.', 404);
    }

    const now = new Date();
    await lockedOrder.update(
      {
        status: 'completed',
        completedAt: now,
        claimWindowEndsAt: now,
      },
      { transaction }
    );
    await verifySellerFirstSale(lockedOrder.sellerId, lockedOrder.id, transaction);
    await ensurePayoutForOrder(lockedOrder, transaction);
    await lockedDispute.update(
      {
        status: 'resolved_rejected',
        resolutionNotes: input.notes ?? null,
        resolvedBy: actorId,
        resolvedAt: now,
      },
      { transaction }
    );
    await addOrderEvent(lockedOrder.id, 'dispute_rejected', actorId, {}, transaction);
    await addDisputeEvent(
      lockedDispute.id,
      'resolved_rejected',
      actorId,
      input.notes ?? null,
      {},
      transaction
    );
  });

  await refreshPayoutBlockForOrder(order.id);
  await notifyDisputeResolved(
    dispute,
    order,
    'Disputa rechazada',
    'Revisamos la disputa y no encontramos fundamentos para el reembolso.'
  );

  return getDisputeView(actorId, 'admin', disputeId);
}
