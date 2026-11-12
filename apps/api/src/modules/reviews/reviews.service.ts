import type { Includeable } from 'sequelize';
import { DEFAULTS } from '@revia/shared';
import { AppError } from '../../errors/appError.js';
import { toPublicUser, type PublicUser } from '../auth/auth.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import { Order } from '../orders/order.model.js';
import { OrderEvent } from '../orders/orderEvent.model.js';
import { User } from '../users/user.model.js';
import { Review } from './review.model.js';
import { ReviewReport } from './reviewReport.model.js';

export interface ReviewView {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  author: PublicUser | null;
  target: PublicUser | null;
  createdAt: Date;
}

export interface ReviewList {
  reviews: ReviewView[];
  averageRating: number | null;
  total: number;
}

export interface OrderReviewState {
  reviews: ReviewView[];
  canReview: boolean;
  reason: string | null;
  reviewWindowEndsAt: Date | null;
}

type ReviewWithRelations = Review & {
  author?: User | null;
  target?: User | null;
};

const userAttributes = [
  'id',
  'fullName',
  'bio',
  'location',
  'avatarUrl',
  'sellerVerifiedAt',
  'createdAt',
];

const reviewIncludes: Includeable[] = [
  { model: User, as: 'author', attributes: userAttributes },
  { model: User, as: 'target', attributes: userAttributes },
];

function toReviewView(review: Review): ReviewView {
  const related = review as ReviewWithRelations;

  return {
    id: review.id,
    orderId: review.orderId,
    rating: review.rating,
    comment: review.comment,
    isVisible: review.isVisible,
    author: related.author ? toPublicUser(related.author) : null,
    target: related.target ? toPublicUser(related.target) : null,
    createdAt: review.createdAt,
  };
}

function completedStatuses(): string[] {
  return ['completed', 'payout_pending', 'paid_out'];
}

export async function createReview(
  authorId: string,
  orderId: string,
  input: { rating: number; comment?: string }
): Promise<ReviewView> {
  const order = await Order.findByPk(orderId);

  if (!order || (order.buyerId !== authorId && order.sellerId !== authorId)) {
    throw new AppError('No encontramos esa compra.', 404);
  }

  if (!completedStatuses().includes(order.status) || !order.completedAt) {
    throw new AppError('Solo podés reseñar una compra completada.', 409);
  }

  const windowEndsAt = new Date(
    order.completedAt.getTime() + DEFAULTS.maxReviewWindowDays * 24 * 60 * 60 * 1000
  );

  if (windowEndsAt.getTime() < Date.now()) {
    throw new AppError('El plazo de 30 días para reseñar venció.', 409);
  }

  const existing = await Review.findOne({ where: { orderId, authorId } });

  if (existing) {
    throw new AppError('Ya dejaste una reseña para esta compra.', 409);
  }

  const targetId = order.buyerId === authorId ? order.sellerId : order.buyerId;
  const review = await Review.create({
    orderId,
    authorId,
    targetId,
    rating: input.rating,
    comment: input.comment ?? null,
  });

  await OrderEvent.create({
    orderId,
    type: 'review_received',
    actorId: authorId,
    data: { rating: input.rating },
  });

  await createNotification({
    userId: targetId,
    type: 'review_received',
    title: 'Nueva reseña',
    body: `Recibiste una reseña de ${input.rating} estrella(s) por una compra en REVIA.`,
    data: { orderId, reviewId: review.id },
  });

  const withRelations = await Review.findByPk(review.id, { include: reviewIncludes });

  return toReviewView(withRelations ?? review);
}

export async function listReviewsForUser(userId: string): Promise<ReviewList> {
  const user = await User.findByPk(userId);

  if (!user || user.isDeleted) {
    throw new AppError('No encontramos ese usuario.', 404);
  }

  const reviews = await Review.findAll({
    where: { targetId: userId, isVisible: true },
    include: reviewIncludes,
    order: [['createdAt', 'DESC']],
    limit: 50,
  });

  const average =
    reviews.length > 0
      ? Number(
          (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
        )
      : null;

  return {
    reviews: reviews.map(toReviewView),
    averageRating: average,
    total: reviews.length,
  };
}

export async function getOrderReviewState(
  userId: string,
  orderId: string
): Promise<OrderReviewState> {
  const order = await Order.findByPk(orderId);

  if (!order || (order.buyerId !== userId && order.sellerId !== userId)) {
    throw new AppError('No encontramos esa compra.', 404);
  }

  const reviews = await Review.findAll({
    where: { orderId },
    include: reviewIncludes,
    order: [['createdAt', 'ASC']],
  });
  const existing = reviews.find((review) => review.authorId === userId);
  const windowEndsAt = order.completedAt
    ? new Date(order.completedAt.getTime() + DEFAULTS.maxReviewWindowDays * 24 * 60 * 60 * 1000)
    : null;
  let canReview = false;
  let reason: string | null = null;

  if (!completedStatuses().includes(order.status) || !order.completedAt) {
    reason = 'La compra todavía no está completada.';
  } else if (windowEndsAt && windowEndsAt.getTime() < Date.now()) {
    reason = 'El plazo de 30 días para reseñar venció.';
  } else if (existing) {
    reason = 'Ya dejaste una reseña para esta compra.';
  } else {
    canReview = true;
  }

  return {
    reviews: reviews.map(toReviewView),
    canReview,
    reason,
    reviewWindowEndsAt: windowEndsAt,
  };
}

export async function reportReview(
  reporterId: string,
  reviewId: string,
  reason: string
): Promise<void> {
  const review = await Review.findByPk(reviewId);

  if (!review || !review.isVisible) {
    throw new AppError('No encontramos esa reseña.', 404);
  }

  const existing = await ReviewReport.findOne({
    where: { reviewId, reporterId, status: 'open' },
  });

  if (existing) {
    throw new AppError('Ya denunciaste esta reseña.', 409);
  }

  await ReviewReport.create({
    reviewId,
    reporterId,
    reason,
    status: 'open',
  });
}

export async function listReviewReports(status = 'open'): Promise<
  {
    id: string;
    reason: string;
    status: string;
    createdAt: Date;
    review: ReviewView | null;
    reporter: PublicUser | null;
  }[]
> {
  const reports = await ReviewReport.findAll({
    where: { status },
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  const result: {
    id: string;
    reason: string;
    status: string;
    createdAt: Date;
    review: ReviewView | null;
    reporter: PublicUser | null;
  }[] = [];

  for (const report of reports) {
    const review = await Review.findByPk(report.reviewId, { include: reviewIncludes });
    const reporter = await User.findByPk(report.reporterId);

    result.push({
      id: report.id,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt,
      review: review ? toReviewView(review) : null,
      reporter: reporter ? toPublicUser(reporter) : null,
    });
  }

  return result;
}

export async function setReviewVisibility(
  reviewId: string,
  isVisible: boolean
): Promise<ReviewView> {
  const review = await Review.findByPk(reviewId, { include: reviewIncludes });

  if (!review) {
    throw new AppError('No encontramos esa reseña.', 404);
  }

  await review.update({ isVisible });
  await ReviewReport.update(
    { status: isVisible ? 'dismissed' : 'resolved' },
    { where: { reviewId, status: 'open' } }
  );

  return toReviewView(review);
}

export async function resolveReviewReport(
  reportId: string,
  status: 'resolved' | 'dismissed'
): Promise<void> {
  const report = await ReviewReport.findByPk(reportId);

  if (!report) {
    throw new AppError('No encontramos esa denuncia.', 404);
  }

  await report.update({ status });
}
