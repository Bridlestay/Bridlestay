-- Migration: Public Paths and Route System Rework
-- Routes are now user-created only, paths (bridleways, footpaths, etc.) are separate data

-- =====================================================
-- 1. PUBLIC PATHS TABLE (bridleways, boats, footpaths, permissive paths)
-- =====================================================

CREATE TABLE IF NOT EXISTS public_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  path_type TEXT NOT NULL CHECK (path_type IN ('bridleways', 'boats', 'footpaths', 'permissive')),
  geometry JSONB NOT NULL, -- GeoJSON LineString or MultiLineString
  surface TEXT,
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'unknown')),
  notes TEXT,
  source TEXT, -- Where the data came from (e.g., 'OS OpenData', 'Rowmaps', 'User')
  county TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for path queries
CREATE INDEX IF NOT EXISTS idx_public_paths_type ON public_paths (path_type);
CREATE INDEX IF NOT EXISTS idx_public_paths_county ON public_paths (county);

-- =====================================================
-- 2. UPDATE ROUTES TABLE FOR USER-CREATED ROUTES
-- =====================================================

-- Add new columns to routes if they don't exist
DO $$ 
BEGIN
  -- Route type (circular or linear)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'routes' AND column_name = 'route_type') THEN
    ALTER TABLE routes ADD COLUMN route_type TEXT DEFAULT 'linear' 
      CHECK (route_type IN ('circular', 'linear'));
  END IF;

  -- Visibility setting
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'routes' AND column_name = 'visibility') THEN
    ALTER TABLE routes ADD COLUMN visibility TEXT DEFAULT 'private' 
      CHECK (visibility IN ('private', 'link', 'public'));
  END IF;

  -- Share token for 'link' visibility
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'routes' AND column_name = 'share_token') THEN
    ALTER TABLE routes ADD COLUMN share_token TEXT UNIQUE;
  END IF;

  -- Estimated time in minutes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'routes' AND column_name = 'estimated_time_minutes') THEN
    ALTER TABLE routes ADD COLUMN estimated_time_minutes INTEGER;
  END IF;

  -- Update difficulty to include all levels
  -- Note: Using the existing difficulty column but it may have different values
END $$;

-- =====================================================
-- 3. ROUTE WAYPOINTS TABLE (for detailed waypoint data)
-- =====================================================

-- Drop and recreate if needed with new structure
DROP TABLE IF EXISTS route_waypoints CASCADE;

CREATE TABLE route_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  snapped BOOLEAN DEFAULT false,
  snapped_to_path_type TEXT CHECK (snapped_to_path_type IN ('bridleways', 'boats', 'footpaths', 'permissive', NULL)),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_route_waypoints_route ON route_waypoints (route_id, order_index);

-- =====================================================
-- 4. ROUTE POINT COMMENTS (comments at specific points)
-- =====================================================

CREATE TABLE IF NOT EXISTS route_point_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_route_point_comments_route ON route_point_comments (route_id);
CREATE INDEX idx_route_point_comments_user ON route_point_comments (user_id);

-- =====================================================
-- 5. ROUTE TRACKING (for GPS recording in future)
-- =====================================================

CREATE TABLE IF NOT EXISTS route_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL, -- Optional link to a saved route
  title TEXT,
  geometry JSONB NOT NULL, -- Recorded GPS track
  distance_km DOUBLE PRECISION,
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'recording' CHECK (status IN ('recording', 'paused', 'completed', 'discarded')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_route_recordings_user ON route_recordings (user_id);
CREATE INDEX idx_route_recordings_status ON route_recordings (status);

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Public paths - everyone can read
ALTER TABLE public_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_paths_select" ON public_paths
  FOR SELECT USING (true);

-- Route waypoints - follow route visibility
ALTER TABLE route_waypoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_waypoints_select" ON route_waypoints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM routes 
      WHERE routes.id = route_waypoints.route_id 
      AND (
        routes.visibility = 'public' 
        OR routes.owner_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "route_waypoints_insert" ON route_waypoints
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM routes 
      WHERE routes.id = route_waypoints.route_id 
      AND routes.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "route_waypoints_delete" ON route_waypoints
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM routes 
      WHERE routes.id = route_waypoints.route_id 
      AND routes.owner_user_id = auth.uid()
    )
  );

-- Route point comments
ALTER TABLE route_point_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_point_comments_select" ON route_point_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM routes 
      WHERE routes.id = route_point_comments.route_id 
      AND (routes.visibility = 'public' OR routes.owner_user_id = auth.uid())
    )
  );

CREATE POLICY "route_point_comments_insert" ON route_point_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM routes 
      WHERE routes.id = route_point_comments.route_id 
      AND routes.visibility = 'public'
    )
  );

CREATE POLICY "route_point_comments_update" ON route_point_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "route_point_comments_delete" ON route_point_comments
  FOR DELETE USING (user_id = auth.uid());

-- Route recordings - user's own only
ALTER TABLE route_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_recordings_select" ON route_recordings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "route_recordings_insert" ON route_recordings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "route_recordings_update" ON route_recordings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "route_recordings_delete" ON route_recordings
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- 7. GENERATE SHARE TOKENS
-- =====================================================

CREATE OR REPLACE FUNCTION generate_route_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visibility = 'link' AND NEW.share_token IS NULL THEN
    NEW.share_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS route_share_token_trigger ON routes;
CREATE TRIGGER route_share_token_trigger
  BEFORE INSERT OR UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION generate_route_share_token();

-- =====================================================
-- 8. UPDATE ROUTES RLS FOR NEW VISIBILITY SYSTEM
-- =====================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS routes_public_select ON routes;

-- New select policy with visibility support
CREATE POLICY "routes_visibility_select" ON routes
  FOR SELECT USING (
    visibility = 'public' 
    OR owner_user_id = auth.uid()
    -- Link visibility checked in API with share_token
  );

