-- Route scoring columns for Airbnb-style fair distribution
-- admin_boost_multiplier: 1.0 = normal, >1 = boosted, <1 = suppressed, 0 = hidden
-- impression_count: how many times route was shown in search results (for fair rotation)
-- last_featured_at: when the route was last in the featured section (for rotation)

ALTER TABLE routes ADD COLUMN IF NOT EXISTS admin_boost_multiplier REAL DEFAULT 1.0;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS impression_count INTEGER DEFAULT 0;
ALTER TABLE routes ADD COLUMN IF NOT EXISTS last_featured_at TIMESTAMPTZ;

-- Index for scoring queries (public routes ordered by impression count for fair distribution)
CREATE INDEX IF NOT EXISTS idx_routes_scoring ON routes (is_public, impression_count, avg_rating)
  WHERE owner_user_id IS NOT NULL;
