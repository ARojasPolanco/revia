import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Offer } from '@/lib/offers';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { OfferCard } from '../OfferCard';

const offer: Offer = {
  id: 'offer-1',
  listingId: 'listing-1',
  listingTitle: 'Campera de prueba',
  listingPriceArs: 15_000,
  buyer: {
    id: 'buyer-1',
    fullName: 'Comprador Demo',
    bio: null,
    location: 'Bahía Blanca',
    avatarUrl: null,
    sellerVerified: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  seller: null,
  amountArs: 12_000,
  status: 'pending',
  direction: 'buyer_to_seller',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  paymentExpiresAt: null,
  acceptedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('OfferCard', () => {
  it('muestra una oferta recibida y permite aceptarla', () => {
    const onAccept = vi.fn();

    render(
      <OfferCard
        offer={offer}
        mode="received"
        busy={false}
        onAccept={onAccept}
        onReject={vi.fn()}
        onCounter={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Campera de prueba')).toBeInTheDocument();
    expect(screen.getByText(/Comprador Demo/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));

    expect(onAccept).toHaveBeenCalledWith(offer);
  });
});
