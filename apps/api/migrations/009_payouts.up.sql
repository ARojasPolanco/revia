CREATE TABLE IF NOT EXISTS payouts (
  payout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders (order_id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
  payout_account_id UUID REFERENCES payout_accounts (payout_account_id) ON DELETE SET NULL,
  amount_ars INTEGER NOT NULL CHECK (amount_ars > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  block_reason TEXT,
  operation_id TEXT,
  receipt_url TEXT,
  processed_by UUID REFERENCES users (user_id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  sla_due_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_seller_id ON payouts (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts (status);
CREATE INDEX IF NOT EXISTS idx_payouts_sla_due_at ON payouts (sla_due_at)
  WHERE status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS payout_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES payouts (payout_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_id UUID REFERENCES users (user_id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_events_payout_id
  ON payout_events (payout_id, created_at ASC);
