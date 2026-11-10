import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OrderEvent } from '@/lib/orders';

import { OrderTimeline } from '../OrderTimeline';

const events: OrderEvent[] = [
  {
    id: 'event-1',
    type: 'payment_confirmed',
    actor: null,
    data: {},
    createdAt: '2026-01-01T12:00:00.000Z',
  },
  {
    id: 'event-2',
    type: 'delivery_validated',
    actor: {
      id: 'seller-1',
      fullName: 'Vendedor Demo',
      bio: null,
      location: 'Bahía Blanca',
      avatarUrl: null,
      sellerVerified: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    data: {},
    createdAt: '2026-01-02T12:00:00.000Z',
  },
];

describe('OrderTimeline', () => {
  it('muestra los eventos de la orden y el actor', () => {
    render(<OrderTimeline events={events} />);

    expect(screen.getByText('Pago confirmado')).toBeInTheDocument();
    expect(screen.getByText('Entrega confirmada por el vendedor')).toBeInTheDocument();
    expect(screen.getByText(/Vendedor Demo/)).toBeInTheDocument();
  });
});
