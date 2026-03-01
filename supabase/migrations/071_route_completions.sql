-- Migration 071: Route completions tracking
-- Tracks which users have ridden/completed each route
-- Used for gating photo uploads and other community contributions

CREATE TABLE IF NOT EXISTS route_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(route_id, user_id) -- One completion record per user per route
);

CREATE INDEX IF NOT EXISTS idx_route_completions_route ON route_completions(route_id);
CREATE INDEX IF NOT EXISTS idx_route_completions_user ON route_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_route_completions_completed_at ON route_completions(completed_at DESC);

ALTER TABLE route_completions ENABLE ROW LEVEL SECURITY;

-- Anyone can view route completions (for showing completion counts)
CREATE POLICY "route_completions_public_read" ON route_completions
  FOR SELECT USING (true);

-- Users can mark routes they've completed
CREATE POLICY "route_completions_user_insert" ON route_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own completion records
CREATE POLICY "route_completions_user_delete" ON route_completions
  FOR DELETE USING (auth.uid() = user_id);
