-- Migration 070: Waypoint photo contributions
-- Allows multiple community photos per waypoint

CREATE TABLE IF NOT EXISTS waypoint_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waypoint_id UUID NOT NULL REFERENCES route_waypoints(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waypoint_photos_waypoint ON waypoint_photos(waypoint_id);
CREATE INDEX IF NOT EXISTS idx_waypoint_photos_route ON waypoint_photos(route_id);

ALTER TABLE waypoint_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view waypoint photos
CREATE POLICY "waypoint_photos_public_read" ON waypoint_photos
  FOR SELECT USING (true);

-- Any authenticated user can upload photos
CREATE POLICY "waypoint_photos_auth_insert" ON waypoint_photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Uploader, route owner, or admin can delete
CREATE POLICY "waypoint_photos_delete" ON waypoint_photos
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = waypoint_photos.route_id
      AND routes.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
