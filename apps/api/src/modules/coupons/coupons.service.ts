import crypto from 'node:crypto';
import { Op } from 'sequelize';
import type { Transaction } from 'sequelize';
import { DEFAULTS } from '@revia/shared';
import { AppError } from '../../errors/appError.js';
import { Coupon } from './coupon.model.js';
import { CouponRedemption } from './couponRedemption.model.js';

export interface CouponView {
  id: string;
  code: string;
  amountArs: number;
  status: string;
  expiresAt: Date;
  usedAt: Date | null;
  usedOrderId: string | null;
  sourceDisputeId: string | null;
  createdAt: Date;
}

function toView(coupon: Coupon): CouponView {
  return {
    id: coupon.id,
    code: coupon.code,
    amountArs: coupon.amountArs,
    status: coupon.status,
    expiresAt: coupon.expiresAt,
    usedAt: coupon.usedAt,
    usedOrderId: coupon.usedOrderId,
    sourceDisputeId: coupon.sourceDisputeId,
    createdAt: coupon.createdAt,
  };
}

async function generateUniqueCode(transaction?: Transaction): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `RV-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const existing = await Coupon.findOne({ where: { code }, transaction });

    if (!existing) {
      return code;
    }
  }

  throw new Error('No se pudo generar un código de cupón único');
}

export async function issueCouponForUser(
  userId: string,
  amountArs: number,
  transaction?: Transaction,
  sourceDisputeId?: string
): Promise<CouponView> {
  if (!Number.isInteger(amountArs) || amountArs <= 0) {
    throw new AppError('El monto del cupón no es válido.', 422);
  }

  const code = await generateUniqueCode(transaction);
  const coupon = await Coupon.create(
    {
      userId,
      code,
      amountArs,
      status: 'active',
      sourceDisputeId: sourceDisputeId ?? null,
      expiresAt: new Date(Date.now() + DEFAULTS.couponExpiryDays * 24 * 60 * 60 * 1000),
    },
    { transaction }
  );

  return toView(coupon);
}

export async function listCoupons(userId: string): Promise<CouponView[]> {
  await expireCoupons();

  const coupons = await Coupon.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });

  return coupons.map(toView);
}

export async function getActiveCoupons(userId: string): Promise<CouponView[]> {
  await expireCoupons();

  const coupons = await Coupon.findAll({
    where: { userId, status: 'active', expiresAt: { [Op.gt]: new Date() } },
    order: [['expiresAt', 'ASC']],
  });

  return coupons.map(toView);
}

export async function validateCouponForOrder(userId: string, couponId: string): Promise<Coupon> {
  const coupon = await Coupon.findByPk(couponId);

  if (!coupon || coupon.userId !== userId) {
    throw new AppError('No encontramos ese cupón.', 404);
  }

  if (coupon.status !== 'active') {
    throw new AppError('Este cupón ya fue usado o no está disponible.', 409);
  }

  if (coupon.usedAt || coupon.expiresAt.getTime() <= Date.now()) {
    throw new AppError('Este cupón venció.', 409);
  }

  return coupon;
}

export async function reserveCoupon(
  coupon: Coupon,
  orderId: string,
  amountArs: number,
  transaction?: Transaction
): Promise<void> {
  const [updated] = await Coupon.update(
    {
      status: 'used',
      usedAt: new Date(),
      usedOrderId: orderId,
    },
    {
      where: { id: coupon.id, status: 'active' },
      transaction,
    }
  );

  if (updated === 0) {
    throw new AppError('Este cupón ya fue usado o no está disponible.', 409);
  }

  await CouponRedemption.create(
    {
      couponId: coupon.id,
      orderId,
      userId: coupon.userId,
      amountArs,
    },
    { transaction }
  );
}

export async function releaseCouponForOrder(
  orderId: string,
  transaction?: Transaction
): Promise<void> {
  const redemption = await CouponRedemption.findOne({ where: { orderId }, transaction });

  if (!redemption) {
    return;
  }

  const coupon = await Coupon.findByPk(redemption.couponId, { transaction });

  if (coupon && coupon.status === 'used' && coupon.usedOrderId === orderId) {
    await coupon.update(
      {
        status: 'active',
        usedAt: null,
        usedOrderId: null,
      },
      { transaction }
    );
  }

  await redemption.destroy({ transaction });
}

export async function expireCoupons(): Promise<void> {
  await Coupon.update(
    { status: 'expired' },
    {
      where: {
        status: 'active',
        expiresAt: { [Op.lt]: new Date() },
      },
    }
  );
}
