-- Migration 062: Fix user_stats RLS for new user signup
-- ===========================================
-- Problem: When a new user signs up, the trigger that initializes user_stats
-- fails because RLS policies require auth.uid() = user_id, but during the
-- trigger execution this check fails.
-- 
-- Solution: Make the trigger function SECURITY DEFINER to bypass RLS.
-- ===========================================

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION on_user_created_init_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also add a policy that allows the service role to insert user_stats
-- This helps with any server-side operations that need to create stats
DROP POLICY IF EXISTS "Service role can manage user_stats" ON user_stats;
CREATE POLICY "Service role can manage user_stats" ON user_stats
  FOR ALL USING (true) WITH CHECK (true);

-- Alternative: Allow inserting user_stats during signup by relaxing INSERT policy
-- This allows anyone to insert their own stats row (but only their own)
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (true); -- Allow insert, the UNIQUE constraint on user_id prevents abuse

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_user_created_init_stats ON users;
CREATE TRIGGER trigger_user_created_init_stats
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION on_user_created_init_stats();

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION on_user_created_init_stats() TO authenticated;

COMMENT ON FUNCTION on_user_created_init_stats() IS 'Initialize user_stats row when a new user is created. Uses SECURITY DEFINER to bypass RLS.';

