import { Router } from 'express';
import { createOfferSchema } from '@revia/shared';
import { protect, requireVerifiedEmail } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import * as controller from './offers.controller.js';

export const offersRouter = Router();

offersRouter.use(protect, requireVerifiedEmail);

offersRouter.post('/:id/accept', controller.acceptOffer);
offersRouter.post('/:id/reject', controller.rejectOffer);
offersRouter.post('/:id/counter', validateBody(createOfferSchema), controller.counterOffer);
offersRouter.delete('/:id', controller.cancelOffer);

export const meOffersRouter = Router();

meOffersRouter.get('/offers', protect, controller.getMyOffers);
