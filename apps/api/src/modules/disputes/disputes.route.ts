import { Router } from 'express';
import {
  disputeEvidenceSchema,
  disputeMessageSchema,
  disputeOfferSchema,
  openDisputeSchema,
  resolveDisputeSchema,
} from '@revia/shared';
import {
  protect,
  requireOnboardingCompleted,
  requireVerifiedEmail,
  restrictTo,
} from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import * as controller from './disputes.controller.js';

export const disputesRouter = Router();

disputesRouter.use(protect, requireVerifiedEmail);

disputesRouter.get('/', controller.listMyDisputes);
disputesRouter.get('/:id', controller.getDispute);
disputesRouter.post('/:id/messages', validateBody(disputeMessageSchema), controller.addMessage);
disputesRouter.post('/:id/evidence', validateBody(disputeEvidenceSchema), controller.addEvidence);
disputesRouter.post('/:id/offer', validateBody(disputeOfferSchema), controller.sellerOffer);

export const orderDisputesRouter = Router();

orderDisputesRouter.post(
  '/:id/dispute',
  protect,
  requireVerifiedEmail,
  requireOnboardingCompleted,
  validateBody(openDisputeSchema),
  controller.openDispute
);

export const adminDisputesRouter = Router();

adminDisputesRouter.use(protect, restrictTo('support', 'admin'));

adminDisputesRouter.get('/', controller.listAdminDisputes);
adminDisputesRouter.post(
  '/:id/resolve',
  validateBody(resolveDisputeSchema),
  controller.resolveDispute
);
