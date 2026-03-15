-- Migration 079: Ride tally system
-- Adds ride counting to route_completions, total_rides to routes and users
-- Enables "I've ridden this route" tally with 24h cooldown

-- Add ride_count and last_ridden_at to route_completions
ALTER TABLE route_completions
  ADD COLUMN IF NOT EXISTS ride_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_ridden_at TIMESTAMPTZ DEFAULT now();

-- Add total_rides to routes (sum of all ride_counts for that route)
ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS total_rides INT NOT NULL DEFAULT 0;

-- Add total_rides to users (sum of all their ride_counts across routes)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS total_rides INT NOT NULL DEFAULT 0;

-- Allow users to UPDATE their own completion records (for incrementing ride_count)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'route_completions_user_update'
    AND tablename = 'route_completions'
  ) THEN
    CREATE POLICY "route_completions_user_update" ON route_completions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger: update routes.total_rides when route_completions changes
CREATE OR REPLACE FUNCTION update_route_total_rides()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_rides for the affected route
  UPDATE routes
  SET total_rides = COALESCE((
    SELECT SUM(ride_count)
    FROM route_completions
    WHERE route_id = COALESCE(NEW.route_id, OLD.route_id)
  ), 0)
  WHERE id = COALESCE(NEW.route_id, OLD.route_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_route_total_rides_trigger ON route_completions;
CREATE TRIGGER update_route_total_rides_trigger
  AFTER INSERT OR UPDATE OR DELETE ON route_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_route_total_rides();

-- Trigger: update users.total_rides when route_completions changes
CREATE OR REPLACE FUNCTION update_user_total_rides()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_rides for the affected user
  UPDATE users
  SET total_rides = COALESCE((
    SELECT SUM(ride_count)
    FROM route_completions
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
  ), 0)
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_user_total_rides_trigger ON route_completions;
CREATE TRIGGER update_user_total_rides_trigger
  AFTER INSERT OR UPDATE OR DELETE ON route_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_total_rides();

-- Backfill: set existing completions ride_count=1 and last_ridden_at=completed_at
UPDATE route_completions
SET last_ridden_at = completed_at
WHERE last_ridden_at IS NULL;

-- Backfill: update routes.total_rides from existing completions
UPDATE routes r
SET total_rides = COALESCE(ride_stats.total, 0)
FROM (
  SELECT route_id, SUM(ride_count) as total
  FROM route_completions
  GROUP BY route_id
) ride_stats
WHERE r.id = ride_stats.route_id;

-- Backfill: update users.total_rides from existing completions
UPDATE users u
SET total_rides = COALESCE(ride_stats.total, 0)
FROM (
  SELECT user_id, SUM(ride_count) as total
  FROM route_completions
  GROUP BY user_id
) ride_stats
WHERE u.id = ride_stats.user_id;

COMMENT ON COLUMN route_completions.ride_count IS 'Number of times user has ridden this route';
COMMENT ON COLUMN route_completions.last_ridden_at IS 'Last time user logged a ride (for 24h cooldown)';
COMMENT ON COLUMN routes.total_rides IS 'Total ride count across all users';
COMMENT ON COLUMN users.total_rides IS 'Total rides across all routes for this user';
