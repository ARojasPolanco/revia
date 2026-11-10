CREATE TABLE IF NOT EXISTS offers (
  offer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (listing_id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  parent_offer_id UUID REFERENCES offers (offer_id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('buyer_to_seller', 'seller_to_buyer')),
  amount_ars INTEGER NOT NULL CHECK (amount_ars > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  payment_expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS offers_pending_unique
  ON offers (listing_id, buyer_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON offers (listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON offers (buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON offers (seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers (status);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON offers (expires_at);

CREATE TABLE IF NOT EXISTS conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (listing_id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  buyer_last_read_at TIMESTAMPTZ,
  seller_last_read_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_unique UNIQUE (listing_id, buyer_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON conversations (buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON conversations (seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON conversations (last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations (conversation_id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  flagged_contact BOOLEAN NOT NULL DEFAULT FALSE,
  flagged_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at
  ON notifications (user_id, read_at);

CREATE TABLE IF NOT EXISTS user_blocks (
  block_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON user_blocks (blocked_id);

CREATE TABLE IF NOT EXISTS user_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_reports_not_self CHECK (reporter_id <> reported_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reported_id ON user_reports (reported_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports (status);
