-- ============================================
-- Complete Routes Features Migration
-- Created: 2026-01-18
-- Adds: Likes, Favorites, Hazards, Restores Waypoints
-- ============================================

-- ============================================
-- 1. RESTORE ROUTE WAYPOINTS with full columns
-- ============================================

-- Add missing columns to route_waypoints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'route_waypoints' AND column_name = 'name') THEN
    ALTER TABLE route_waypoints ADD COLUMN name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'route_waypoints' AND column_name = 'description') THEN
    ALTER TABLE route_waypoints ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'route_waypoints' AND column_name = 'icon_type') THEN
    ALTER TABLE route_waypoints ADD COLUMN icon_type TEXT 
      CHECK (icon_type IN ('viewpoint','water','hazard','parking','pub','gate','rest','historic','wildlife','bridge','ford','stile','other'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'route_waypoints' AND column_name = 'photo_url') THEN
    ALTER TABLE route_waypoints ADD COLUMN photo_url TEXT;
  END IF;
END $$;

-- ============================================
-- 2. ROUTE LIKES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS route_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- User can only like a route once
  UNIQUE(route_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_route_likes_route ON route_likes (route_id);
CREATE INDEX IF NOT EXISTS idx_route_likes_user ON route_likes (user_id);

-- ============================================
-- 3. ROUTE FAVORITES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS route_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- User can only favorite a route once
  UNIQUE(route_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_route_favorites_route ON route_favorites (route_id);
CREATE INDEX IF NOT EXISTS idx_route_favorites_user ON route_favorites (user_id);

-- ============================================
-- 4. ROUTE HAZARDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS route_hazards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
  reported_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  hazard_type TEXT NOT NULL CHECK (hazard_type IN (
    'tree_fall', 'flooding', 'erosion', 'livestock', 'closure', 
    'poor_visibility', 'ice_snow', 'overgrown', 'damaged_path',
    'dangerous_crossing', 'other'
  )),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'expired', 'flagged')),
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- For temporary hazards like weather
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_hazards_route ON route_hazards (route_id);
CREATE INDEX IF NOT EXISTS idx_route_hazards_status ON route_hazards (status);
CREATE INDEX IF NOT EXISTS idx_route_hazards_severity ON route_hazards (severity);

-- ============================================
-- 5. ROUTE SHARES TABLE (track sharing stats)
-- ============================================

CREATE TABLE IF NOT EXISTS route_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
  shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  share_method TEXT CHECK (share_method IN ('link', 'social', 'email', 'gpx_download')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_shares_route ON route_shares (route_id);

-- ============================================
-- 6. ADD COUNTS TO ROUTES TABLE
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'routes' AND column_name = 'likes_count') THEN
    ALTER TABLE routes ADD COLUMN likes_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'routes' AND column_name = 'favorites_count') THEN
    ALTER TABLE routes ADD COLUMN favorites_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'routes' AND column_name = 'active_hazards_count') THEN
    ALTER TABLE routes ADD COLUMN active_hazards_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'routes' AND column_name = 'shares_count') THEN
    ALTER TABLE routes ADD COLUMN shares_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'routes' AND column_name = 'completions_count') THEN
    ALTER TABLE routes ADD COLUMN completions_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- Route likes RLS
ALTER TABLE route_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_likes_read" ON route_likes
  FOR SELECT USING (true);

CREATE POLICY "route_likes_user_insert" ON route_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "route_likes_user_delete" ON route_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Route favorites RLS
ALTER TABLE route_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_favorites_read_own" ON route_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "route_favorites_user_insert" ON route_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "route_favorites_user_delete" ON route_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Route hazards RLS
ALTER TABLE route_hazards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_hazards_read" ON route_hazards
  FOR SELECT USING (true);

CREATE POLICY "route_hazards_auth_insert" ON route_hazards
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "route_hazards_owner_update" ON route_hazards
  FOR UPDATE USING (
    auth.uid() = reported_by_user_id
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Route shares RLS
ALTER TABLE route_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_shares_insert" ON route_shares
  FOR INSERT WITH CHECK (true);

CREATE POLICY "route_shares_read_admin" ON route_shares
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 8. TRIGGER FUNCTIONS FOR COUNT UPDATES
-- ============================================

-- Likes count trigger
CREATE OR REPLACE FUNCTION update_route_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE routes SET likes_count = likes_count + 1 WHERE id = NEW.route_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE routes SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.route_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_route_likes_count_trigger ON route_likes;
CREATE TRIGGER update_route_likes_count_trigger
  AFTER INSERT OR DELETE ON route_likes
  FOR EACH ROW EXECUTE FUNCTION update_route_likes_count();

-- Favorites count trigger
CREATE OR REPLACE FUNCTION update_route_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE routes SET favorites_count = favorites_count + 1 WHERE id = NEW.route_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE routes SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id = OLD.route_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_route_favorites_count_trigger ON route_favorites;
CREATE TRIGGER update_route_favorites_count_trigger
  AFTER INSERT OR DELETE ON route_favorites
  FOR EACH ROW EXECUTE FUNCTION update_route_favorites_count();

-- Hazards count trigger (only active ones)
CREATE OR REPLACE FUNCTION update_route_hazards_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE routes SET active_hazards_count = active_hazards_count + 1 WHERE id = NEW.route_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      UPDATE routes SET active_hazards_count = GREATEST(0, active_hazards_count - 1) WHERE id = OLD.route_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changed from active to something else
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE routes SET active_hazards_count = GREATEST(0, active_hazards_count - 1) WHERE id = NEW.route_id;
    -- Status changed to active from something else
    ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE routes SET active_hazards_count = active_hazards_count + 1 WHERE id = NEW.route_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_route_hazards_count_trigger ON route_hazards;
CREATE TRIGGER update_route_hazards_count_trigger
  AFTER INSERT OR DELETE OR UPDATE ON route_hazards
  FOR EACH ROW EXECUTE FUNCTION update_route_hazards_count();

-- Shares count trigger
CREATE OR REPLACE FUNCTION update_route_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE routes SET shares_count = shares_count + 1 WHERE id = NEW.route_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_route_shares_count_trigger ON route_shares;
CREATE TRIGGER update_route_shares_count_trigger
  AFTER INSERT ON route_shares
  FOR EACH ROW EXECUTE FUNCTION update_route_shares_count();

-- ============================================
-- 9. HAZARD TYPE LABELS (for UI)
-- ============================================

COMMENT ON TABLE route_hazards IS 'Reports of hazards on routes. Types: tree_fall=Fallen Tree, flooding=Flooding, erosion=Path Erosion, livestock=Livestock Warning, closure=Path Closed, poor_visibility=Poor Visibility, ice_snow=Ice/Snow, overgrown=Overgrown Path, damaged_path=Damaged Surface, dangerous_crossing=Dangerous Crossing, other=Other';

-- ============================================
-- 10. CLEANUP EXPIRED HAZARDS (optional cron)
-- ============================================

-- Function to mark expired hazards
CREATE OR REPLACE FUNCTION cleanup_expired_hazards()
RETURNS void AS $$
BEGIN
  UPDATE route_hazards 
  SET status = 'expired', updated_at = now()
  WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

