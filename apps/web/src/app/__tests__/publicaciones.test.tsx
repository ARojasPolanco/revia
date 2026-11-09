import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Listing } from '@/lib/listings';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

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
import ListingsPage from '../../app/publicaciones/page';

const listing: Listing = {
  id: 'listing-1',
  title: 'Campera de prueba',
  description: 'Campera de abrigo en buen estado.',
  condition: 'very_good',
  priceArs: 15_000,
  deliveryModes: ['pickup_home'],
  midpointFeeArs: 0,
  allowOffers: true,
  location: 'Bahía Blanca',
  attributes: {},
  status: 'active',
  rejectionReason: null,
  submittedAt: null,
  publishedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  photos: [],
  category: null,
  seller: {
    id: 'seller-1',
    fullName: 'Vendedor Demo',
    bio: null,
    location: 'Bahía Blanca',
    avatarUrl: null,
    sellerVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('ListingsPage', () => {
  it('muestra las publicaciones que devuelve la API', async () => {
    const mockedApiFetch = vi.mocked(apiFetch);

    mockedApiFetch.mockImplementation(((path: string) => {
      if (path.startsWith('/categories')) {
        return Promise.resolve({ categories: [] });
      }

      return Promise.resolve({ listings: [listing] });
    }) as typeof apiFetch);

    render(<ListingsPage />);

    expect(screen.getByRole('heading', { name: 'Publicaciones' })).toBeInTheDocument();
    expect(await screen.findByText('Campera de prueba')).toBeInTheDocument();
    expect(screen.getByText('Vendedor Demo · Perfil verificado')).toBeInTheDocument();
  });
});
