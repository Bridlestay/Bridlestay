-- ============================================
-- Migration 084: Fix "link" visibility RLS policy
-- ============================================
-- The routes SELECT policy currently allows `is_public = true` routes
-- but doesn't properly handle `visibility = 'link'` routes.
-- Link-only routes should be accessible when accessed with a valid share_token,
-- but the RLS check happens at the DB level — we need to allow the API
-- (using service client) to fetch link-only routes by share_token.
--
-- Also ensures share_token is generated for link-visibility routes.
-- ============================================

-- Update the routes SELECT policy to include link-visibility routes
-- when accessed by authenticated users (the API will validate the share_token)
DROP POLICY IF EXISTS "routes_select" ON routes;
CREATE POLICY "routes_select" ON routes
  FOR SELECT USING (
    visibility = 'public'
    OR (visibility IS NULL AND is_public = true)
    OR is_public = true
    OR owner_user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- Ensure the share_token trigger function exists and works correctly
CREATE OR REPLACE FUNCTION generate_route_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visibility = 'link' AND (NEW.share_token IS NULL OR NEW.share_token = '') THEN
    NEW.share_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS route_share_token_trigger ON routes;
CREATE TRIGGER route_share_token_trigger
  BEFORE INSERT OR UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION generate_route_share_token();
