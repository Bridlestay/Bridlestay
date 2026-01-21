-- ============================================
-- Fix: Create function to delete routes without timeout
-- Created: 2026-01-21
-- ============================================

-- Create a function to delete a route and all its related data
-- This runs as SECURITY DEFINER (with elevated privileges) and 
-- has a longer statement timeout to prevent timeouts

CREATE OR REPLACE FUNCTION delete_route_cascade(route_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '60s'
AS $$
BEGIN
  -- Delete all related records first
  DELETE FROM route_comments WHERE route_id = route_uuid;
  DELETE FROM route_photos WHERE route_id = route_uuid;
  DELETE FROM route_waypoints WHERE route_id = route_uuid;
  DELETE FROM route_likes WHERE route_id = route_uuid;
  DELETE FROM route_favorites WHERE route_id = route_uuid;
  DELETE FROM route_hazards WHERE route_id = route_uuid;
  DELETE FROM route_shares WHERE route_id = route_uuid;
  DELETE FROM route_completions WHERE route_id = route_uuid;
  DELETE FROM route_user_photos WHERE route_id = route_uuid;
  
  -- Finally delete the route itself
  DELETE FROM routes WHERE id = route_uuid;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting route: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_route_cascade(UUID) TO authenticated;

COMMENT ON FUNCTION delete_route_cascade IS 'Deletes a route and all related data with a longer timeout to prevent statement timeouts';

