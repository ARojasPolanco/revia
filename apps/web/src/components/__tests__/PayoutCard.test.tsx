import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Payout } from '@/lib/payouts';

import { PayoutCard } from '../PayoutCard';

const payout: Payout = {
  id: 'payout-1',
  orderId: 'order-1',
  amountArs: 15_000,
  status: 'pending',
  blockReason: 'payout_account_missing',
  blockReasonLabel: 'El vendedor no configuró su cuenta de cobro.',
  operationId: null,
  receiptUrl: null,
  receiptAvailable: false,
  slaDueAt: '2026-11-13T15:00:00.000Z',
  paidAt: null,
  failedAt: null,
  failureReason: null,
  createdAt: '2026-11-10T15:00:00.000Z',
  order: {
    id: 'order-1',
    title: 'Campera payout',
    completedAt: '2026-11-10T15:00:00.000Z',
  },
  seller: null,
  account: null,
  events: [
    {
      id: 'event-1',
      type: 'payout_created',
      actor: null,
      data: {},
      createdAt: '2026-11-10T15:00:00.000Z',
    },
  ],
};

describe('PayoutCard', () => {
  it('muestra el payout, su bloqueo y la falta de comprobante', () => {
    render(<PayoutCard payout={payout} />);

    expect(screen.getByText('Campera payout')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText(/no configuró su cuenta de cobro/)).toBeInTheDocument();
    expect(screen.getByText(/15\.000/)).toBeInTheDocument();
    expect(screen.getByText(/El comprobante estará disponible/)).toBeInTheDocument();
  });
});
