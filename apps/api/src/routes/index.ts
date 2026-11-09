import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.route.js';
import { kycRouter } from '../modules/kyc/kyc.route.js';
import { payoutsRouter } from '../modules/payouts/payouts.route.js';
import { usersRouter } from '../modules/users/users.route.js';
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
apiRouter.use('/kyc', kycRouter);
apiRouter.use('/me', payoutsRouter);
apiRouter.use('/webhooks', webhooksRouter);
