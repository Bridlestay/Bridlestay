-- Auto-update completions_count on routes when route_completions are inserted/deleted
-- This ensures the count stays accurate without manual incrementing

-- Drop existing function and trigger first (handles previous versions with different signatures)
DROP TRIGGER IF EXISTS route_completions_count_trigger ON route_completions;
DROP FUNCTION IF EXISTS update_route_completions_count();

CREATE OR REPLACE FUNCTION update_route_completions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE routes SET completions_count = COALESCE(completions_count, 0) + 1 WHERE id = NEW.route_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE routes SET completions_count = GREATEST(COALESCE(completions_count, 0) - 1, 0) WHERE id = OLD.route_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER route_completions_count_trigger
AFTER INSERT OR DELETE ON route_completions
FOR EACH ROW EXECUTE FUNCTION update_route_completions_count();

-- Backfill: set completions_count to the actual count for all routes
UPDATE routes SET completions_count = (
  SELECT COUNT(*) FROM route_completions WHERE route_completions.route_id = routes.id
);
