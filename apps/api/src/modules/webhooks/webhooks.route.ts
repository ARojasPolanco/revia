import { Router } from 'express';
import { diditWebhook } from '../kyc/kyc.controller.js';

export const webhooksRouter = Router();

webhooksRouter.post('/didit', diditWebhook);
