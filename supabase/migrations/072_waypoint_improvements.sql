-- Migration 072: Waypoint system improvements
-- Add missing columns for tag-based waypoint categorization

-- Add tag column for waypoint categorization (POI, Instruction, Caution, Note)
ALTER TABLE route_waypoints
  ADD COLUMN IF NOT EXISTS tag TEXT
  CHECK (tag IN ('poi', 'instruction', 'caution', 'note'));

-- Add created_by_user_id to track who added each waypoint
-- (Always equals route owner for now, but useful for audit trail)
ALTER TABLE route_waypoints
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill created_by_user_id for existing waypoints
UPDATE route_waypoints
SET created_by_user_id = routes.owner_user_id
FROM routes
WHERE route_waypoints.route_id = routes.id
  AND route_waypoints.created_by_user_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_route_waypoints_created_by ON route_waypoints(created_by_user_id);

-- Update RLS to be explicit about owner-only access
-- (Already correct, but let's make it clearer)
DROP POLICY IF EXISTS "route_waypoints_owner_write" ON route_waypoints;

CREATE POLICY "route_waypoints_owner_all" ON route_waypoints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = route_waypoints.route_id
      AND routes.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = route_waypoints.route_id
      AND routes.owner_user_id = auth.uid()
    )
  );

-- Add comment to clarify policy intent
COMMENT ON POLICY "route_waypoints_owner_all" ON route_waypoints IS
  'Komoot-style: Only route authors can create/edit/delete waypoints. Community contributes via waypoint_photos table.';
