import type { PublicSeller } from './listings';

export interface Review {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  author: PublicSeller | null;
  target: PublicSeller | null;
  createdAt: string;
}

export interface ReviewList {
  reviews: Review[];
  averageRating: number | null;
  total: number;
}

export interface OrderReviewState {
  reviews: Review[];
  canReview: boolean;
  reason: string | null;
  reviewWindowEndsAt: string | null;
}
