CREATE TABLE IF NOT EXISTS categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories (category_id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories (is_active);

CREATE TABLE IF NOT EXISTS category_attributes (
  attribute_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories (category_id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'select', 'boolean')),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT category_attributes_category_key_unique UNIQUE (category_id, key)
);

CREATE INDEX IF NOT EXISTS idx_category_attributes_category_id
  ON category_attributes (category_id);

CREATE TABLE IF NOT EXISTS listings (
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories (category_id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  condition TEXT NOT NULL
    CHECK (condition IN ('new_with_tags', 'new_without_tags', 'very_good', 'good', 'fair')),
  price_ars INTEGER NOT NULL CHECK (price_ars > 0),
  delivery_modes TEXT[] NOT NULL DEFAULT '{}',
  midpoint_fee_ars INTEGER NOT NULL DEFAULT 0 CHECK (midpoint_fee_ars >= 0),
  allow_offers BOOLEAN NOT NULL DEFAULT TRUE,
  location TEXT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'active', 'rejected', 'paused', 'sold', 'deleted')),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users (user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings (category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings (created_at DESC);

CREATE TABLE IF NOT EXISTS listing_photos (
  photo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (listing_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_id ON listing_photos (listing_id);

CREATE TABLE IF NOT EXISTS listing_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (listing_id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_reports_listing_id ON listing_reports (listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_reports_status ON listing_reports (status);
