-- Migration 073: Waypoint Suggestion System
-- Allows community to suggest waypoints for owner approval

-- Waypoint suggestions table
CREATE TABLE IF NOT EXISTS waypoint_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  name TEXT NOT NULL,
  tag TEXT CHECK (tag IN ('poi', 'instruction', 'caution', 'note')),
  icon_type TEXT CHECK (icon_type IN ('viewpoint','water','hazard','parking','pub','gate','rest','historic','wildlife','bridge','ford','stile','other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waypoint_suggestions_route ON waypoint_suggestions(route_id);
CREATE INDEX IF NOT EXISTS idx_waypoint_suggestions_user ON waypoint_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_waypoint_suggestions_status ON waypoint_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_waypoint_suggestions_route_status ON waypoint_suggestions(route_id, status);

-- RLS Policies
ALTER TABLE waypoint_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can view suggestions for public routes
CREATE POLICY "waypoint_suggestions_public_read" ON waypoint_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = waypoint_suggestions.route_id
      AND (routes.is_public = true OR routes.owner_user_id = auth.uid())
    )
  );

-- Authenticated users can create suggestions (GPS-verified in API layer)
CREATE POLICY "waypoint_suggestions_auth_insert" ON waypoint_suggestions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = waypoint_suggestions.route_id
      AND routes.is_public = true
    )
  );

-- Route owners can update/delete suggestions (for approval workflow)
CREATE POLICY "waypoint_suggestions_owner_manage" ON waypoint_suggestions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = waypoint_suggestions.route_id
      AND routes.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "waypoint_suggestions_owner_delete" ON waypoint_suggestions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = waypoint_suggestions.route_id
      AND routes.owner_user_id = auth.uid()
    )
  );

-- Function to count pending suggestions per route
CREATE OR REPLACE FUNCTION get_pending_suggestions_count(route_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM waypoint_suggestions
  WHERE route_id = route_uuid
  AND status = 'pending';
$$ LANGUAGE SQL STABLE;

-- Comment
COMMENT ON TABLE waypoint_suggestions IS
  'Community waypoint suggestions requiring route owner approval. GPS-verified during submission.';
