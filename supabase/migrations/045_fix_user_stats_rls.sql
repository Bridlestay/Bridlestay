-- ===========================================
-- Fix user_stats RLS policies
-- The trigger for route creation needs to insert/update user_stats
-- ===========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;

-- Allow users to SELECT their own stats
CREATE POLICY "Users can view own stats" ON user_stats
  FOR SELECT USING (user_id = auth.uid());

-- Allow users to INSERT their own stats (needed for triggers)
CREATE POLICY "Users can insert own stats" ON user_stats
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to UPDATE their own stats (needed for triggers)  
CREATE POLICY "Users can update own stats" ON user_stats
  FOR UPDATE USING (user_id = auth.uid());

-- Also allow admins to manage all stats
DROP POLICY IF EXISTS "Admins manage user_stats" ON user_stats;
CREATE POLICY "Admins manage user_stats" ON user_stats
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Make the update_user_stat function run as SECURITY DEFINER
-- This allows it to bypass RLS when updating stats
CREATE OR REPLACE FUNCTION update_user_stat(
  p_user_id UUID,
  p_stat_name TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
  -- Ensure user has a stats row
  INSERT INTO user_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update the specific stat
  EXECUTE format(
    'UPDATE user_stats SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE user_id = $2',
    p_stat_name, p_stat_name
  ) USING p_increment, p_user_id;
  
  -- Check for new badges
  PERFORM check_and_award_badges(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also make check_and_award_badges run as SECURITY DEFINER
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TABLE (badge_slug TEXT, badge_name TEXT, newly_earned BOOLEAN) AS $$
DECLARE
  v_stats user_stats%ROWTYPE;
  v_badge badges%ROWTYPE;
  v_current_value INTEGER;
  v_counties_count INTEGER;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_stats (user_id) VALUES (p_user_id);
    SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
  END IF;
  
  -- Count counties
  v_counties_count := COALESCE(array_length(v_stats.counties_visited, 1), 0);
  
  -- Check each active badge
  FOR v_badge IN 
    SELECT * FROM badges WHERE is_active = true
  LOOP
    -- Determine current value based on criteria type
    CASE v_badge.criteria_type
      WHEN 'routes_created' THEN v_current_value := v_stats.routes_created;
      WHEN 'routes_completed' THEN v_current_value := v_stats.routes_completed;
      WHEN 'reviews_written' THEN v_current_value := v_stats.reviews_written;
      WHEN 'properties_listed' THEN v_current_value := v_stats.properties_listed;
      WHEN 'bookings_completed' THEN v_current_value := v_stats.bookings_completed;
      WHEN 'bookings_hosted' THEN v_current_value := v_stats.bookings_hosted;
      WHEN 'referrals_made' THEN v_current_value := v_stats.referrals_made;
      WHEN 'counties_visited' THEN v_current_value := v_counties_count;
      WHEN 'total_nights_stayed' THEN v_current_value := v_stats.total_nights_stayed;
      ELSE v_current_value := 0;
    END CASE;
    
    -- Check if badge should be awarded
    IF v_current_value >= v_badge.criteria_value THEN
      -- Try to award badge (if not already earned)
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, v_badge.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
      
      -- Return info about this badge
      badge_slug := v_badge.slug;
      badge_name := v_badge.name;
      newly_earned := FOUND;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make on_route_created also run as SECURITY DEFINER
CREATE OR REPLACE FUNCTION on_route_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_stat(NEW.owner_user_id, 'routes_created', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

