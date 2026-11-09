import { Router } from 'express';
import { z } from 'zod';
import {
  protect,
  requireOnboardingCompleted,
  requireVerifiedEmail,
} from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import * as controller from './kyc.controller.js';

const devVerifySchema = z
  .object({
    status: z.enum(['approved', 'rejected', 'manual_review']),
  })
  .strict();

export const kycRouter = Router();

kycRouter.post(
  '/session',
  protect,
  requireVerifiedEmail,
  requireOnboardingCompleted,
  controller.startSession
);
kycRouter.get('/status', protect, controller.getStatus);
kycRouter.post('/dev/verify', protect, validateBody(devVerifySchema), controller.devVerify);
