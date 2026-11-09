import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.route.js';
import { usersRouter } from '../modules/users/users.route.js';

export const apiRouter = Router();

apiRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'REVIA API v1',
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
