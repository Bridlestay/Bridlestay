-- Migration 074: Waypoint Edit Suggestions
-- Allows community to suggest edits to existing waypoints

-- Waypoint edit suggestions table
CREATE TABLE IF NOT EXISTS waypoint_edit_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waypoint_id UUID NOT NULL REFERENCES route_waypoints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Suggested changes (null = no change suggested for this field)
  suggested_name TEXT,
  suggested_tag TEXT CHECK (suggested_tag IS NULL OR suggested_tag IN ('poi', 'instruction', 'caution', 'note')),
  suggested_icon_type TEXT CHECK (suggested_icon_type IS NULL OR suggested_icon_type IN ('viewpoint','water','hazard','parking','pub','gate','rest','historic','wildlife','bridge','ford','stile','other')),
  suggested_description TEXT,

  -- Photo suggestions (stored as JSONB array of photo data)
  -- Format: [{ "action": "add", "url": "...", "caption": "..." }, { "action": "remove", "photo_id": "..." }]
  suggested_photos JSONB,

  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,

  -- Optional: user's comment explaining their suggestions
  suggestion_comment TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waypoint_edit_suggestions_waypoint ON waypoint_edit_suggestions(waypoint_id);
CREATE INDEX IF NOT EXISTS idx_waypoint_edit_suggestions_user ON waypoint_edit_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_waypoint_edit_suggestions_status ON waypoint_edit_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_waypoint_edit_suggestions_waypoint_status ON waypoint_edit_suggestions(waypoint_id, status);

-- RLS Policies
ALTER TABLE waypoint_edit_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can view edit suggestions for public routes
CREATE POLICY "waypoint_edit_suggestions_public_read" ON waypoint_edit_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM route_waypoints
      JOIN routes ON routes.id = route_waypoints.route_id
      WHERE route_waypoints.id = waypoint_edit_suggestions.waypoint_id
      AND (routes.is_public = true OR routes.owner_user_id = auth.uid())
    )
  );

-- Authenticated users can create edit suggestions
CREATE POLICY "waypoint_edit_suggestions_auth_insert" ON waypoint_edit_suggestions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM route_waypoints
      JOIN routes ON routes.id = route_waypoints.route_id
      WHERE route_waypoints.id = waypoint_edit_suggestions.waypoint_id
      AND routes.is_public = true
      AND routes.owner_user_id != auth.uid() -- Can't suggest edits to own waypoints
    )
  );

-- Route owners can update/delete edit suggestions (for approval workflow)
CREATE POLICY "waypoint_edit_suggestions_owner_manage" ON waypoint_edit_suggestions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM route_waypoints
      JOIN routes ON routes.id = route_waypoints.route_id
      WHERE route_waypoints.id = waypoint_edit_suggestions.waypoint_id
      AND routes.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "waypoint_edit_suggestions_owner_delete" ON waypoint_edit_suggestions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM route_waypoints
      JOIN routes ON routes.id = route_waypoints.route_id
      WHERE route_waypoints.id = waypoint_edit_suggestions.waypoint_id
      AND routes.owner_user_id = auth.uid()
    )
  );

-- Function to count pending edit suggestions per waypoint
CREATE OR REPLACE FUNCTION get_pending_edit_suggestions_count(waypoint_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM waypoint_edit_suggestions
  WHERE waypoint_id = waypoint_uuid
  AND status = 'pending';
$$ LANGUAGE SQL STABLE;

-- Comment
COMMENT ON TABLE waypoint_edit_suggestions IS
  'Community suggestions for editing existing waypoints - changes to name, tag, icon, description, and photos.';
