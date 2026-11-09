import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import { avatarUpload } from '../middlewares/upload.js';
import { authRouter } from '../modules/auth/auth.route.js';
import { categoriesRouter } from '../modules/categories/categories.route.js';
import { kycRouter } from '../modules/kyc/kyc.route.js';
import {
  adminListingsRouter,
  adminReportsRouter,
  feedRouter,
  listingsRouter,
  meListingsRouter,
} from '../modules/listings/listings.route.js';
import { payoutsRouter } from '../modules/payouts/payouts.route.js';
import { uploadAvatar } from '../modules/users/users.controller.js';
import { meFollowsRouter, usersRouter } from '../modules/users/users.route.js';
import { webhooksRouter } from '../modules/webhooks/webhooks.route.js';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'REVIA API v1',
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/listings', listingsRouter);
apiRouter.use('/feed', feedRouter);
apiRouter.use('/kyc', kycRouter);
apiRouter.use('/me', payoutsRouter);
apiRouter.use('/me', meListingsRouter);
apiRouter.use('/me', meFollowsRouter);
apiRouter.post('/me/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);
apiRouter.use('/admin/listings', adminListingsRouter);
apiRouter.use('/admin/reports', adminReportsRouter);
apiRouter.use('/webhooks', webhooksRouter);
