import type { Request, Response } from 'express';
import { uuidSchema } from '@revia/shared';
import { catchAsync } from '../../errors/catchAsync.js';
import { AppError } from '../../errors/appError.js';
import * as usersService from './users.service.js';

export const getPublicProfile = catchAsync(async (req: Request, res: Response) => {
  const parsedId = uuidSchema.safeParse(req.params.id);

  if (!parsedId.success) {
    throw new AppError('ID inválido', 400);
  }

  const user = await usersService.getPublicProfile(parsedId.data);

  res.status(200).json({
    status: 'success',
    user,
  });
});
