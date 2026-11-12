import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';
import { OrderReviews } from '../OrderReviews';

const reviewState = {
  reviews: [
    {
      id: 'review-1',
      orderId: 'order-1',
      rating: 5,
      comment: 'Excelente experiencia.',
      isVisible: true,
      author: {
        id: 'author-1',
        fullName: 'Comprador Demo',
        bio: null,
        location: 'Bahía Blanca',
        avatarUrl: null,
        sellerVerified: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      target: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  canReview: true,
  reason: null,
  reviewWindowEndsAt: '2026-12-01T00:00:00.000Z',
};

describe('OrderReviews', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockResolvedValue(reviewState);
  });

  it('muestra reseñas y el formulario cuando la orden es reseñable', async () => {
    render(<OrderReviews orderId="order-1" />);

    expect(await screen.findByText('Excelente experiencia.')).toBeInTheDocument();
    expect(screen.getByText(/Comprador Demo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar reseña' })).toBeInTheDocument();
  });
});
