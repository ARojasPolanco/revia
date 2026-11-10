import type { PublicSeller } from './listings';

export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPhoto: string | null;
  otherUser: PublicSeller | null;
  lastMessage: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  flaggedContact: boolean;
  flaggedReasons: string[];
  createdAt: string;
}
