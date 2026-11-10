import { Op } from 'sequelize';
import { AppError } from '../../errors/appError.js';
import { toPublicUser, type PublicUser } from '../auth/auth.service.js';
import { Listing } from '../listings/listing.model.js';
import { ListingPhoto } from '../listings/listingPhoto.model.js';
import { createNotification } from '../notifications/notifications.service.js';
import { User } from '../users/user.model.js';
import { isBlockedEither } from '../users/userModeration.service.js';
import { Conversation } from './conversation.model.js';
import { Message } from './message.model.js';

export interface ConversationView {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPhoto: string | null;
  otherUser: PublicUser | null;
  lastMessage: string | null;
  unreadCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
}

export interface MessageView {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  flaggedContact: boolean;
  flaggedReasons: string[];
  createdAt: Date;
}

export const CONTACT_WARNING =
  'Por tu seguridad, evitá compartir teléfonos, emails, redes o datos de pago. La coordinación y la protección de REVIA se pierden fuera de la plataforma.';

function toMessageView(message: Message): MessageView {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    body: message.body,
    flaggedContact: message.flaggedContact,
    flaggedReasons: message.flaggedReasons,
    createdAt: message.createdAt,
  };
}

async function getParticipantConversation(
  userId: string,
  conversationId: string
): Promise<Conversation> {
  const conversation = await Conversation.findByPk(conversationId);

  if (!conversation || (conversation.buyerId !== userId && conversation.sellerId !== userId)) {
    throw new AppError('No encontramos esa conversación.', 404);
  }

  return conversation;
}

async function getConversationView(
  conversation: Conversation,
  userId: string
): Promise<ConversationView> {
  const otherUserId =
    conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;

  const [otherUser, listing, lastMessage] = await Promise.all([
    User.findByPk(otherUserId),
    Listing.findByPk(conversation.listingId, {
      attributes: ['id', 'title'],
    }),
    Message.findOne({
      where: { conversationId: conversation.id },
      order: [['createdAt', 'DESC']],
    }),
  ]);
  const photo = await ListingPhoto.findOne({
    where: { listingId: conversation.listingId, isDeleted: false },
    order: [['sortOrder', 'ASC']],
  });
  const lastReadAt =
    conversation.buyerId === userId ? conversation.buyerLastReadAt : conversation.sellerLastReadAt;
  const unreadCount = await Message.count({
    where: {
      conversationId: conversation.id,
      senderId: { [Op.ne]: userId },
      ...(lastReadAt ? { createdAt: { [Op.gt]: lastReadAt } } : {}),
    },
  });

  return {
    id: conversation.id,
    listingId: conversation.listingId,
    listingTitle: listing?.title ?? 'Publicación',
    listingPhoto: photo?.thumbnailUrl ?? null,
    otherUser: otherUser && !otherUser.isDeleted ? toPublicUser(otherUser) : null,
    lastMessage: lastMessage?.body ?? null,
    unreadCount,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
  };
}

export async function createConversation(
  userId: string,
  listingId: string
): Promise<ConversationView> {
  const listing = await Listing.findByPk(listingId);

  if (!listing || listing.isDeleted || listing.status !== 'active') {
    throw new AppError('No encontramos lo que buscabas.', 404);
  }

  if (listing.sellerId === userId) {
    throw new AppError('No podés iniciar un chat con tu propia publicación.', 400);
  }

  const [conversation] = await Conversation.findOrCreate({
    where: {
      listingId,
      buyerId: userId,
      sellerId: listing.sellerId,
    },
  });

  return getConversationView(conversation, userId);
}

export async function getConversation(
  userId: string,
  conversationId: string
): Promise<ConversationView> {
  const conversation = await getParticipantConversation(userId, conversationId);

  return getConversationView(conversation, userId);
}

export async function listConversations(userId: string): Promise<ConversationView[]> {
  const conversations = await Conversation.findAll({
    where: {
      [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
    },
    order: [['createdAt', 'DESC']],
  });

  const views = await Promise.all(
    conversations.map((conversation) => getConversationView(conversation, userId))
  );

  return views.sort((left, right) => {
    const leftDate = left.lastMessageAt ?? left.createdAt;
    const rightDate = right.lastMessageAt ?? right.createdAt;
    return new Date(rightDate).getTime() - new Date(leftDate).getTime();
  });
}

export async function getMessages(
  userId: string,
  conversationId: string,
  after?: string
): Promise<MessageView[]> {
  await getParticipantConversation(userId, conversationId);

  const where: Record<string, unknown> = {
    conversationId,
  };

  if (after) {
    const date = new Date(after);

    if (!Number.isNaN(date.getTime())) {
      where.createdAt = { [Op.gt]: date };
    }
  }

  const messages = await Message.findAll({
    where,
    order: [['createdAt', 'ASC']],
    limit: 50,
  });

  return messages.map(toMessageView);
}

export async function sendMessage(
  userId: string,
  conversationId: string,
  body: string
): Promise<{ message: MessageView; warning: string | null }> {
  const conversation = await getParticipantConversation(userId, conversationId);
  const otherUserId =
    conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;

  if (await isBlockedEither(userId, otherUserId)) {
    throw new AppError('No podés enviar mensajes a este usuario.', 403);
  }

  const reasons = detectContactInfo(body);
  const message = await Message.create({
    conversationId,
    senderId: userId,
    body,
    flaggedContact: reasons.length > 0,
    flaggedReasons: reasons,
  });

  await conversation.update({ lastMessageAt: new Date() });

  const sender = await User.findByPk(userId);

  await createNotification({
    userId: otherUserId,
    type: 'new_message',
    title: 'Nuevo mensaje',
    body: `${sender?.fullName ?? 'Alguien'}: ${body.slice(0, 80)}`,
    data: { conversationId },
  });

  return {
    message: toMessageView(message),
    warning: reasons.length > 0 ? CONTACT_WARNING : null,
  };
}

export async function markConversationRead(userId: string, conversationId: string): Promise<void> {
  const conversation = await getParticipantConversation(userId, conversationId);

  await conversation.update(
    conversation.buyerId === userId
      ? { buyerLastReadAt: new Date() }
      : { sellerLastReadAt: new Date() }
  );
}

export function detectContactInfo(body: string): string[] {
  const reasons = new Set<string>();

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(body)) {
    reasons.add('email');
  }

  if (/(?:\+?54[\s-]?)?(?:11|2\d{2,3}|3\d{2,3})[\s-]?\d{4}[\s-]?\d{4}/.test(body)) {
    reasons.add('teléfono');
  }

  if (/\b(instagram|whatsapp|wsp|telegram|facebook|tiktok|ig)\b/i.test(body)) {
    reasons.add('redes sociales');
  }

  if (/\b\d{10,}\b/.test(body) || /\b(alias|cvu|cbu)\b/i.test(body)) {
    reasons.add('datos de pago');
  }

  return [...reasons];
}
