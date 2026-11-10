import { Router } from 'express';
import { createOrderSchema, deliveryCodeSchema, orderQuoteSchema } from '@revia/shared';
import {
  protect,
  requireOnboardingCompleted,
  requireVerifiedEmail,
} from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import * as controller from './orders.controller.js';

export const ordersRouter = Router();

ordersRouter.post(
  '/quote',
  protect,
  requireVerifiedEmail,
  validateBody(orderQuoteSchema),
  controller.quoteOrder
);

ordersRouter.post(
  '/',
  protect,
  requireVerifiedEmail,
  requireOnboardingCompleted,
  validateBody(createOrderSchema),
  controller.createOrder
);

export const meOrdersRouter = Router();

meOrdersRouter.get('/purchases', protect, controller.listPurchases);
meOrdersRouter.get('/sales', protect, controller.listSales);
meOrdersRouter.get('/orders/:id', protect, controller.getOrder);

meOrdersRouter.post('/orders/:id/payment', protect, requireVerifiedEmail, controller.payOrder);

meOrdersRouter.post(
  '/orders/:id/validate-delivery',
  protect,
  requireVerifiedEmail,
  validateBody(deliveryCodeSchema),
  controller.validateDeliveryCode
);

meOrdersRouter.post(
  '/orders/:id/confirm-receipt',
  protect,
  requireVerifiedEmail,
  controller.confirmReceipt
);

meOrdersRouter.post(
  '/orders/:id/handover',
  protect,
  requireVerifiedEmail,
  controller.markHandoverPending
);

meOrdersRouter.delete('/orders/:id', protect, requireVerifiedEmail, controller.cancelOrder);

meOrdersRouter.post(
  '/orders/:id/simulate-payment',
  protect,
  requireVerifiedEmail,
  controller.simulatePayment
);
