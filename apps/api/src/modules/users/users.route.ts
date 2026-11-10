import { Router } from 'express';
import { z } from 'zod';
import { protect, requireVerifiedEmail } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import * as controller from './users.controller.js';

const reportUserSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const usersRouter = Router();

usersRouter.get('/:id', controller.getPublicProfile);
usersRouter.get('/:id/listings', controller.getUserListings);
usersRouter.get('/:id/relationship', protect, controller.getRelationship);
usersRouter.post('/:id/follow', protect, requireVerifiedEmail, controller.follow);
usersRouter.delete('/:id/follow', protect, requireVerifiedEmail, controller.unfollow);
usersRouter.post('/:id/block', protect, requireVerifiedEmail, controller.block);
usersRouter.delete('/:id/block', protect, requireVerifiedEmail, controller.unblock);
usersRouter.post(
  '/:id/report',
  protect,
  requireVerifiedEmail,
  validateBody(reportUserSchema),
  controller.report
);

export const meFollowsRouter = Router();

meFollowsRouter.get('/following', protect, controller.getFollowing);
meFollowsRouter.get('/followers', protect, controller.getFollowers);
