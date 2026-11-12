import { Op } from 'sequelize';
import type { Includeable, Transaction, WhereOptions } from 'sequelize';
import { DEFAULTS, PAYOUT_BLOCK_REASON_LABELS, type PayoutBlockReason } from '@revia/shared';
import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { getTaloPayment } from '../../config/talo.js';
import { AppError } from '../../errors/appError.js';
import { addBusinessDays } from '../../utils/businessDays.js';
import { decryptString } from '../../utils/encryption.js';
import { toPublicUser, type PublicUser } from '../auth/auth.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import { Order } from '../orders/order.model.js';
import { Payment } from '../payments/payment.model.js';
import { Refund } from '../payments/refund.model.js';
import { processTaloPayment } from '../payments/payments.service.js';
import { User } from '../users/user.model.js';
import { Payout } from './payout.model.js';
import { PayoutAccount } from './payoutAccount.model.js';
import { PayoutEvent } from './payoutEvent.model.js';
import { maskPayoutAccount } from './payouts.service.js';

const PAYOUT_SLA_BUSINESS_DAYS = Math.max(1, Math.ceil(DEFAULTS.payoutSlaBusinessHours / 24));

export interface PayoutAccountView {
  method: string;
  accountMasked: string;
  accountFull?: string;
  holderName: string;
  holderMatchesKyc: boolean;
  status: string;
}

export interface PayoutEventView {
  id: string;
  type: string;
  actor: PublicUser | null;
  data: Record<string, unknown>;
  createdAt: Date;
}

export interface PayoutView {
  id: string;
  orderId: string;
  amountArs: number;
  status: string;
  blockReason: PayoutBlockReason | null;
  blockReasonLabel: string | null;
  operationId: string | null;
  receiptUrl: string | null;
  receiptAvailable: boolean;
  slaDueAt: Date;
  paidAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  order: {
    id: string;
    title: string;
    completedAt: Date | null;
  };
  seller: PublicUser | null;
  account: PayoutAccountView | null;
  events: PayoutEventView[];
}

export interface PayoutSummaryView {
  pendingCount: number;
  pendingAmountArs: number;
  processingCount: number;
  processingAmountArs: number;
  paidCount: number;
  paidAmountArs: number;
  failedCount: number;
  blockedCount: number;
  overdueCount: number;
  nextDueAt: Date | null;
}

export interface PlatformEarningsView {
  totalTasaArs: number;
  monthTasaArs: number;
  totalOrders: number;
  monthOrders: number;
  averageTasaArs: number;
  lastOrders: {
    id: string;
    title: string;
    completedAt: Date | null;
    itemPriceArs: number;
    totalAmountArs: number;
    tasaAmountArs: number;
  }[];
}

export interface ReconciliationResult {
  checked: number;
  updated: number;
  mismatches: {
    providerPaymentId: string;
    localStatus: string;
    remoteStatus: string | null;
    error?: string;
  }[];
}

type PayoutWithRelations = Payout & {
  order?: Order | null;
  seller?: User | null;
  account?: PayoutAccount | null;
  events?: (PayoutEvent & { actor?: User | null })[];
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

const payoutIncludes: Includeable[] = [
  {
    model: Order,
    as: 'order',
    attributes: ['id', 'listingTitleSnapshot', 'completedAt', 'status', 'totalAmountArs'],
  },
  { model: User, as: 'seller', attributes: userAttributes },
  { model: PayoutAccount, as: 'account', required: false },
  {
    model: PayoutEvent,
    as: 'events',
    required: false,
    separate: true,
    order: [['createdAt', 'ASC']],
    include: [{ model: User, as: 'actor', attributes: userAttributes }],
  },
];

function addPayoutEvent(
  payoutId: string,
  type: string,
  actorId: string | null,
  data: Record<string, unknown> = {},
  transaction?: Transaction
): Promise<PayoutEvent> {
  return PayoutEvent.create({ payoutId, type, actorId, data }, { transaction });
}

function accountView(
  account: PayoutAccount | null | undefined,
  revealFull = false
): PayoutAccountView | null {
  if (!account) {
    return null;
  }

  try {
    const raw = decryptString(account.accountEncrypted);

    return {
      method: account.method,
      accountMasked: maskPayoutAccount(account.method, raw),
      ...(revealFull ? { accountFull: raw } : {}),
      holderName: account.holderName,
      holderMatchesKyc: account.holderMatchesKyc,
      status: account.status,
    };
  } catch {
    return null;
  }
}

function toPayoutView(payout: Payout, revealAccount = false): PayoutView {
  const related = payout as PayoutWithRelations;
  const blockReason = (payout.blockReason as PayoutBlockReason | null) ?? null;

  return {
    id: payout.id,
    orderId: payout.orderId,
    amountArs: payout.amountArs,
    status: payout.status,
    blockReason,
    blockReasonLabel: blockReason ? PAYOUT_BLOCK_REASON_LABELS[blockReason] : null,
    operationId: payout.operationId,
    receiptUrl: payout.receiptUrl,
    receiptAvailable: payout.status === 'paid' && Boolean(payout.paidAt),
    slaDueAt: payout.slaDueAt,
    paidAt: payout.paidAt,
    failedAt: payout.failedAt,
    failureReason: payout.failureReason,
    createdAt: payout.createdAt,
    order: {
      id: payout.orderId,
      title: related.order?.listingTitleSnapshot ?? 'Venta de REVIA',
      completedAt: related.order?.completedAt ?? null,
    },
    seller: related.seller ? toPublicUser(related.seller) : null,
    account: accountView(related.account, revealAccount),
    events: (related.events ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor ? toPublicUser(event.actor) : null,
      data: event.data,
      createdAt: event.createdAt,
    })),
  };
}

async function findPayoutView(payoutId: string): Promise<PayoutView> {
  const payout = await Payout.findByPk(payoutId, { include: payoutIncludes });

  if (!payout) {
    throw new AppError('No encontramos ese payout.', 404);
  }

  return toPayoutView(payout);
}

async function loadBlockContext(
  order: Order,
  transaction?: Transaction
): Promise<{
  seller: User | null;
  account: PayoutAccount | null;
  pendingRefund: Refund | null;
}> {
  const seller = await User.findByPk(order.sellerId, { transaction });
  const account = await PayoutAccount.findOne({
    where: { userId: order.sellerId },
    transaction,
  });
  const pendingRefund = await Refund.findOne({
    where: { orderId: order.id, status: 'PENDING' },
    transaction,
  });

  return { seller, account, pendingRefund };
}

function resolveBlockReason(
  order: Order,
  seller: User | null,
  account: PayoutAccount | null,
  pendingRefund: Refund | null
): PayoutBlockReason | null {
  if (!seller) {
    return 'seller_missing';
  }

  if (seller.isDeleted) {
    return 'seller_unavailable';
  }

  if (seller.kycStatus !== 'approved') {
    return 'kyc_not_approved';
  }

  if (order.status === 'disputed') {
    return 'dispute_open';
  }

  if (order.status === 'refunded') {
    return 'order_refunded';
  }

  if (order.status === 'cancelled' || order.status === 'expired') {
    return 'order_cancelled';
  }

  if (pendingRefund) {
    return 'refund_pending';
  }

  if (!account) {
    return 'payout_account_missing';
  }

  if (account.status !== 'active') {
    return 'payout_account_pending_review';
  }

  if (!account.holderMatchesKyc) {
    return 'holder_mismatch';
  }

  return null;
}

export async function ensurePayoutForOrder(
  order: Order,
  transaction?: Transaction
): Promise<Payout> {
  const existing = await Payout.findOne({ where: { orderId: order.id }, transaction });

  if (existing) {
    return existing;
  }

  const { seller, account, pendingRefund } = await loadBlockContext(order, transaction);
  const blockReason = resolveBlockReason(order, seller, account, pendingRefund);
  const completedAt = order.completedAt ?? new Date();
  let payout: Payout;

  try {
    payout = await Payout.create(
      {
        orderId: order.id,
        sellerId: order.sellerId,
        payoutAccountId: account?.id ?? null,
        amountArs: order.sellerPayoutArs,
        status: 'pending',
        blockReason,
        slaDueAt: addBusinessDays(completedAt, PAYOUT_SLA_BUSINESS_DAYS),
      },
      { transaction }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
      const existing = await Payout.findOne({ where: { orderId: order.id }, transaction });

      if (existing) {
        return existing;
      }
    }

    throw error;
  }

  await addPayoutEvent(
    payout.id,
    'payout_created',
    null,
    { amountArs: payout.amountArs, blockReason },
    transaction
  );

  return payout;
}

async function ensurePayoutsForOrders(orders: Order[]): Promise<void> {
  for (const order of orders) {
    await ensurePayoutForOrder(order);
  }
}

async function ensurePayoutsForSeller(sellerId: string): Promise<void> {
  const orders = await Order.findAll({
    where: {
      sellerId,
      status: { [Op.in]: ['completed', 'payout_pending', 'paid_out', 'disputed'] },
      completedAt: { [Op.not]: null },
    },
    order: [['completedAt', 'ASC']],
    limit: 200,
  });

  await ensurePayoutsForOrders(orders);
}

async function ensurePayoutsForCompletedOrders(): Promise<void> {
  const orders = await Order.findAll({
    where: {
      status: { [Op.in]: ['completed', 'payout_pending', 'paid_out', 'disputed'] },
      completedAt: { [Op.not]: null },
    },
    order: [['completedAt', 'ASC']],
    limit: 200,
  });

  await ensurePayoutsForOrders(orders);
}

async function refreshPayoutBlock(payout: Payout): Promise<PayoutBlockReason | null> {
  const order = await Order.findByPk(payout.orderId);

  if (!order) {
    return 'seller_missing';
  }

  const { seller, account, pendingRefund } = await loadBlockContext(order);
  const blockReason = resolveBlockReason(order, seller, account, pendingRefund);

  const updates: { blockReason: string | null; payoutAccountId?: string } = { blockReason };

  if (account && payout.payoutAccountId !== account.id) {
    updates.payoutAccountId = account.id;
  }

  if (payout.blockReason !== blockReason || updates.payoutAccountId) {
    await payout.update(updates);
  }

  return blockReason;
}

async function refreshPendingBlocks(payouts: Payout[]): Promise<void> {
  for (const payout of payouts) {
    if (payout.status === 'pending' || payout.status === 'processing') {
      await refreshPayoutBlock(payout);
    }
  }
}

export async function listSellerPayouts(userId: string): Promise<PayoutView[]> {
  await ensurePayoutsForSeller(userId);
  const payouts = await Payout.findAll({
    where: { sellerId: userId },
    include: payoutIncludes,
    order: [['createdAt', 'DESC']],
    limit: 100,
  });

  await refreshPendingBlocks(payouts);

  const refreshed = await Payout.findAll({
    where: { sellerId: userId },
    include: payoutIncludes,
    order: [['createdAt', 'DESC']],
    limit: 100,
  });

  return refreshed.map((payout) => toPayoutView(payout));
}

export async function getSellerSummary(userId: string): Promise<PayoutSummaryView> {
  await ensurePayoutsForSeller(userId);
  const payouts = await Payout.findAll({ where: { sellerId: userId } });

  return summarize(payouts);
}

export async function listFinancePayouts(status?: string): Promise<PayoutView[]> {
  await ensurePayoutsForCompletedOrders();
  const payouts = await Payout.findAll({
    where: status ? { status } : {},
    include: payoutIncludes,
    order: [['createdAt', 'DESC']],
    limit: 200,
  });

  await refreshPendingBlocks(payouts);

  const refreshed = await Payout.findAll({
    where: status ? { status } : {},
    include: payoutIncludes,
    order: [['createdAt', 'DESC']],
    limit: 200,
  });

  return refreshed.map((payout) => toPayoutView(payout, true));
}

export async function getFinanceSummary(): Promise<PayoutSummaryView> {
  await ensurePayoutsForCompletedOrders();
  const payouts = await Payout.findAll();

  return summarize(payouts);
}

function startOfArtMonth(now: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;

  return new Date(`${year}-${month}-01T00:00:00-03:00`);
}

export async function getPlatformEarnings(): Promise<PlatformEarningsView> {
  const baseWhere: WhereOptions = {
    status: { [Op.in]: ['completed', 'payout_pending', 'paid_out'] },
    completedAt: { [Op.not]: null },
  };
  const monthStart = startOfArtMonth(new Date());
  const monthWhere: WhereOptions = {
    ...baseWhere,
    completedAt: { [Op.gte]: monthStart },
  };

  const [totalTasaArs, totalOrders, monthTasaArs, monthOrders, lastOrders] = await Promise.all([
    Order.sum('tasaAmountArs', { where: baseWhere }),
    Order.count({ where: baseWhere }),
    Order.sum('tasaAmountArs', { where: monthWhere }),
    Order.count({ where: monthWhere }),
    Order.findAll({
      where: baseWhere,
      attributes: [
        'id',
        'listingTitleSnapshot',
        'completedAt',
        'itemPriceArs',
        'totalAmountArs',
        'tasaAmountArs',
      ],
      order: [['completedAt', 'DESC']],
      limit: 10,
    }),
  ]);

  const total = Number(totalTasaArs ?? 0);
  const count = Number(totalOrders ?? 0);

  return {
    totalTasaArs: total,
    monthTasaArs: Number(monthTasaArs ?? 0),
    totalOrders: count,
    monthOrders: Number(monthOrders ?? 0),
    averageTasaArs: count > 0 ? Math.round(total / count) : 0,
    lastOrders: lastOrders.map((order) => ({
      id: order.id,
      title: order.listingTitleSnapshot,
      completedAt: order.completedAt,
      itemPriceArs: order.itemPriceArs,
      totalAmountArs: order.totalAmountArs,
      tasaAmountArs: order.tasaAmountArs,
    })),
  };
}

function summarize(payouts: Payout[]): PayoutSummaryView {
  const now = Date.now();
  const pending = payouts.filter((payout) => payout.status === 'pending');
  const processing = payouts.filter((payout) => payout.status === 'processing');
  const paid = payouts.filter((payout) => payout.status === 'paid');
  const failed = payouts.filter((payout) => payout.status === 'failed');
  const blocked = payouts.filter(
    (payout) =>
      (payout.status === 'pending' || payout.status === 'processing') && Boolean(payout.blockReason)
  );
  const overdue = payouts.filter(
    (payout) =>
      (payout.status === 'pending' || payout.status === 'processing') &&
      new Date(payout.slaDueAt).getTime() < now
  );
  const nextDue = payouts
    .filter((payout) => payout.status === 'pending' || payout.status === 'processing')
    .sort((left, right) => new Date(left.slaDueAt).getTime() - new Date(right.slaDueAt).getTime());

  return {
    pendingCount: pending.length,
    pendingAmountArs: pending.reduce((total, payout) => total + payout.amountArs, 0),
    processingCount: processing.length,
    processingAmountArs: processing.reduce((total, payout) => total + payout.amountArs, 0),
    paidCount: paid.length,
    paidAmountArs: paid.reduce((total, payout) => total + payout.amountArs, 0),
    failedCount: failed.length,
    blockedCount: blocked.length,
    overdueCount: overdue.length,
    nextDueAt: nextDue[0]?.slaDueAt ?? null,
  };
}

export async function markPayoutProcessing(userId: string, payoutId: string): Promise<PayoutView> {
  const payout = await sequelize.transaction(async (transaction) => {
    const locked = await Payout.findByPk(payoutId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!locked) {
      throw new AppError('No encontramos ese payout.', 404);
    }

    if (!['pending', 'failed'].includes(locked.status)) {
      throw new AppError('Este payout no se puede iniciar.', 409);
    }

    const order = await Order.findByPk(locked.orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      throw new AppError('No encontramos la orden del payout.', 404);
    }

    const { seller, account, pendingRefund } = await loadBlockContext(order, transaction);
    const blockReason = resolveBlockReason(order, seller, account, pendingRefund);

    if (blockReason) {
      await locked.update({ blockReason }, { transaction });
      await addPayoutEvent(locked.id, 'payout_blocked', userId, { blockReason }, transaction);
      throw new AppError(
        `No se puede procesar el payout: ${PAYOUT_BLOCK_REASON_LABELS[blockReason]}`,
        409
      );
    }

    await locked.update(
      {
        status: 'processing',
        blockReason: null,
        payoutAccountId: account?.id ?? locked.payoutAccountId,
        processedBy: userId,
        failureReason: null,
        failedAt: null,
      },
      { transaction }
    );

    if (order.status === 'completed') {
      await order.update({ status: 'payout_pending' }, { transaction });
    }

    await addPayoutEvent(locked.id, 'payout_processing', userId, {}, transaction);

    return locked;
  });

  await createNotification({
    userId: payout.sellerId,
    type: 'payout_processing',
    title: 'Payout en proceso',
    body: 'Estamos procesando tu payout. Te avisamos cuando se acredite.',
    data: { payoutId: payout.id, orderId: payout.orderId, role: 'seller' },
  });

  return findPayoutView(payout.id);
}

export async function markPayoutPaid(
  userId: string,
  payoutId: string,
  input: { operationId: string; receiptUrl?: string; note?: string }
): Promise<PayoutView> {
  const payout = await sequelize.transaction(async (transaction) => {
    const locked = await Payout.findByPk(payoutId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!locked) {
      throw new AppError('No encontramos ese payout.', 404);
    }

    if (locked.status !== 'processing') {
      throw new AppError('Primero tenés que iniciar el procesamiento del payout.', 409);
    }

    const order = await Order.findByPk(locked.orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      throw new AppError('No encontramos la orden del payout.', 404);
    }

    const { seller, account, pendingRefund } = await loadBlockContext(order, transaction);
    const blockReason = resolveBlockReason(order, seller, account, pendingRefund);

    if (blockReason) {
      await locked.update({ blockReason }, { transaction });
      await addPayoutEvent(locked.id, 'payout_blocked', userId, { blockReason }, transaction);
      throw new AppError(
        `No se puede pagar el payout: ${PAYOUT_BLOCK_REASON_LABELS[blockReason]}`,
        409
      );
    }

    const now = new Date();
    await locked.update(
      {
        status: 'paid',
        operationId: input.operationId,
        receiptUrl: input.receiptUrl ?? null,
        paidAt: now,
        failedAt: null,
        failureReason: null,
        processedBy: userId,
        blockReason: null,
        payoutAccountId: account?.id ?? locked.payoutAccountId,
      },
      { transaction }
    );

    await order.update({ status: 'paid_out' }, { transaction });

    await addPayoutEvent(
      locked.id,
      'payout_paid',
      userId,
      {
        operationId: input.operationId,
        receiptUrl: input.receiptUrl ?? null,
        note: input.note ?? null,
      },
      transaction
    );

    return locked;
  });

  await createNotification({
    userId: payout.sellerId,
    type: 'payout_sent',
    title: 'Payout enviado',
    body: `Transferimos ${payout.amountArs} ARS a tu cuenta de cobro.`,
    data: { payoutId: payout.id, orderId: payout.orderId, role: 'seller' },
  });

  return findPayoutView(payout.id);
}

export async function markPayoutFailed(
  userId: string,
  payoutId: string,
  reason: string
): Promise<PayoutView> {
  const payout = await sequelize.transaction(async (transaction) => {
    const locked = await Payout.findByPk(payoutId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!locked) {
      throw new AppError('No encontramos ese payout.', 404);
    }

    if (locked.status !== 'processing') {
      throw new AppError('Solo se puede fallar un payout en proceso.', 409);
    }

    const order = await Order.findByPk(locked.orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    await locked.update(
      {
        status: 'failed',
        failureReason: reason,
        failedAt: new Date(),
        processedBy: userId,
      },
      { transaction }
    );

    if (order?.status === 'payout_pending') {
      await order.update({ status: 'completed' }, { transaction });
    }

    await addPayoutEvent(locked.id, 'payout_failed', userId, { reason }, transaction);

    return locked;
  });

  await createNotification({
    userId: payout.sellerId,
    type: 'payout_failed',
    title: 'No pudimos completar el payout',
    body: 'Finanzas está revisando el pago. Te avisamos cuando se resuelva.',
    data: { payoutId: payout.id, orderId: payout.orderId, role: 'seller' },
  });

  return findPayoutView(payout.id);
}

export async function getPayoutReceipt(userId: string, payoutId: string): Promise<string> {
  const payout = await Payout.findOne({
    where: { id: payoutId, sellerId: userId },
    include: [
      { model: Order, as: 'order', attributes: ['listingTitleSnapshot', 'completedAt'] },
      { model: User, as: 'seller', attributes: ['fullName'] },
    ],
  });

  if (!payout) {
    throw new AppError('No encontramos ese payout.', 404);
  }

  if (payout.status !== 'paid' || !payout.paidAt) {
    throw new AppError('El comprobante está disponible cuando el payout fue pagado.', 409);
  }

  const related = payout as PayoutWithRelations;
  const paidAt = new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(payout.paidAt);
  const amount = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(payout.amountArs);

  return [
    'REVIA - Comprobante de payout',
    '',
    `Operación: ${payout.operationId ?? '-'}`,
    `Vendedor: ${related.seller?.fullName ?? '-'}`,
    `Artículo: ${related.order?.listingTitleSnapshot ?? '-'}`,
    `Monto: ${amount}`,
    `Fecha de pago: ${paidAt}`,
    `Payout: ${payout.id}`,
    '',
    'Este comprobante fue generado por REVIA.',
  ].join('\n');
}

export async function blockPayoutForOrder(
  orderId: string,
  reason: PayoutBlockReason,
  actorId: string | null
): Promise<void> {
  const payout = await Payout.findOne({ where: { orderId } });

  if (!payout || payout.status === 'paid') {
    return;
  }

  if (payout.blockReason !== reason) {
    await payout.update({ blockReason: reason });
  }

  await addPayoutEvent(payout.id, 'payout_blocked', actorId, { reason });
}

export async function voidPayoutForOrder(
  orderId: string,
  reason: string,
  actorId: string | null
): Promise<void> {
  const payout = await Payout.findOne({ where: { orderId } });

  if (!payout || payout.status === 'paid') {
    return;
  }

  await payout.update({
    status: 'failed',
    blockReason: reason,
    failureReason: reason,
    failedAt: new Date(),
    processedBy: actorId,
  });
  await addPayoutEvent(payout.id, 'payout_failed', actorId, {
    reason,
    source: 'dispute',
  });
}

export async function refreshPayoutBlockForOrder(
  orderId: string
): Promise<PayoutBlockReason | null> {
  const payout = await Payout.findOne({ where: { orderId } });

  if (!payout) {
    return null;
  }

  return refreshPayoutBlock(payout);
}
export async function reconcileTaloPayments(): Promise<ReconciliationResult> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const payments = await Payment.findAll({
    where: {
      updatedAt: { [Op.gte]: since },
      status: { [Op.in]: ['PENDING', 'SUCCESS', 'OVERPAID', 'UNDERPAID'] },
    },
    order: [['updatedAt', 'ASC']],
    limit: 50,
  });
  const result: ReconciliationResult = {
    checked: 0,
    updated: 0,
    mismatches: [],
  };

  for (const payment of payments) {
    result.checked += 1;

    try {
      const remote = await getTaloPayment(payment.providerPaymentId);

      if (remote.refunds) {
        for (const refund of remote.refunds) {
          await Refund.update(
            { status: refund.refund_status },
            { where: { providerRefundId: refund.refund_id } }
          );
        }
      }

      if (remote.payment_status !== payment.status) {
        result.mismatches.push({
          providerPaymentId: payment.providerPaymentId,
          localStatus: payment.status,
          remoteStatus: remote.payment_status,
        });
      }

      const processed = await processTaloPayment(payment.providerPaymentId, {
        source: 'reconciliation',
      });

      if (processed && !processed.duplicate && processed.status !== 'PENDING') {
        result.updated += 1;
      }
    } catch (error) {
      result.mismatches.push({
        providerPaymentId: payment.providerPaymentId,
        localStatus: payment.status,
        remoteStatus: null,
        error: error instanceof Error ? error.message : String(error),
      });
      logger.warn('No se pudo conciliar un pago de Talo', {
        providerPaymentId: payment.providerPaymentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
