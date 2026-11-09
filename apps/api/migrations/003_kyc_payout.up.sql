CREATE TABLE IF NOT EXISTS kyc_verifications (
  kyc_verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'didit',
  provider_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('not_started', 'pending', 'approved', 'rejected', 'manual_review', 'expired')),
  provider_status TEXT,
  reason TEXT,
  last_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_id ON kyc_verifications (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status ON kyc_verifications (status);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_provider_session_id
  ON kyc_verifications (provider_session_id);

CREATE TABLE IF NOT EXISTS payout_accounts (
  payout_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users (user_id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('cbu', 'cvu', 'alias')),
  account_encrypted TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  holder_matches_kyc BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('active', 'pending_review')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_accounts_status ON payout_accounts (status);
