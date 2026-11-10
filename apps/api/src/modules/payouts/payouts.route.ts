import { Router } from 'express';
import { payoutAccountSchema, payoutFailedSchema, payoutPaidSchema } from '@revia/shared';
import {
  protect,
  requireKycApproved,
  requireVerifiedEmail,
  restrictTo,
} from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import * as controller from './payouts.controller.js';

export const payoutsRouter = Router();

payoutsRouter.get('/payout-account', protect, controller.getAccount);
payoutsRouter.put(
  '/payout-account',
  protect,
  requireVerifiedEmail,
  requireKycApproved,
  validateBody(payoutAccountSchema),
  controller.upsertAccount
);

payoutsRouter.get('/payouts', protect, controller.listPayouts);
payoutsRouter.get('/payouts/summary', protect, controller.getSummary);
payoutsRouter.get('/payouts/:id/receipt', protect, controller.getReceipt);

export const adminPayoutsRouter = Router();

adminPayoutsRouter.use(protect, restrictTo('finance', 'admin'));

adminPayoutsRouter.get('/', controller.listFinance);
adminPayoutsRouter.get('/summary', controller.getFinanceSummary);
adminPayoutsRouter.post('/reconcile', controller.reconcile);
adminPayoutsRouter.post('/:id/processing', controller.markProcessing);
adminPayoutsRouter.post('/:id/mark-paid', validateBody(payoutPaidSchema), controller.markPaid);
adminPayoutsRouter.post(
  '/:id/mark-failed',
  validateBody(payoutFailedSchema),
  controller.markFailed
);
