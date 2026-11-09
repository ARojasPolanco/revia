import { Router } from 'express';
import { payoutAccountSchema } from '@revia/shared';
import { protect, requireKycApproved, requireVerifiedEmail } from '../../middlewares/auth.js';
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
