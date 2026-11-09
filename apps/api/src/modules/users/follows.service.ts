import { Op } from 'sequelize';
import { AppError } from '../../errors/appError.js';
import { toPublicUser, type PublicUser } from '../auth/auth.service.js';
import { Follow } from './follow.model.js';
import { User } from './user.model.js';

export async function followUser(followerId: string, followedId: string): Promise<void> {
  if (followerId === followedId) {
    throw new AppError('No podés seguirte a vos mismo.', 400);
  }

  const followed = await User.findByPk(followedId);

  if (!followed || followed.isDeleted) {
    throw new AppError('No encontramos ese usuario.', 404);
  }

  await Follow.findOrCreate({
    where: { followerId, followedId },
  });
}

export async function unfollowUser(followerId: string, followedId: string): Promise<void> {
  await Follow.destroy({
    where: { followerId, followedId },
  });
}

export async function isFollowing(followerId: string, followedId: string): Promise<boolean> {
  const count = await Follow.count({
    where: { followerId, followedId },
  });

  return count > 0;
}

async function mapFollows(
  follows: Follow[],
  field: 'followerId' | 'followedId'
): Promise<PublicUser[]> {
  const ids = follows.map((follow) => follow[field]);

  if (ids.length === 0) {
    return [];
  }

  const users = await User.findAll({
    where: { id: { [Op.in]: ids }, isDeleted: false },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));

  return follows
    .map((follow) => usersById.get(follow[field]))
    .filter((user): user is User => Boolean(user))
    .map(toPublicUser);
}

export async function getFollowing(userId: string): Promise<PublicUser[]> {
  const follows = await Follow.findAll({
    where: { followerId: userId },
    order: [['createdAt', 'DESC']],
  });

  return mapFollows(follows, 'followedId');
}

export async function getFollowers(userId: string): Promise<PublicUser[]> {
  const follows = await Follow.findAll({
    where: { followedId: userId },
    order: [['createdAt', 'DESC']],
  });

  return mapFollows(follows, 'followerId');
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const follows = await Follow.findAll({
    where: { followerId: userId },
    attributes: ['followedId'],
  });

  return follows.map((follow) => follow.followedId);
}
