import type { Request, Response } from 'express';
import { uuidSchema } from '@revia/shared';
import { catchAsync } from '../../errors/catchAsync.js';
import { AppError } from '../../errors/appError.js';
import { toSelfUser } from '../auth/auth.service.js';
import { saveAvatar } from './avatar.service.js';
import * as usersService from './users.service.js';

export const getPublicProfile = catchAsync(async (req: Request, res: Response) => {
  const parsedId = uuidSchema.safeParse(req.params.id);

  if (!parsedId.success) {
    throw new AppError('No encontramos lo que buscabas.', 400);
  }

  const user = await usersService.getPublicProfile(parsedId.data);

  res.status(200).json({
    status: 'success',
    user,
  });
});

export const uploadAvatar = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('Seleccioná una foto para subir.', 422);
  }

  const { user } = await saveAvatar(req.user!.id, req.file.buffer);

  res.status(200).json({
    status: 'success',
    user: toSelfUser(user),
  });
});
