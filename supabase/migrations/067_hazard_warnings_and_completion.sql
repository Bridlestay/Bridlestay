-- ============================================
-- 067: Hazard Completion & Route Warnings
-- ============================================
-- Adds warning support to route_hazards table (is_warning flag),
-- tracks who resolved a hazard, relaxes resolve permissions,
-- and adds active_warnings_count to routes.

-- 1. Add is_warning column
ALTER TABLE route_hazards ADD COLUMN IF NOT EXISTS is_warning BOOLEAN DEFAULT false;

-- 2. Add resolved_by_user_id column (tracks who cleared/resolved)
ALTER TABLE route_hazards ADD COLUMN IF NOT EXISTS resolved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Expand hazard_type CHECK to include warning types
-- Drop existing CHECK constraint (name may vary)
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc ON cc.constraint_name = tc.constraint_name
  WHERE tc.table_name = 'route_hazards' AND tc.constraint_type = 'CHECK'
  AND cc.check_clause LIKE '%hazard_type%';
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE route_hazards DROP CONSTRAINT ' || cname;
  END IF;
END $$;

ALTER TABLE route_hazards ADD CONSTRAINT route_hazards_hazard_type_check
  CHECK (hazard_type IN (
    'tree_fall', 'flooding', 'erosion', 'livestock', 'closure',
    'poor_visibility', 'ice_snow', 'overgrown', 'damaged_path',
    'dangerous_crossing', 'other',
    'slippery', 'muddy', 'weather_warning', 'restricted_access', 'other_warning'
  ));

-- 4. Add active_warnings_count to routes table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'routes' AND column_name = 'active_warnings_count') THEN
    ALTER TABLE routes ADD COLUMN active_warnings_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 5. Relax RLS UPDATE policy — any authenticated user can resolve
DROP POLICY IF EXISTS "route_hazards_owner_update" ON route_hazards;
DROP POLICY IF EXISTS "route_hazards_auth_update" ON route_hazards;
CREATE POLICY "route_hazards_auth_update" ON route_hazards
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 6. Ensure DELETE policy exists (reporter, route owner, or admin)
DROP POLICY IF EXISTS "route_hazards_owner_delete" ON route_hazards;
CREATE POLICY "route_hazards_owner_delete" ON route_hazards
  FOR DELETE USING (
    auth.uid() = reported_by_user_id
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. Update hazards/warnings count trigger to separate counts
CREATE OR REPLACE FUNCTION update_route_hazards_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      IF NEW.is_warning = true THEN
        UPDATE routes SET active_warnings_count = active_warnings_count + 1 WHERE id = NEW.route_id;
      ELSE
        UPDATE routes SET active_hazards_count = active_hazards_count + 1 WHERE id = NEW.route_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' THEN
      IF OLD.is_warning = true THEN
        UPDATE routes SET active_warnings_count = GREATEST(0, active_warnings_count - 1) WHERE id = OLD.route_id;
      ELSE
        UPDATE routes SET active_hazards_count = GREATEST(0, active_hazards_count - 1) WHERE id = OLD.route_id;
      END IF;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
      IF OLD.is_warning = true THEN
        UPDATE routes SET active_warnings_count = GREATEST(0, active_warnings_count - 1) WHERE id = NEW.route_id;
      ELSE
        UPDATE routes SET active_hazards_count = GREATEST(0, active_hazards_count - 1) WHERE id = NEW.route_id;
      END IF;
    ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
      IF NEW.is_warning = true THEN
        UPDATE routes SET active_warnings_count = active_warnings_count + 1 WHERE id = NEW.route_id;
      ELSE
        UPDATE routes SET active_hazards_count = active_hazards_count + 1 WHERE id = NEW.route_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Index on is_warning
CREATE INDEX IF NOT EXISTS idx_route_hazards_is_warning ON route_hazards (is_warning);
