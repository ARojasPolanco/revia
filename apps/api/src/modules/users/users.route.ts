import { Router } from 'express';
import { protect, requireVerifiedEmail } from '../../middlewares/auth.js';
import * as controller from './users.controller.js';

export const usersRouter = Router();

usersRouter.get('/:id', controller.getPublicProfile);
usersRouter.get('/:id/listings', controller.getUserListings);
usersRouter.get('/:id/relationship', protect, controller.getRelationship);
usersRouter.post('/:id/follow', protect, requireVerifiedEmail, controller.follow);
usersRouter.delete('/:id/follow', protect, requireVerifiedEmail, controller.unfollow);

export const meFollowsRouter = Router();

meFollowsRouter.get('/following', protect, controller.getFollowing);
meFollowsRouter.get('/followers', protect, controller.getFollowers);
