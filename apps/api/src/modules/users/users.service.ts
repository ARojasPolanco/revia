import { AppError } from '../../errors/appError.js';
import { toPublicUser, type PublicUser } from '../auth/auth.service.js';
import { getActiveListingsBySeller } from '../listings/listings.service.js';
import type { ListingView } from '../listings/listings.service.js';
import { Listing } from '../listings/listing.model.js';
import { Follow } from './follow.model.js';
import { User } from './user.model.js';

export interface PublicProfile extends PublicUser {
  stats: {
    followers: number;
    following: number;
    listings: number;
  };
}

export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  const user = await User.findByPk(userId);

  if (!user || user.isDeleted) {
    throw new AppError('No encontramos ese usuario.', 404);
  }

  const [followers, following, listings] = await Promise.all([
    Follow.count({ where: { followedId: userId } }),
    Follow.count({ where: { followerId: userId } }),
    Listing.count({ where: { sellerId: userId, status: 'active', isDeleted: false } }),
  ]);

  return {
    ...toPublicUser(user),
    stats: { followers, following, listings },
  };
}

export async function getUserListings(userId: string): Promise<ListingView[]> {
  const user = await User.findByPk(userId);

  if (!user || user.isDeleted) {
    throw new AppError('No encontramos ese usuario.', 404);
  }

  return getActiveListingsBySeller(userId);
}
