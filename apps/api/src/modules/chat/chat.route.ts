import { Router } from 'express';
import { z } from 'zod';
import { uuidSchema } from '@revia/shared';
import { protect, requireVerifiedEmail } from '../../middlewares/auth.js';
import { validateBody } from '../../middlewares/validate.js';
import * as controller from './chat.controller.js';

const createConversationSchema = z
  .object({
    listingId: uuidSchema,
  })
  .strict();

const sendMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(1000),
  })
  .strict();

export const conversationsRouter = Router();

conversationsRouter.use(protect, requireVerifiedEmail);

conversationsRouter.get('/', controller.listConversations);
conversationsRouter.post(
  '/',
  validateBody(createConversationSchema),
  controller.createConversation
);
conversationsRouter.get('/:id', controller.getConversation);
conversationsRouter.get('/:id/messages', controller.getMessages);
conversationsRouter.post('/:id/messages', validateBody(sendMessageSchema), controller.sendMessage);
conversationsRouter.post('/:id/read', controller.markRead);
