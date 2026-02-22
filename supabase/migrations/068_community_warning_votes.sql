-- Migration 068: Community warning votes + waypoint tags
-- Warnings now require community votes to clear instead of instant single-user resolve
-- Waypoints get a purpose tag (instruction, poi, note, caution)

-- ============================================================
-- 1. WARNING CLEAR VOTES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS warning_clear_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_id UUID NOT NULL REFERENCES route_hazards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(warning_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_warning_clear_votes_warning ON warning_clear_votes(warning_id);
CREATE INDEX IF NOT EXISTS idx_warning_clear_votes_user ON warning_clear_votes(user_id);

-- ============================================================
-- 2. VOTE TRACKING COLUMNS ON ROUTE_HAZARDS
-- ============================================================

ALTER TABLE route_hazards ADD COLUMN IF NOT EXISTS clear_votes_count INTEGER DEFAULT 0;
ALTER TABLE route_hazards ADD COLUMN IF NOT EXISTS clear_votes_needed INTEGER DEFAULT 2;

-- ============================================================
-- 3. RLS POLICIES FOR WARNING_CLEAR_VOTES
-- ============================================================

ALTER TABLE warning_clear_votes ENABLE ROW LEVEL SECURITY;

-- Public read (anyone can see vote counts)
CREATE POLICY "warning_clear_votes_public_read" ON warning_clear_votes
  FOR SELECT USING (true);

-- Authenticated insert (user can only insert their own votes)
CREATE POLICY "warning_clear_votes_auth_insert" ON warning_clear_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes (undo)
CREATE POLICY "warning_clear_votes_owner_delete" ON warning_clear_votes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 4. TRIGGER: AUTO-RESOLVE WHEN VOTES REACH THRESHOLD
-- ============================================================

CREATE OR REPLACE FUNCTION handle_warning_clear_vote()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment vote count
  UPDATE route_hazards
  SET clear_votes_count = clear_votes_count + 1,
      updated_at = now()
  WHERE id = NEW.warning_id;

  -- Auto-resolve if threshold reached
  UPDATE route_hazards
  SET status = 'resolved',
      resolved_at = now()
  WHERE id = NEW.warning_id
    AND clear_votes_count >= clear_votes_needed
    AND status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS warning_clear_vote_trigger ON warning_clear_votes;
CREATE TRIGGER warning_clear_vote_trigger
  AFTER INSERT ON warning_clear_votes
  FOR EACH ROW
  EXECUTE FUNCTION handle_warning_clear_vote();

-- ============================================================
-- 5. WAYPOINT TAGS
-- ============================================================

ALTER TABLE route_waypoints ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT 'note';

-- Add CHECK constraint for tag values
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc ON cc.constraint_name = tc.constraint_name
  WHERE tc.table_name = 'route_waypoints' AND tc.constraint_type = 'CHECK'
  AND cc.check_clause LIKE '%tag%';
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE route_waypoints DROP CONSTRAINT ' || cname;
  END IF;
END $$;

ALTER TABLE route_waypoints ADD CONSTRAINT route_waypoints_tag_check
  CHECK (tag IN ('instruction', 'poi', 'note', 'caution'));

CREATE INDEX IF NOT EXISTS idx_route_waypoints_tag ON route_waypoints(tag);
