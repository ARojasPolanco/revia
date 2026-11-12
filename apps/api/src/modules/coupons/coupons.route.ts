import { Router } from 'express';
import { protect } from '../../middlewares/auth.js';
import * as controller from './coupons.controller.js';

export const meCouponsRouter = Router();

meCouponsRouter.get('/coupons', protect, controller.listCoupons);
meCouponsRouter.get('/coupons/active', protect, controller.listActiveCoupons);
