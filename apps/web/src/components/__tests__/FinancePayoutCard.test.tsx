import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Payout } from '@/lib/payouts';

import { FinancePayoutCard } from '../FinancePayoutCard';

const payout: Payout = {
  id: 'payout-1',
  orderId: 'order-1',
  amountArs: 15_000,
  status: 'processing',
  blockReason: null,
  blockReasonLabel: null,
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
  seller: {
    id: 'seller-1',
    fullName: 'Vendedor Demo',
    bio: null,
    location: 'Bahía Blanca',
    avatarUrl: null,
    sellerVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  account: {
    method: 'alias',
    accountMasked: 're**os',
    holderName: 'Vendedor Demo',
    holderMatchesKyc: true,
    status: 'active',
  },
  events: [
    {
      id: 'event-1',
      type: 'payout_processing',
      actor: null,
      data: {},
      createdAt: '2026-11-10T15:00:00.000Z',
    },
  ],
};

describe('FinancePayoutCard', () => {
  it('permite marcar pagado un payout en proceso', () => {
    const onPaid = vi.fn();

    render(
      <FinancePayoutCard
        payout={payout}
        busy={false}
        onProcessing={vi.fn()}
        onPaid={onPaid}
        onFailed={vi.fn()}
      />
    );

    expect(screen.getAllByText(/Vendedor Demo/).length).toBeGreaterThan(0);
    expect(screen.getByText('En proceso')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Marcar pagado' }));

    expect(onPaid).toHaveBeenCalledWith(payout);
  });
});
