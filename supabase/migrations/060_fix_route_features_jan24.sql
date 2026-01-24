-- Migration 060: Fix route features for Jan 24 2026
-- Fixes: route completion RLS, waypoint creation by any user, last_edited_at tracking

-- 0. Add index for faster route search (USER-CREATED routes only)
CREATE INDEX IF NOT EXISTS idx_routes_owner_user_id_public ON routes(owner_user_id, is_public) WHERE owner_user_id IS NOT NULL;

-- 1. Add last_edited_at column to routes for edit tracking
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

COMMENT ON COLUMN routes.last_edited_at IS 'Timestamp of last edit to the route';

-- Create trigger to auto-update last_edited_at on route updates
CREATE OR REPLACE FUNCTION update_routes_last_edited()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_edited_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_routes_last_edited ON routes;
CREATE TRIGGER trigger_routes_last_edited
  BEFORE UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION update_routes_last_edited();

-- 2. Add created_by_user_id to route_waypoints to track who added each waypoint
ALTER TABLE route_waypoints 
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id);

COMMENT ON COLUMN route_waypoints.created_by_user_id IS 'User who created this waypoint';

-- 3. Fix RLS policies for route_waypoints - allow any authenticated user to create
DROP POLICY IF EXISTS "route_waypoints_auth_insert" ON route_waypoints;
CREATE POLICY "route_waypoints_auth_insert" ON route_waypoints
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update/delete their own waypoints, or route owner/admins
DROP POLICY IF EXISTS "route_waypoints_auth_update" ON route_waypoints;
CREATE POLICY "route_waypoints_auth_update" ON route_waypoints
  FOR UPDATE
  USING (
    created_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM routes WHERE routes.id = route_waypoints.route_id 
      AND routes.owner_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "route_waypoints_auth_delete" ON route_waypoints;
CREATE POLICY "route_waypoints_auth_delete" ON route_waypoints
  FOR DELETE
  USING (
    created_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM routes WHERE routes.id = route_waypoints.route_id 
      AND routes.owner_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Fix RLS for route_completions - ensure any auth user can insert their own completion
DROP POLICY IF EXISTS "route_completions_insert" ON route_completions;
DROP POLICY IF EXISTS "Users can insert own completions" ON route_completions;
CREATE POLICY "route_completions_auth_insert" ON route_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Ensure select policy exists
DROP POLICY IF EXISTS "route_completions_select" ON route_completions;
DROP POLICY IF EXISTS "Users can view all completions" ON route_completions;
CREATE POLICY "route_completions_auth_select" ON route_completions
  FOR SELECT
  USING (TRUE);

-- Ensure update policy exists
DROP POLICY IF EXISTS "route_completions_update" ON route_completions;
DROP POLICY IF EXISTS "Users can update own completions" ON route_completions;
CREATE POLICY "route_completions_auth_update" ON route_completions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Ensure delete policy exists
DROP POLICY IF EXISTS "route_completions_delete" ON route_completions;
DROP POLICY IF EXISTS "Users can delete own completions" ON route_completions;
CREATE POLICY "route_completions_auth_delete" ON route_completions
  FOR DELETE
  USING (user_id = auth.uid());

-- 5. Update search_public_routes function to only return USER-CREATED routes
-- Routes imported from external sources (bridleways etc) have owner_user_id = null
-- Must drop existing function first as return type is different
DROP FUNCTION IF EXISTS search_public_routes(text,text,text,numeric,numeric,integer,integer);

CREATE OR REPLACE FUNCTION search_public_routes(
  search_query TEXT DEFAULT NULL,
  filter_county TEXT DEFAULT NULL,
  filter_difficulty TEXT DEFAULT NULL,
  min_distance NUMERIC DEFAULT NULL,
  max_distance NUMERIC DEFAULT NULL,
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  difficulty TEXT,
  distance_km NUMERIC,
  county TEXT,
  terrain_tags TEXT[],
  avg_rating NUMERIC,
  review_count INTEGER,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  owner_user_id UUID,
  cover_photo_url TEXT,
  total_count BIGINT
) AS $$
DECLARE
  offset_val INTEGER;
  total BIGINT;
BEGIN
  offset_val := (page_number - 1) * page_size;
  
  -- Count total matching routes (USER-CREATED ONLY - owner_user_id IS NOT NULL)
  SELECT COUNT(*) INTO total
  FROM routes r
  WHERE r.is_public = TRUE
    AND r.owner_user_id IS NOT NULL  -- Only user-created routes
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%')
    AND (filter_county IS NULL OR r.county = filter_county)
    AND (filter_difficulty IS NULL OR r.difficulty = filter_difficulty)
    AND (min_distance IS NULL OR r.distance_km >= min_distance)
    AND (max_distance IS NULL OR r.distance_km <= max_distance);
  
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    r.difficulty,
    r.distance_km,
    r.county,
    r.terrain_tags,
    r.avg_rating,
    r.review_count,
    r.is_public,
    r.created_at,
    r.owner_user_id,
    (SELECT rp.url FROM route_photos rp WHERE rp.route_id = r.id AND rp.is_cover = TRUE LIMIT 1) as cover_photo_url,
    total
  FROM routes r
  WHERE r.is_public = TRUE
    AND r.owner_user_id IS NOT NULL  -- Only user-created routes
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%')
    AND (filter_county IS NULL OR r.county = filter_county)
    AND (filter_difficulty IS NULL OR r.difficulty = filter_difficulty)
    AND (min_distance IS NULL OR r.distance_km >= min_distance)
    AND (max_distance IS NULL OR r.distance_km <= max_distance)
  ORDER BY r.created_at DESC
  OFFSET offset_val
  LIMIT page_size;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_public_routes IS 'Search public USER-CREATED routes only (excludes imported bridleways)';

