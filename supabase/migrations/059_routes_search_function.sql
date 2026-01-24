-- ============================================
-- Route Search Function for faster queries
-- Created: 2026-01-21
-- ============================================

-- Create a function for public route search that bypasses slow RLS
CREATE OR REPLACE FUNCTION search_public_routes(
  search_query TEXT DEFAULT NULL,
  filter_county TEXT DEFAULT NULL,
  filter_difficulty TEXT DEFAULT NULL,
  min_distance NUMERIC DEFAULT NULL,
  max_distance NUMERIC DEFAULT NULL,
  page_number INT DEFAULT 1,
  page_size INT DEFAULT 20
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
  review_count INT,
  is_public BOOLEAN,
  visibility TEXT,
  created_at TIMESTAMPTZ,
  owner_user_id UUID,
  cover_photo_url TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $$
DECLARE
  v_offset INT := (page_number - 1) * page_size;
  v_total BIGINT;
BEGIN
  -- Count total matching routes
  SELECT COUNT(*) INTO v_total
  FROM routes r
  WHERE r.is_public = true
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%')
    AND (filter_county IS NULL OR r.county = filter_county)
    AND (filter_difficulty IS NULL OR r.difficulty = filter_difficulty)
    AND (min_distance IS NULL OR r.distance_km >= min_distance)
    AND (max_distance IS NULL OR r.distance_km <= max_distance);

  -- Return routes with cover photo
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
    r.visibility,
    r.created_at,
    r.owner_user_id,
    COALESCE(
      (SELECT rp.url FROM route_photos rp WHERE rp.route_id = r.id AND rp.is_cover = true LIMIT 1),
      (SELECT rp.url FROM route_photos rp WHERE rp.route_id = r.id ORDER BY rp.created_at ASC LIMIT 1)
    ) as cover_photo_url,
    v_total as total_count
  FROM routes r
  WHERE r.is_public = true
    AND (search_query IS NULL OR r.title ILIKE '%' || search_query || '%' OR r.description ILIKE '%' || search_query || '%')
    AND (filter_county IS NULL OR r.county = filter_county)
    AND (filter_difficulty IS NULL OR r.difficulty = filter_difficulty)
    AND (min_distance IS NULL OR r.distance_km >= min_distance)
    AND (max_distance IS NULL OR r.distance_km <= max_distance)
  ORDER BY r.avg_rating DESC NULLS LAST, r.created_at DESC
  LIMIT page_size
  OFFSET v_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_public_routes TO authenticated;
GRANT EXECUTE ON FUNCTION search_public_routes TO anon;

COMMENT ON FUNCTION search_public_routes IS 'Search public routes with optional filters. Returns routes with cover photos efficiently.';

