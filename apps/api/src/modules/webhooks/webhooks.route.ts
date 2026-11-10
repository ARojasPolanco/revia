import { Router } from 'express';
import { diditWebhook } from '../kyc/kyc.controller.js';
import { taloWebhook } from '../payments/payments.controller.js';

export const webhooksRouter = Router();

webhooksRouter.post('/didit', diditWebhook);
webhooksRouter.post('/talo', taloWebhook);
