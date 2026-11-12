import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Order } from '@/lib/orders';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { OrderCard } from '../OrderCard';

const order: Order = {
  id: 'order-1',
  role: 'buyer',
  couponId: null,
  couponAmountArs: 0,
  status: 'pending_payment',
  deliveryMode: 'pickup_home',
  itemPriceArs: 15_000,
  midpointFeeArs: 0,
  tasaPercent: 7,
  tasaFixedArs: 500,
  tasaAmountArs: 1_550,
  totalAmountArs: 16_550,
  sellerPayoutArs: 15_000,
  listing: {
    id: 'listing-1',
    title: 'Campera de prueba',
    photoUrl: null,
  },
  buyer: null,
  seller: {
    id: 'seller-1',
    fullName: 'Vendedor Demo',
    bio: null,
    location: 'Bahía Blanca',
    avatarUrl: null,
    sellerVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  payment: null,
  deliveryCode: null,
  deliveryCodeUsed: false,
  claimWindowEndsAt: null,
  paidAt: null,
  deliveredAt: null,
  completedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  events: [],
  actions: {
    canPay: true,
    canConfirmReceipt: false,
    canValidateCode: false,
    canCancel: true,
    canMarkHandover: false,
  },
};

describe('OrderCard', () => {
  it('muestra la compra, el vendedor, el estado y el total', () => {
    render(<OrderCard order={order} href="/compras/order-1" />);

    expect(screen.getByText('Campera de prueba')).toBeInTheDocument();
    expect(screen.getByText(/Vendedor Demo/)).toBeInTheDocument();
    expect(screen.getByText('Pendiente de pago')).toBeInTheDocument();
    expect(screen.getByText(/16\.550/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Campera de prueba/ })[0]).toHaveAttribute(
      'href',
      '/compras/order-1'
    );
  });
});
