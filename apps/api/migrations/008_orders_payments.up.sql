CREATE TABLE IF NOT EXISTS orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
  listing_id UUID NOT NULL REFERENCES listings (listing_id) ON DELETE RESTRICT,
  offer_id UUID REFERENCES offers (offer_id) ON DELETE SET NULL,
  delivery_mode TEXT NOT NULL CHECK (delivery_mode IN ('pickup_home', 'midpoint', 'home_delivery')),
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment',
      'payment_review',
      'paid',
      'handover_pending',
      'delivered',
      'completed',
      'payout_pending',
      'paid_out',
      'disputed',
      'refunded',
      'cancelled',
      'expired'
    )),
  item_price_ars INTEGER NOT NULL CHECK (item_price_ars > 0),
  midpoint_fee_ars INTEGER NOT NULL DEFAULT 0 CHECK (midpoint_fee_ars >= 0),
  tasa_percent INTEGER NOT NULL CHECK (tasa_percent >= 0),
  tasa_fixed_ars INTEGER NOT NULL CHECK (tasa_fixed_ars >= 0),
  tasa_amount_ars INTEGER NOT NULL CHECK (tasa_amount_ars >= 0),
  total_amount_ars INTEGER NOT NULL CHECK (total_amount_ars > 0),
  seller_payout_ars INTEGER NOT NULL CHECK (seller_payout_ars > 0),
  listing_title_snapshot TEXT NOT NULL,
  listing_photo_url_snapshot TEXT,
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  claim_window_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_buyer_seller_different CHECK (buyer_id <> seller_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON orders (listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_claim_window ON orders (claim_window_ends_at)
  WHERE status = 'delivered';

CREATE UNIQUE INDEX IF NOT EXISTS orders_active_listing_unique ON orders (listing_id)
  WHERE status IN (
    'paid',
    'handover_pending',
    'delivered',
    'completed',
    'payout_pending',
    'paid_out',
    'disputed'
  );

CREATE UNIQUE INDEX IF NOT EXISTS orders_active_buyer_listing_unique
  ON orders (buyer_id, listing_id)
  WHERE status IN (
    'pending_payment',
    'payment_review',
    'paid',
    'handover_pending',
    'delivered',
    'completed',
    'payout_pending',
    'paid_out',
    'disputed'
  );

CREATE TABLE IF NOT EXISTS order_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_id UUID REFERENCES users (user_id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id
  ON order_events (order_id, created_at ASC);

CREATE TABLE IF NOT EXISTS delivery_codes (
  code_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders (order_id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  code_encrypted TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS delivery_codes_hash_unique ON delivery_codes (code_hash);

CREATE TABLE IF NOT EXISTS payments (
  payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders (order_id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'talo',
  provider_payment_id TEXT NOT NULL UNIQUE,
  external_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SUCCESS', 'OVERPAID', 'UNDERPAID', 'EXPIRED')),
  amount_ars INTEGER NOT NULL CHECK (amount_ars > 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  cvu TEXT,
  alias TEXT,
  payment_url TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_expires_at ON payments (expires_at)
  WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS payment_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments (payment_id) ON DELETE CASCADE,
  provider_payment_id TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id
  ON payment_events (payment_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_payment_events_provider_payment_id
  ON payment_events (provider_payment_id);

CREATE TABLE IF NOT EXISTS refunds (
  refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (order_id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL REFERENCES payments (payment_id) ON DELETE RESTRICT,
  provider_refund_id TEXT UNIQUE,
  refund_type TEXT NOT NULL CHECK (refund_type IN ('FULL', 'PARTIAL')),
  amount_ars INTEGER NOT NULL CHECK (amount_ars > 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  reason TEXT,
  requested_by UUID REFERENCES users (user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds (payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS refunds_pending_unique
  ON refunds (payment_id) WHERE status = 'PENDING';
