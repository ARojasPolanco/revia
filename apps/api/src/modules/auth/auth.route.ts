import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  completeOnboardingSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from '@revia/shared';
import { envs } from '../../config/envs.js';
import { protect } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import * as controller from './auth.controller.js';

const isTest = () => envs.NODE_ENV === 'test';

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: {
    status: 'fail',
    message: 'Demasiados intentos de registro. Probá más tarde.',
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: {
    status: 'fail',
    message: 'Demasiados intentos de ingreso. Probá más tarde.',
  },
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: {
    status: 'fail',
    message: 'Demasiados intentos. Probá más tarde.',
  },
});

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isTest,
  message: {
    status: 'fail',
    message: 'Demasiados intentos. Probá más tarde.',
  },
});

export const authRouter = Router();

authRouter.post('/register', registerLimiter, validateBody(registerSchema), controller.register);
authRouter.post('/login', loginLimiter, validateBody(loginSchema), controller.login);

authRouter.get('/google', controller.google);
authRouter.get('/google/callback', controller.googleCallback);

authRouter.post(
  '/verify-email',
  tokenLimiter,
  validateBody(verifyEmailSchema),
  controller.verifyEmail
);
authRouter.post('/resend-verification', protect, tokenLimiter, controller.resendVerification);

authRouter.post(
  '/forgot-password',
  forgotLimiter,
  validateBody(forgotPasswordSchema),
  controller.forgotPassword
);
authRouter.post(
  '/reset-password',
  tokenLimiter,
  validateBody(resetPasswordSchema),
  controller.resetPassword
);

authRouter.post('/logout', controller.logout);

authRouter.get('/me', protect, controller.me);
authRouter.patch('/me', protect, validateBody(updateProfileSchema), controller.updateMe);
authRouter.post(
  '/complete-onboarding',
  protect,
  validateBody(completeOnboardingSchema),
  controller.completeOnboarding
);
