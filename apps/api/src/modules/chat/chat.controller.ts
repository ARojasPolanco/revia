import type { Request, Response } from 'express';
import { uuidSchema } from '@revia/shared';
import { catchAsync } from '../../errors/catchAsync.js';
import { AppError } from '../../errors/appError.js';
import * as chatService from './chat.service.js';

function parseId(value: string | undefined): string {
  const parsed = uuidSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError('No encontramos esa conversación.', 404);
  }

  return parsed.data;
}

export const listConversations = catchAsync(async (req: Request, res: Response) => {
  const conversations = await chatService.listConversations(req.user!.id);

  res.status(200).json({
    status: 'success',
    conversations,
  });
});

export const createConversation = catchAsync(async (req: Request, res: Response) => {
  const conversation = await chatService.createConversation(
    req.user!.id,
    (req.body as { listingId: string }).listingId
  );

  res.status(201).json({
    status: 'success',
    conversation,
  });
});

export const getConversation = catchAsync(async (req: Request, res: Response) => {
  const conversation = await chatService.getConversation(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    conversation,
  });
});

export const getMessages = catchAsync(async (req: Request, res: Response) => {
  const after = typeof req.query.after === 'string' ? req.query.after : undefined;
  const messages = await chatService.getMessages(req.user!.id, parseId(req.params.id), after);

  res.status(200).json({
    status: 'success',
    messages,
  });
});

export const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await chatService.sendMessage(
    req.user!.id,
    parseId(req.params.id),
    (req.body as { body: string }).body
  );

  res.status(201).json({
    status: 'success',
    ...result,
  });
});

export const markRead = catchAsync(async (req: Request, res: Response) => {
  await chatService.markConversationRead(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
  });
});
