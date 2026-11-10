import { Op } from 'sequelize';
import type { Includeable, Transaction } from 'sequelize';
import type { z } from 'zod';
import { DEFAULTS, buildOrderTotals, createOrderSchema, orderQuoteSchema } from '@revia/shared';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../errors/appError.js';
import { hashToken } from '../../utils/tokens.js';
import { toPublicUser, type PublicUser } from '../auth/auth.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import { ensurePayoutForOrder } from '../payouts/payoutRecords.service.js';
import { Listing } from '../listings/listing.model.js';
import { ListingPhoto } from '../listings/listingPhoto.model.js';
import { Offer } from '../offers/offer.model.js';
import { User } from '../users/user.model.js';
import { Payment } from '../payments/payment.model.js';
import {
  createPaymentForOrder,
  decryptDeliveryCode,
  paymentViewForOrder,
  type PaymentView,
} from '../payments/payments.service.js';
import { DeliveryCode } from './deliveryCode.model.js';
import { Order } from './order.model.js';
import { OrderEvent } from './orderEvent.model.js';

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderQuoteInput = z.infer<typeof orderQuoteSchema>;

export interface OrderQuoteView {
  listingId: string;
  listingTitle: string;
  listingPhotoUrl: string | null;
  offerId: string | null;
  deliveryMode: string;
  itemPriceArs: number;
  midpointFeeArs: number;
  tasaPercent: number;
  tasaFixedArs: number;
  tasaAmountArs: number;
  totalAmountArs: number;
  sellerPayoutArs: number;
}

export interface OrderEventView {
  id: string;
  type: string;
  actor: PublicUser | null;
  data: Record<string, unknown>;
  createdAt: Date;
}

export interface OrderView {
  id: string;
  role: 'buyer' | 'seller';
  status: string;
  deliveryMode: string;
  itemPriceArs: number;
  midpointFeeArs: number;
  tasaPercent: number;
  tasaFixedArs: number;
  tasaAmountArs: number;
  totalAmountArs: number;
  sellerPayoutArs: number;
  listing: {
    id: string;
    title: string;
    photoUrl: string | null;
  };
  buyer: PublicUser | null;
  seller: PublicUser | null;
  payment: PaymentView | null;
  deliveryCode: string | null;
  deliveryCodeUsed: boolean;
  claimWindowEndsAt: Date | null;
  paidAt: Date | null;
  deliveredAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  events: OrderEventView[];
  actions: {
    canPay: boolean;
    canConfirmReceipt: boolean;
    canValidateCode: boolean;
    canCancel: boolean;
    canMarkHandover: boolean;
  };
}

type OrderWithRelations = Order & {
  buyer?: User | null;
  seller?: User | null;
  payment?: Payment | null;
  deliveryCode?: DeliveryCode | null;
  events?: (OrderEvent & { actor?: User | null })[];
};

interface ResolvedOrderContext {
  listing: Listing;
  offer: Offer | null;
  itemPriceArs: number;
  midpointFeeArs: number;
  listingPhotoUrl: string | null;
  totals: ReturnType<typeof buildOrderTotals>;
}

const userAttributes = [
  'id',
  'fullName',
  'bio',
  'location',
  'avatarUrl',
  'sellerVerifiedAt',
  'createdAt',
];

const orderIncludes: Includeable[] = [
  { model: User, as: 'buyer', attributes: userAttributes },
  { model: User, as: 'seller', attributes: userAttributes },
  { model: Payment, as: 'payment', required: false },
  { model: DeliveryCode, as: 'deliveryCode', required: false },
  {
    model: OrderEvent,
    as: 'events',
    required: false,
    separate: true,
    order: [['createdAt', 'ASC']],
    include: [{ model: User, as: 'actor', attributes: userAttributes }],
  },
];

function addEvent(
  orderId: string,
  type: string,
  actorId: string | null,
  data: Record<string, unknown> = {},
  transaction?: Transaction
): Promise<OrderEvent> {
  return OrderEvent.create({ orderId, type, actorId, data }, { transaction });
}

function assertDeliveryMode(listing: Listing, deliveryMode: string): void {
  if (!listing.deliveryModes.includes(deliveryMode)) {
    throw new AppError('Elegí una modalidad de entrega disponible para esta publicación.', 422);
  }
}

function calculateMidpointFee(listing: Listing, deliveryMode: string): number {
  if (deliveryMode !== 'midpoint') {
    return 0;
  }

  return listing.midpointFeeArs > 0 ? listing.midpointFeeArs : DEFAULTS.midpointFeeArs;
}

async function resolveOrderContext(
  buyerId: string,
  input: OrderQuoteInput
): Promise<ResolvedOrderContext> {
  const listing = await Listing.findByPk(input.listingId);

  if (!listing || listing.isDeleted) {
    throw new AppError('No encontramos esa publicación.', 404);
  }

  if (listing.sellerId === buyerId) {
    throw new AppError('No podés comprar tu propia publicación.', 400);
  }

  if (listing.status !== 'active') {
    throw new AppError('Esta publicación no está disponible para comprar.', 409);
  }

  assertDeliveryMode(listing, input.deliveryMode);

  let offer: Offer | null = null;
  let itemPriceArs = listing.priceArs;

  if (input.offerId) {
    offer = await Offer.findByPk(input.offerId);

    if (!offer || offer.listingId !== listing.id) {
      throw new AppError('No encontramos esa oferta.', 404);
    }

    if (offer.buyerId !== buyerId || offer.sellerId !== listing.sellerId) {
      throw new AppError('No podés usar esta oferta.', 403);
    }

    if (
      offer.status === 'accepted' &&
      offer.paymentExpiresAt &&
      offer.paymentExpiresAt < new Date()
    ) {
      await offer.update({ status: 'expired' });
      throw new AppError('La oferta aceptada venció. Podés comprar al precio publicado.', 409);
    }

    if (offer.status !== 'accepted') {
      throw new AppError('Esta oferta no está lista para pagar.', 409);
    }

    itemPriceArs = offer.amountArs;
  }

  const midpointFeeArs = calculateMidpointFee(listing, input.deliveryMode);
  const totals = buildOrderTotals({
    itemPriceArs,
    midpointFeeArs,
    tasaPercent: DEFAULTS.tasaPercent,
    tasaFixedArs: DEFAULTS.tasaFixedArs,
  });
  const photo = await ListingPhoto.findOne({
    where: { listingId: listing.id, isDeleted: false },
    order: [['sortOrder', 'ASC']],
  });

  return {
    listing,
    offer,
    itemPriceArs,
    midpointFeeArs,
    listingPhotoUrl: photo?.thumbnailUrl ?? photo?.url ?? null,
    totals,
  };
}

function toOrderView(order: Order, userId: string): OrderView {
  const related = order as OrderWithRelations;
  const isBuyer = order.buyerId === userId;
  const deliveryCodeRecord = related.deliveryCode;
  let deliveryCode: string | null = null;

  if (
    isBuyer &&
    deliveryCodeRecord &&
    !deliveryCodeRecord.usedAt &&
    ['paid', 'handover_pending', 'delivered'].includes(order.status)
  ) {
    try {
      deliveryCode = decryptDeliveryCode(deliveryCodeRecord.codeEncrypted);
    } catch {
      deliveryCode = null;
    }
  }

  return {
    id: order.id,
    role: isBuyer ? 'buyer' : 'seller',
    status: order.status,
    deliveryMode: order.deliveryMode,
    itemPriceArs: order.itemPriceArs,
    midpointFeeArs: order.midpointFeeArs,
    tasaPercent: order.tasaPercent,
    tasaFixedArs: order.tasaFixedArs,
    tasaAmountArs: order.tasaAmountArs,
    totalAmountArs: order.totalAmountArs,
    sellerPayoutArs: order.sellerPayoutArs,
    listing: {
      id: order.listingId,
      title: order.listingTitleSnapshot,
      photoUrl: order.listingPhotoUrlSnapshot,
    },
    buyer: related.buyer ? toPublicUser(related.buyer) : null,
    seller: related.seller ? toPublicUser(related.seller) : null,
    payment: paymentViewForOrder(related.payment ?? null, isBuyer),
    deliveryCode,
    deliveryCodeUsed: Boolean(deliveryCodeRecord?.usedAt),
    claimWindowEndsAt: order.claimWindowEndsAt,
    paidAt: order.paidAt,
    deliveredAt: order.deliveredAt,
    completedAt: order.completedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    events: (related.events ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor ? toPublicUser(event.actor) : null,
      data: event.data,
      createdAt: event.createdAt,
    })),
    actions: {
      canPay:
        isBuyer &&
        order.status === 'pending_payment' &&
        (!related.payment || related.payment.status === 'PENDING'),
      canConfirmReceipt:
        isBuyer && ['paid', 'handover_pending', 'delivered'].includes(order.status),
      canValidateCode: !isBuyer && ['paid', 'handover_pending'].includes(order.status),
      canCancel: order.status === 'pending_payment',
      canMarkHandover: order.status === 'paid',
    },
  };
}

export async function quoteOrder(buyerId: string, input: OrderQuoteInput): Promise<OrderQuoteView> {
  const context = await resolveOrderContext(buyerId, input);

  return {
    listingId: context.listing.id,
    listingTitle: context.listing.title,
    listingPhotoUrl: context.listingPhotoUrl,
    offerId: context.offer?.id ?? null,
    deliveryMode: input.deliveryMode,
    tasaPercent: DEFAULTS.tasaPercent,
    tasaFixedArs: DEFAULTS.tasaFixedArs,
    ...context.totals,
  };
}

export async function createOrder(
  buyerId: string,
  input: CreateOrderInput
): Promise<{ order: OrderView; paymentError: string | null }> {
  if (input.couponId) {
    throw new AppError('Los cupones todavía no están disponibles.', 422);
  }

  const context = await resolveOrderContext(buyerId, input);

  let order: Order;

  try {
    order = await Order.create({
      buyerId,
      sellerId: context.listing.sellerId,
      listingId: context.listing.id,
      offerId: context.offer?.id ?? null,
      deliveryMode: input.deliveryMode,
      status: 'pending_payment',
      itemPriceArs: context.totals.itemPriceArs,
      midpointFeeArs: context.totals.midpointFeeArs,
      tasaPercent: DEFAULTS.tasaPercent,
      tasaFixedArs: DEFAULTS.tasaFixedArs,
      tasaAmountArs: context.totals.tasaAmountArs,
      totalAmountArs: context.totals.totalAmountArs,
      sellerPayoutArs: context.totals.sellerPayoutArs,
      listingTitleSnapshot: context.listing.title,
      listingPhotoUrlSnapshot: context.listingPhotoUrl,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
      const constraint = (error as { parent?: { constraint?: string } }).parent?.constraint;

      if (constraint === 'orders_active_buyer_listing_unique') {
        throw new AppError('Ya tenés una compra en curso para esta publicación.', 409);
      }

      if (constraint === 'orders_active_listing_unique') {
        throw new AppError('Esta publicación ya fue vendida.', 409);
      }

      throw new AppError('No pudimos iniciar la compra. Probá de nuevo.', 409);
    }

    throw error;
  }

  await addEvent(order.id, 'order_created', buyerId, {
    deliveryMode: input.deliveryMode,
    offerId: input.offerId ?? null,
  });

  const buyer = await User.findByPk(buyerId);

  if (!buyer) {
    throw new AppError('Iniciá sesión para continuar.', 401);
  }

  let paymentError: string | null = null;

  try {
    const payment = await createPaymentForOrder(order, buyer);
    await addEvent(order.id, 'payment_created', buyerId, { paymentId: payment.id });
  } catch (error) {
    paymentError =
      error instanceof AppError
        ? error.message
        : 'No pudimos generar las instrucciones de pago. Reintentá en unos minutos.';
    await addEvent(order.id, 'payment_creation_failed', buyerId, {});
  }

  return {
    order: await getOrderView(buyerId, order.id),
    paymentError,
  };
}

export async function payOrder(userId: string, orderId: string): Promise<OrderView> {
  const order = await Order.findByPk(orderId);

  if (!order || order.buyerId !== userId) {
    throw new AppError('No encontramos esa compra.', 404);
  }

  if (order.status !== 'pending_payment') {
    throw new AppError('Esta compra ya no está pendiente de pago.', 409);
  }

  const buyer = await User.findByPk(userId);

  if (!buyer) {
    throw new AppError('Iniciá sesión para continuar.', 401);
  }

  const payment = await createPaymentForOrder(order, buyer);
  await addEvent(order.id, 'payment_created', userId, { paymentId: payment.id });

  return getOrderView(userId, order.id);
}

export async function getOrderView(userId: string, orderId: string): Promise<OrderView> {
  const order = await Order.findOne({
    where: {
      id: orderId,
      [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
    },
    include: orderIncludes,
  });

  if (!order) {
    throw new AppError('No encontramos esa compra.', 404);
  }

  return toOrderView(order, userId);
}

export async function listPurchases(userId: string): Promise<OrderView[]> {
  const orders = await Order.findAll({
    where: { buyerId: userId },
    include: orderIncludes,
    order: [['createdAt', 'DESC']],
    limit: 50,
  });

  return orders.map((order) => toOrderView(order, userId));
}

export async function listSales(userId: string): Promise<OrderView[]> {
  const orders = await Order.findAll({
    where: { sellerId: userId },
    include: orderIncludes,
    order: [['createdAt', 'DESC']],
    limit: 50,
  });

  return orders.map((order) => toOrderView(order, userId));
}

async function verifySellerFirstSale(
  sellerId: string,
  orderId: string,
  transaction: Transaction
): Promise<boolean> {
  const seller = await User.findByPk(sellerId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!seller || seller.sellerVerifiedAt) {
    return false;
  }

  const completedSales = await Order.count({
    where: {
      sellerId,
      status: { [Op.in]: ['completed', 'payout_pending', 'paid_out'] },
    },
    transaction,
  });

  if (completedSales !== 1) {
    return false;
  }

  await seller.update({ sellerVerifiedAt: new Date() }, { transaction });
  await addEvent(orderId, 'seller_verified', null, {}, transaction);

  return true;
}

async function notifyDelivered(order: Order): Promise<void> {
  await Promise.all([
    createNotification({
      userId: order.buyerId,
      type: 'order_delivered',
      title: 'Entrega confirmada',
      body: 'El vendedor confirmó la entrega. Tenés 48 horas para abrir un reclamo.',
      data: { orderId: order.id, role: 'buyer' },
    }),
    createNotification({
      userId: order.sellerId,
      type: 'order_delivered',
      title: 'Entrega registrada',
      body: 'Registramos la entrega. Si no hay reclamos, la orden se completa en 48 horas.',
      data: { orderId: order.id, role: 'seller' },
    }),
  ]);
}

async function notifyCompleted(
  order: Order,
  buyerConfirmed: boolean,
  sellerJustVerified: boolean
): Promise<void> {
  await Promise.all([
    createNotification({
      userId: order.buyerId,
      type: 'order_completed',
      title: 'Compra completada',
      body: buyerConfirmed
        ? 'Gracias por confirmar la recepción. La compra quedó completada.'
        : 'Pasaron 48 horas sin reclamos. La compra quedó completada.',
      data: { orderId: order.id, role: 'buyer' },
    }),
    createNotification({
      userId: order.sellerId,
      type: 'order_completed',
      title: 'Venta completada',
      body: 'La venta quedó completada. El payout se procesa dentro de las próximas 48-72 horas hábiles.',
      data: { orderId: order.id, role: 'seller' },
    }),
  ]);

  if (sellerJustVerified) {
    await createNotification({
      userId: order.sellerId,
      type: 'seller_verified',
      title: 'Perfil verificado',
      body: 'Completaste tu primera venta. Ahora tu perfil muestra el check de verificado.',
      data: { orderId: order.id, role: 'seller' },
    });
  }
}

async function completeOrder(
  orderId: string,
  actorId: string | null,
  buyerConfirmed: boolean
): Promise<{ order: Order; sellerJustVerified: boolean } | null> {
  const result = await sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      throw new AppError('No encontramos esa compra.', 404);
    }

    if (buyerConfirmed) {
      if (order.buyerId !== actorId) {
        throw new AppError('No podés confirmar esta compra.', 403);
      }

      if (!['paid', 'handover_pending', 'delivered'].includes(order.status)) {
        throw new AppError('Esta compra no está lista para confirmar la recepción.', 409);
      }
    } else if (order.status !== 'delivered') {
      return null;
    }

    const now = new Date();

    await order.update(
      {
        status: 'completed',
        deliveredAt: order.deliveredAt ?? now,
        completedAt: now,
        claimWindowEndsAt: now,
      },
      { transaction }
    );

    if (buyerConfirmed) {
      await addEvent(order.id, 'buyer_confirmed_receipt', actorId, {}, transaction);
    }

    await addEvent(
      order.id,
      'order_completed',
      actorId,
      { automatic: !buyerConfirmed },
      transaction
    );

    const sellerJustVerified = await verifySellerFirstSale(order.sellerId, order.id, transaction);

    await ensurePayoutForOrder(order, transaction);

    return { order, sellerJustVerified };
  });

  if (result) {
    await notifyCompleted(result.order, buyerConfirmed, result.sellerJustVerified);
  }

  return result;
}

export async function validateDeliveryCode(
  userId: string,
  orderId: string,
  code: string
): Promise<OrderView> {
  const order = await sequelize.transaction(async (transaction) => {
    const lockedOrder = await Order.findByPk(orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!lockedOrder) {
      throw new AppError('No encontramos esa venta.', 404);
    }

    if (lockedOrder.sellerId !== userId) {
      throw new AppError('Solo el vendedor puede validar el código de entrega.', 403);
    }

    if (!['paid', 'handover_pending'].includes(lockedOrder.status)) {
      throw new AppError('Esta venta no está lista para validar la entrega.', 409);
    }

    const deliveryCode = await DeliveryCode.findOne({
      where: { orderId: lockedOrder.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!deliveryCode || deliveryCode.usedAt) {
      throw new AppError('El código de entrega ya fue usado o no existe.', 409);
    }

    if (deliveryCode.codeHash !== hashToken(code.trim())) {
      throw new AppError('El código no es correcto. Pedile al comprador que lo revise.', 422);
    }

    const now = new Date();
    await deliveryCode.update({ usedAt: now }, { transaction });
    await lockedOrder.update(
      {
        status: 'delivered',
        deliveredAt: now,
        claimWindowEndsAt: new Date(now.getTime() + DEFAULTS.claimWindowHours * 60 * 60 * 1000),
      },
      { transaction }
    );
    await addEvent(lockedOrder.id, 'delivery_validated', userId, {}, transaction);

    return lockedOrder;
  });

  await notifyDelivered(order);

  return getOrderView(userId, orderId);
}

export async function confirmReceipt(userId: string, orderId: string): Promise<OrderView> {
  const result = await completeOrder(orderId, userId, true);

  if (!result) {
    throw new AppError('No se pudo completar la compra.', 409);
  }

  return getOrderView(userId, orderId);
}

export async function markHandoverPending(userId: string, orderId: string): Promise<OrderView> {
  const order = await Order.findOne({
    where: {
      id: orderId,
      [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
    },
  });

  if (!order) {
    throw new AppError('No encontramos esa compra.', 404);
  }

  if (order.status !== 'paid') {
    throw new AppError('Esta compra no está pendiente de coordinación.', 409);
  }

  await order.update({ status: 'handover_pending' });
  await addEvent(order.id, 'handover_pending', userId, {});
  await createNotification({
    userId: order.buyerId === userId ? order.sellerId : order.buyerId,
    type: 'order_handover_pending',
    title: 'Entrega coordinada',
    body: 'La entrega ya está coordinada. Cuando se concrete, validá el código.',
    data: { orderId: order.id, role: userId === order.buyerId ? 'seller' : 'buyer' },
  });

  return getOrderView(userId, orderId);
}

export async function cancelOrder(userId: string, orderId: string): Promise<OrderView> {
  const order = await Order.findOne({
    where: {
      id: orderId,
      [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
    },
  });

  if (!order) {
    throw new AppError('No encontramos esa compra.', 404);
  }

  if (order.status !== 'pending_payment') {
    throw new AppError('Esta compra ya no se puede cancelar.', 409);
  }

  await order.update({ status: 'cancelled', cancelledAt: new Date() });
  await addEvent(order.id, 'order_cancelled', userId, {});
  await createNotification({
    userId: order.buyerId === userId ? order.sellerId : order.buyerId,
    type: 'order_cancelled',
    title: 'Compra cancelada',
    body: 'La compra fue cancelada. El artículo sigue disponible.',
    data: { orderId: order.id, role: userId === order.buyerId ? 'seller' : 'buyer' },
  });

  return getOrderView(userId, orderId);
}

export async function completeDeliveredOrders(): Promise<number> {
  const orders = await Order.findAll({
    where: {
      status: 'delivered',
      claimWindowEndsAt: { [Op.lte]: new Date() },
    },
    limit: 50,
  });
  let completed = 0;

  for (const order of orders) {
    const result = await completeOrder(order.id, null, false);

    if (result) {
      completed += 1;
    }
  }

  return completed;
}
