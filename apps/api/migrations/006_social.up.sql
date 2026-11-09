CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_listings_title_trgm
  ON listings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_description_trgm
  ON listings USING gin (description gin_trgm_ops);

CREATE TABLE IF NOT EXISTS follows (
  follow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT follows_pair_unique UNIQUE (follower_id, followed_id),
  CONSTRAINT follows_not_self CHECK (follower_id <> followed_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed_id ON follows (followed_id);

CREATE TABLE IF NOT EXISTS favorites (
  favorite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings (listing_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT favorites_pair_unique UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON favorites (listing_id);
