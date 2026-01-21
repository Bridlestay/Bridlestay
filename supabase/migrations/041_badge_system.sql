-- Badge/Achievement System for padoq

-- ===========================================
-- 1. BADGE DEFINITIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Badge identity
  slug TEXT UNIQUE NOT NULL,              -- e.g., "route_creator_bronze"
  name TEXT NOT NULL,                     -- e.g., "Route Creator (Bronze)"
  description TEXT NOT NULL,              -- e.g., "Created your first 5 routes"
  
  -- Display
  icon TEXT NOT NULL,                     -- Emoji or icon name, e.g., "🗺️" or "compass"
  color TEXT DEFAULT '#3B82F6',           -- Badge color
  
  -- Category
  category TEXT NOT NULL CHECK (category IN (
    'routes',           -- Route creation, completion, reviews
    'stays',            -- Bookings as a guest
    'hosting',          -- Hosting achievements
    'community',        -- Reviews, comments, helping others
    'explorer',         -- Counties/regions visited
    'special'           -- Limited edition, events, etc.
  )),
  
  -- Tier (for progressive badges)
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  tier_order INTEGER DEFAULT 0,           -- For sorting within category
  
  -- Unlock criteria
  criteria_type TEXT NOT NULL CHECK (criteria_type IN (
    'count',            -- Reach a number (e.g., 5 routes created)
    'milestone',        -- One-time achievement
    'streak',           -- Consecutive actions
    'special'           -- Manually awarded
  )),
  criteria_field TEXT,                    -- What to count (e.g., "routes_created")
  criteria_value INTEGER,                 -- Target value (e.g., 5)
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  is_hidden BOOLEAN DEFAULT false,        -- Hidden until unlocked (surprise badges)
  points INTEGER DEFAULT 10,              -- Points value for leaderboards
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 2. USER BADGES (Earned badges)
-- ===========================================
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  
  -- When earned
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Display preference
  is_featured BOOLEAN DEFAULT false,      -- Show on profile prominently
  display_order INTEGER DEFAULT 0,
  
  -- Progress for tiered badges
  progress_value INTEGER,                 -- Current progress if not yet earned next tier
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- User can only earn each badge once
  UNIQUE(user_id, badge_id)
);

-- ===========================================
-- 3. USER STATS TABLE (for badge calculation)
-- ===========================================
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Routes
  routes_created INTEGER DEFAULT 0,
  routes_completed INTEGER DEFAULT 0,
  routes_reviewed INTEGER DEFAULT 0,
  route_photos_uploaded INTEGER DEFAULT 0,
  total_route_distance_km NUMERIC DEFAULT 0,
  
  -- Stays (as guest)
  bookings_completed INTEGER DEFAULT 0,
  counties_visited TEXT[] DEFAULT '{}',
  total_nights_stayed INTEGER DEFAULT 0,
  reviews_written INTEGER DEFAULT 0,
  
  -- Hosting
  properties_listed INTEGER DEFAULT 0,
  bookings_hosted INTEGER DEFAULT 0,
  guests_hosted INTEGER DEFAULT 0,
  host_reviews_received INTEGER DEFAULT 0,
  
  -- Community
  comments_posted INTEGER DEFAULT 0,
  helpful_votes_received INTEGER DEFAULT 0,
  referrals_made INTEGER DEFAULT 0,
  
  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 4. SEED BADGE DEFINITIONS
-- ===========================================
INSERT INTO badges (slug, name, description, icon, category, tier, tier_order, criteria_type, criteria_field, criteria_value, points, rarity) VALUES
  -- ROUTES - Creation
  ('route_creator_bronze', 'Trail Blazer', 'Created your first route', '🗺️', 'routes', 'bronze', 1, 'count', 'routes_created', 1, 10, 'common'),
  ('route_creator_silver', 'Path Finder', 'Created 5 routes', '🧭', 'routes', 'silver', 2, 'count', 'routes_created', 5, 25, 'uncommon'),
  ('route_creator_gold', 'Route Master', 'Created 25 routes', '🏆', 'routes', 'gold', 3, 'count', 'routes_created', 25, 50, 'rare'),
  ('route_creator_platinum', 'Trail Legend', 'Created 100 routes', '⭐', 'routes', 'platinum', 4, 'count', 'routes_created', 100, 100, 'epic'),
  
  -- ROUTES - Completion
  ('route_rider_bronze', 'First Ride', 'Completed your first route', '🐴', 'routes', 'bronze', 1, 'count', 'routes_completed', 1, 10, 'common'),
  ('route_rider_silver', 'Regular Rider', 'Completed 10 routes', '🎠', 'routes', 'silver', 2, 'count', 'routes_completed', 10, 25, 'uncommon'),
  ('route_rider_gold', 'Trail Expert', 'Completed 50 routes', '🏅', 'routes', 'gold', 3, 'count', 'routes_completed', 50, 50, 'rare'),
  
  -- ROUTES - Reviews
  ('route_reviewer_bronze', 'Route Critic', 'Reviewed 5 routes', '📝', 'routes', 'bronze', 1, 'count', 'routes_reviewed', 5, 15, 'common'),
  ('route_reviewer_gold', 'Trail Guide', 'Reviewed 50 routes', '📚', 'routes', 'gold', 2, 'count', 'routes_reviewed', 50, 50, 'rare'),
  
  -- STAYS - Bookings
  ('guest_bronze', 'First Stay', 'Completed your first booking', '🏠', 'stays', 'bronze', 1, 'count', 'bookings_completed', 1, 10, 'common'),
  ('guest_silver', 'Regular Guest', 'Completed 5 stays', '🛏️', 'stays', 'silver', 2, 'count', 'bookings_completed', 5, 25, 'uncommon'),
  ('guest_gold', 'Frequent Traveler', 'Completed 20 stays', '✈️', 'stays', 'gold', 3, 'count', 'bookings_completed', 20, 50, 'rare'),
  ('guest_platinum', 'Road Warrior', 'Completed 50 stays', '🌟', 'stays', 'platinum', 4, 'count', 'bookings_completed', 50, 100, 'epic'),
  
  -- EXPLORER - Counties
  ('explorer_bronze', 'County Visitor', 'Stayed in 3 different counties', '📍', 'explorer', 'bronze', 1, 'count', 'counties_visited_count', 3, 20, 'common'),
  ('explorer_silver', 'Regional Explorer', 'Stayed in 10 different counties', '🗺️', 'explorer', 'silver', 2, 'count', 'counties_visited_count', 10, 40, 'uncommon'),
  ('explorer_gold', 'UK Adventurer', 'Stayed in 25 different counties', '🇬🇧', 'explorer', 'gold', 3, 'count', 'counties_visited_count', 25, 75, 'rare'),
  ('explorer_platinum', 'National Explorer', 'Stayed in 50 different counties', '👑', 'explorer', 'platinum', 4, 'count', 'counties_visited_count', 50, 150, 'epic'),
  
  -- HOSTING
  ('host_bronze', 'New Host', 'Listed your first property', '🏡', 'hosting', 'bronze', 1, 'count', 'properties_listed', 1, 15, 'common'),
  ('host_silver', 'Established Host', 'Hosted 10 bookings', '🔑', 'hosting', 'silver', 2, 'count', 'bookings_hosted', 10, 30, 'uncommon'),
  ('host_gold', 'Super Host', 'Hosted 50 bookings', '🌟', 'hosting', 'gold', 3, 'count', 'bookings_hosted', 50, 75, 'rare'),
  ('host_platinum', 'Elite Host', 'Hosted 200 bookings', '💎', 'hosting', 'platinum', 4, 'count', 'bookings_hosted', 200, 150, 'epic'),
  
  -- COMMUNITY
  ('reviewer_bronze', 'Voice Heard', 'Written 3 property reviews', '💬', 'community', 'bronze', 1, 'count', 'reviews_written', 3, 10, 'common'),
  ('reviewer_gold', 'Trusted Reviewer', 'Written 25 property reviews', '⭐', 'community', 'gold', 2, 'count', 'reviews_written', 25, 40, 'rare'),
  ('referrer_bronze', 'Friend Maker', 'Referred your first friend', '🤝', 'community', 'bronze', 1, 'count', 'referrals_made', 1, 20, 'common'),
  ('referrer_gold', 'Community Builder', 'Referred 10 friends', '🎉', 'community', 'gold', 2, 'count', 'referrals_made', 10, 75, 'rare'),
  
  -- SPECIAL
  ('early_adopter', 'Early Adopter', 'Joined padoq in the first year', '🚀', 'special', NULL, 0, 'special', NULL, NULL, 100, 'legendary'),
  ('founding_member', 'Founding Member', 'One of the first 100 users', '🏛️', 'special', NULL, 0, 'special', NULL, NULL, 200, 'legendary')
  
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- 5. FUNCTION: Check and award badges
-- ===========================================
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TABLE (badge_slug TEXT, badge_name TEXT, newly_earned BOOLEAN) AS $$
DECLARE
  v_stats user_stats%ROWTYPE;
  v_badge badges%ROWTYPE;
  v_current_value INTEGER;
  v_counties_count INTEGER;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_stats (user_id) VALUES (p_user_id);
    SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
  END IF;
  
  -- Count counties
  v_counties_count := COALESCE(array_length(v_stats.counties_visited, 1), 0);
  
  -- Check each badge
  FOR v_badge IN SELECT * FROM badges WHERE is_active = true AND criteria_type = 'count' LOOP
    -- Determine current value based on criteria field
    v_current_value := CASE v_badge.criteria_field
      WHEN 'routes_created' THEN v_stats.routes_created
      WHEN 'routes_completed' THEN v_stats.routes_completed
      WHEN 'routes_reviewed' THEN v_stats.routes_reviewed
      WHEN 'bookings_completed' THEN v_stats.bookings_completed
      WHEN 'counties_visited_count' THEN v_counties_count
      WHEN 'properties_listed' THEN v_stats.properties_listed
      WHEN 'bookings_hosted' THEN v_stats.bookings_hosted
      WHEN 'reviews_written' THEN v_stats.reviews_written
      WHEN 'referrals_made' THEN v_stats.referrals_made
      ELSE 0
    END;
    
    -- Check if user qualifies and doesn't already have badge
    IF v_current_value >= COALESCE(v_badge.criteria_value, 0) THEN
      IF NOT EXISTS (SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = v_badge.id) THEN
        -- Award badge
        INSERT INTO user_badges (user_id, badge_id, progress_value)
        VALUES (p_user_id, v_badge.id, v_current_value);
        
        badge_slug := v_badge.slug;
        badge_name := v_badge.name;
        newly_earned := true;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 6. FUNCTION: Update user stats
-- ===========================================
CREATE OR REPLACE FUNCTION update_user_stat(
  p_user_id UUID,
  p_stat_name TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
  -- Ensure user has a stats row
  INSERT INTO user_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update the specific stat
  EXECUTE format(
    'UPDATE user_stats SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE user_id = $2',
    p_stat_name, p_stat_name
  ) USING p_increment, p_user_id;
  
  -- Check for new badges
  PERFORM check_and_award_badges(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 7. TRIGGERS TO AUTO-UPDATE STATS
-- ===========================================

-- When a route is created
CREATE OR REPLACE FUNCTION on_route_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_stat(NEW.owner_user_id, 'routes_created', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_route_created ON routes;
CREATE TRIGGER trigger_route_created
  AFTER INSERT ON routes
  FOR EACH ROW
  EXECUTE FUNCTION on_route_created();

-- When a booking is completed
CREATE OR REPLACE FUNCTION on_booking_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_county TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update guest stats
    PERFORM update_user_stat(NEW.guest_id, 'bookings_completed', 1);
    PERFORM update_user_stat(NEW.guest_id, 'total_nights_stayed', NEW.nights);
    
    -- Get property county and add to visited
    SELECT county INTO v_county FROM properties WHERE id = NEW.property_id;
    IF v_county IS NOT NULL THEN
      UPDATE user_stats 
      SET counties_visited = array_append(
        ARRAY(SELECT DISTINCT unnest(counties_visited || ARRAY[v_county])),
        NULL
      )
      WHERE user_id = NEW.guest_id;
      -- Remove the NULL we added and deduplicate
      UPDATE user_stats 
      SET counties_visited = ARRAY(SELECT DISTINCT unnest(counties_visited) WHERE unnest IS NOT NULL)
      WHERE user_id = NEW.guest_id;
    END IF;
    
    -- Update host stats
    UPDATE user_stats 
    SET bookings_hosted = COALESCE(bookings_hosted, 0) + 1,
        updated_at = NOW()
    WHERE user_id = (SELECT host_id FROM properties WHERE id = NEW.property_id);
    
    -- Check badges for both
    PERFORM check_and_award_badges(NEW.guest_id);
    PERFORM check_and_award_badges((SELECT host_id FROM properties WHERE id = NEW.property_id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_completed ON bookings;
CREATE TRIGGER trigger_booking_completed
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION on_booking_completed();

-- When a property is listed
CREATE OR REPLACE FUNCTION on_property_published()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.published = true AND (OLD.published IS NULL OR OLD.published = false) THEN
    PERFORM update_user_stat(NEW.host_id, 'properties_listed', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_property_published ON properties;
CREATE TRIGGER trigger_property_published
  AFTER UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION on_property_published();

-- ===========================================
-- 8. INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_featured ON user_badges(user_id, is_featured) WHERE is_featured = true;

-- ===========================================
-- 9. RLS POLICIES
-- ===========================================
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can view badges
CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);

-- Users can view their own and others' earned badges
CREATE POLICY "Anyone can view earned badges" ON user_badges FOR SELECT USING (true);

-- Users can update their own badge display preferences
CREATE POLICY "Users can update own badge display" ON user_badges
  FOR UPDATE USING (user_id = auth.uid());

-- Users can view their own stats
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (user_id = auth.uid());

-- Admins can manage everything
CREATE POLICY "Admins manage badges" ON badges
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE badges IS 'Badge/achievement definitions';
COMMENT ON TABLE user_badges IS 'Badges earned by users';
COMMENT ON TABLE user_stats IS 'User statistics for badge calculation';

