import { Category } from '../modules/categories/category.model.js';
import { CategoryAttribute } from '../modules/categories/categoryAttribute.model.js';
import { Conversation } from '../modules/chat/conversation.model.js';
import { Message } from '../modules/chat/message.model.js';
import { Listing } from '../modules/listings/listing.model.js';
import { ListingPhoto } from '../modules/listings/listingPhoto.model.js';
import { ListingReport } from '../modules/listings/listingReport.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { Offer } from '../modules/offers/offer.model.js';
import { DeliveryCode } from '../modules/orders/deliveryCode.model.js';
import { Order } from '../modules/orders/order.model.js';
import { OrderEvent } from '../modules/orders/orderEvent.model.js';
import { Payment } from '../modules/payments/payment.model.js';
import { PaymentEvent } from '../modules/payments/paymentEvent.model.js';
import { Refund } from '../modules/payments/refund.model.js';
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

  Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
  Order.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
  Order.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });
  Order.belongsTo(Offer, { foreignKey: 'offerId', as: 'offer' });
  User.hasMany(Order, { foreignKey: 'buyerId', as: 'purchases' });
  User.hasMany(Order, { foreignKey: 'sellerId', as: 'sales' });
  Listing.hasMany(Order, { foreignKey: 'listingId', as: 'orders' });

  Order.hasMany(OrderEvent, { foreignKey: 'orderId', as: 'events' });
  OrderEvent.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  OrderEvent.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

  Order.hasOne(DeliveryCode, { foreignKey: 'orderId', as: 'deliveryCode' });
  DeliveryCode.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

  Order.hasOne(Payment, { foreignKey: 'orderId', as: 'payment' });
  Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  Payment.hasMany(PaymentEvent, { foreignKey: 'paymentId', as: 'events' });
  PaymentEvent.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

  Order.hasMany(Refund, { foreignKey: 'orderId', as: 'refunds' });
  Refund.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  Payment.hasMany(Refund, { foreignKey: 'paymentId', as: 'refunds' });
  Refund.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });
  Refund.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
}

setupAssociations();
