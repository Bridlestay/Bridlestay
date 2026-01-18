-- ============================================
-- Fix: Routes RLS visibility policy
-- Created: 2026-01-18
-- Issue: RLS policy used 'visibility' column but routes use 'is_public' boolean
-- ============================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "routes_visibility_select" ON routes;
DROP POLICY IF EXISTS "Anyone can view routes" ON routes;

-- Create a new policy that handles BOTH visibility patterns
CREATE POLICY "routes_visibility_select" ON routes
  FOR SELECT USING (
    -- Public routes (either visibility method)
    visibility = 'public' 
    OR (visibility IS NULL AND is_public = true)
    OR is_public = true
    -- Owner can always see their own routes
    OR owner_user_id = auth.uid()
    -- Admins can see all routes
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Sync visibility column with is_public for existing routes
UPDATE routes 
SET visibility = CASE 
  WHEN is_public = true THEN 'public'
  WHEN is_public = false THEN 'private'
  ELSE 'private'
END
WHERE visibility IS NULL OR visibility NOT IN ('public', 'private', 'link');

-- Add comment
COMMENT ON POLICY "routes_visibility_select" ON routes 
  IS 'Allows viewing public routes, owner routes, and admin access to all routes';

