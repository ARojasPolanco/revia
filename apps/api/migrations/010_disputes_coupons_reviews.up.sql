CREATE TABLE IF NOT EXISTS coupons (
  coupon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  amount_ars INTEGER NOT NULL CHECK (amount_ars > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_order_id UUID REFERENCES orders (order_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_user_id ON coupons (user_id, status);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons (expires_at)
  WHERE status = 'active';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id UUID
  REFERENCES coupons (coupon_id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_amount_ars INTEGER NOT NULL DEFAULT 0
  CHECK (coupon_amount_ars >= 0);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  redemption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons (coupon_id) ON DELETE CASCADE,
  order_id UUID NOT NULL UNIQUE REFERENCES orders (order_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  amount_ars INTEGER NOT NULL CHECK (amount_ars > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id
  ON coupon_redemptions (coupon_id);

CREATE TABLE IF NOT EXISTS disputes (
  dispute_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders (order_id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (reason IN ('not_received', 'not_as_described')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN (
      'open',
      'under_review',
      'resolved_refund',
      'resolved_coupon',
      'resolved_rejected',
      'cancelled'
    )),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users (user_id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  sla_due_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_buyer_id ON disputes (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_seller_id ON disputes (seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);
CREATE INDEX IF NOT EXISTS idx_disputes_sla_due_at ON disputes (sla_due_at)
  WHERE status IN ('open', 'under_review');

CREATE TABLE IF NOT EXISTS dispute_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes (dispute_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  actor_id UUID REFERENCES users (user_id) ON DELETE SET NULL,
  message TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_events_dispute_id
  ON dispute_events (dispute_id, created_at ASC);

CREATE TABLE IF NOT EXISTS dispute_evidence (
  evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes (dispute_id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video', 'text', 'link')),
  url TEXT,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id
  ON dispute_evidence (dispute_id, created_at ASC);

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS source_dispute_id UUID
  REFERENCES disputes (dispute_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coupons_source_dispute_id
  ON coupons (source_dispute_id);

CREATE TABLE IF NOT EXISTS reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reviews_order_author_unique UNIQUE (order_id, author_id),
  CONSTRAINT reviews_not_self CHECK (author_id <> target_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_target_id ON reviews (target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews (order_id);

CREATE TABLE IF NOT EXISTS review_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews (review_id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports (review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports (status);
