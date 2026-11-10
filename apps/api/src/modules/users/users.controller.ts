import type { Request, Response } from 'express';
import { uuidSchema } from '@revia/shared';
import { catchAsync } from '../../errors/catchAsync.js';
import { AppError } from '../../errors/appError.js';
import { toSelfUser } from '../auth/auth.service.js';
import { saveAvatar } from './avatar.service.js';
import * as followsService from './follows.service.js';
import * as userModerationService from './userModeration.service.js';
import * as usersService from './users.service.js';

function parseId(value: string | undefined): string {
  const parsed = uuidSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError('No encontramos lo que buscabas.', 404);
  }

  return parsed.data;
}

export const getPublicProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await usersService.getPublicProfile(parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    user,
  });
});

export const getUserListings = catchAsync(async (req: Request, res: Response) => {
  const listings = await usersService.getUserListings(parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    listings,
  });
});

export const follow = catchAsync(async (req: Request, res: Response) => {
  await followsService.followUser(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    message: 'Ahora seguís a este vendedor.',
  });
});

export const unfollow = catchAsync(async (req: Request, res: Response) => {
  await followsService.unfollowUser(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    message: 'Dejaste de seguir a este vendedor.',
  });
});

export const getRelationship = catchAsync(async (req: Request, res: Response) => {
  const isFollowing = await followsService.isFollowing(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    isFollowing,
  });
});

export const getFollowing = catchAsync(async (req: Request, res: Response) => {
  const following = await followsService.getFollowing(req.user!.id);

  res.status(200).json({
    status: 'success',
    following,
  });
});

export const getFollowers = catchAsync(async (req: Request, res: Response) => {
  const followers = await followsService.getFollowers(req.user!.id);

  res.status(200).json({
    status: 'success',
    followers,
  });
});

export const block = catchAsync(async (req: Request, res: Response) => {
  await userModerationService.blockUser(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    message: 'Usuario bloqueado.',
  });
});

export const unblock = catchAsync(async (req: Request, res: Response) => {
  await userModerationService.unblockUser(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    message: 'Usuario desbloqueado.',
  });
});

export const report = catchAsync(async (req: Request, res: Response) => {
  await userModerationService.reportUser(
    req.user!.id,
    parseId(req.params.id),
    (req.body as { reason: string }).reason
  );

  res.status(201).json({
    status: 'success',
    message: 'Recibimos tu denuncia. Gracias por avisarnos.',
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
