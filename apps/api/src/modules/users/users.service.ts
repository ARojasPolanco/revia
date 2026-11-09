import { AppError } from '../../errors/appError.js';
import { toPublicUser, type PublicUser } from '../auth/auth.service.js';
import { User } from './user.model.js';

export async function getPublicProfile(userId: string): Promise<PublicUser> {
  const user = await User.findByPk(userId);

  if (!user || user.isDeleted) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return toPublicUser(user);
}
