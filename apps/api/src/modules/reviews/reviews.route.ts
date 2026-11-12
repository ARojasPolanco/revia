import { Router } from 'express';
import { z } from 'zod';
import { createReviewSchema } from '@revia/shared';
import {
  protect,
  requireOnboardingCompleted,
  requireVerifiedEmail,
  restrictTo,
} from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import * as controller from './reviews.controller.js';

const reportReviewSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

const resolveReportSchema = z
  .object({
    status: z.enum(['resolved', 'dismissed']),
  })
  .strict();

export const orderReviewsRouter = Router();

orderReviewsRouter.get('/:id/reviews', protect, controller.getOrderReviews);
orderReviewsRouter.post(
  '/:id/reviews',
  protect,
  requireVerifiedEmail,
  requireOnboardingCompleted,
  validateBody(createReviewSchema),
  controller.createReview
);

export const reviewsRouter = Router();

reviewsRouter.post(
  '/:id/report',
  protect,
  requireVerifiedEmail,
  validateBody(reportReviewSchema),
  controller.reportReview
);

export const adminReviewsRouter = Router();

adminReviewsRouter.use(protect, restrictTo('support', 'admin'));

adminReviewsRouter.get('/reports', controller.listReviewReports);
adminReviewsRouter.post(
  '/reports/:id/resolve',
  validateBody(resolveReportSchema),
  controller.resolveReport
);
adminReviewsRouter.post('/:id/hide', controller.hideReview);
adminReviewsRouter.post('/:id/show', controller.showReview);
