import { Category } from '../modules/categories/category.model.js';
import { CategoryAttribute } from '../modules/categories/categoryAttribute.model.js';
import { Conversation } from '../modules/chat/conversation.model.js';
import { Message } from '../modules/chat/message.model.js';
import { Listing } from '../modules/listings/listing.model.js';
import { ListingPhoto } from '../modules/listings/listingPhoto.model.js';
import { ListingReport } from '../modules/listings/listingReport.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { Offer } from '../modules/offers/offer.model.js';
import { User } from '../modules/users/user.model.js';
import { UserBlock } from '../modules/users/userBlock.model.js';
import { UserReport } from '../modules/users/userReport.model.js';

let initialized = false;

export function setupAssociations(): void {
  if (initialized) {
    return;
  }

  initialized = true;

  User.hasMany(Listing, { foreignKey: 'sellerId', as: 'listings' });
  Listing.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

  Category.hasMany(Listing, { foreignKey: 'categoryId', as: 'listings' });
  Listing.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

  Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });
  Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });

  Category.hasMany(CategoryAttribute, { foreignKey: 'categoryId', as: 'attributes' });
  CategoryAttribute.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

  Listing.hasMany(ListingPhoto, { foreignKey: 'listingId', as: 'photos' });
  ListingPhoto.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });

  Listing.hasMany(ListingReport, { foreignKey: 'listingId', as: 'reports' });
  ListingReport.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });
  ListingReport.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

  Listing.hasMany(Offer, { foreignKey: 'listingId', as: 'offers' });
  Offer.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });
  Offer.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
  Offer.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

  Conversation.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });
  Conversation.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
  Conversation.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
  Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
  Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
  Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

  Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });

  UserBlock.belongsTo(User, { foreignKey: 'blockerId', as: 'blocker' });
  UserBlock.belongsTo(User, { foreignKey: 'blockedId', as: 'blocked' });
  UserReport.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
  UserReport.belongsTo(User, { foreignKey: 'reportedId', as: 'reported' });
}

setupAssociations();
