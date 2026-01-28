-- Migration 064: Cleanup badges and referrals
-- Date: 2026-01-28
-- 
-- Changes:
-- 1. Remove fixed_credit from referral benefit types
-- 2. Fix badge awarding trigger to properly award badges
-- 3. Add function to manually sync user stats and award badges

-- ============================================
-- 1. REMOVE FIXED_CREDIT FROM REFERRALS
-- ============================================

-- Update the check constraint to remove fixed_credit option
-- First drop the existing constraint
ALTER TABLE referral_codes 
DROP CONSTRAINT IF EXISTS referral_codes_benefit_type_check;

-- Add new constraint without fixed_credit
ALTER TABLE referral_codes 
ADD CONSTRAINT referral_codes_benefit_type_check 
CHECK (benefit_type IN ('guest_fee_discount', 'host_fee_waiver'));

-- Update referrer_benefit_type constraint too
ALTER TABLE referral_codes 
DROP CONSTRAINT IF EXISTS referral_codes_referrer_benefit_type_check;

ALTER TABLE referral_codes 
ADD CONSTRAINT referral_codes_referrer_benefit_type_check 
CHECK (referrer_benefit_type IN ('host_fee_waiver', 'guest_fee_discount', 'none') OR referrer_benefit_type IS NULL);

-- Convert any existing fixed_credit to guest_fee_discount
UPDATE referral_codes 
SET benefit_type = 'guest_fee_discount', benefit_value = 50 
WHERE benefit_type = 'fixed_credit';

UPDATE referral_codes 
SET referrer_benefit_type = 'guest_fee_discount', referrer_benefit_value = 50 
WHERE referrer_benefit_type = 'fixed_credit';

-- ============================================
-- 2. FIX BADGE AWARDING - Ensure stats exist and badges are checked
-- ============================================

-- Improved function to ensure user_stats exists and is current
CREATE OR REPLACE FUNCTION sync_user_stats_and_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_routes_created INTEGER;
  v_routes_completed INTEGER;
  v_reviews_written INTEGER;
  v_bookings_completed INTEGER;
  v_properties_listed INTEGER;
  v_bookings_hosted INTEGER;
BEGIN
  -- Count actual routes created by user
  SELECT COUNT(*) INTO v_routes_created 
  FROM routes WHERE owner_user_id = p_user_id;
  
  -- Count route completions
  SELECT COUNT(*) INTO v_routes_completed 
  FROM route_completions WHERE user_id = p_user_id;
  
  -- Count reviews written
  SELECT COUNT(*) INTO v_reviews_written 
  FROM reviews WHERE user_id = p_user_id;
  
  -- Count bookings completed as guest
  SELECT COUNT(*) INTO v_bookings_completed 
  FROM bookings WHERE guest_id = p_user_id AND status IN ('accepted', 'completed');
  
  -- Count properties listed
  SELECT COUNT(*) INTO v_properties_listed 
  FROM properties WHERE host_id = p_user_id;
  
  -- Count bookings hosted
  SELECT COUNT(*) INTO v_bookings_hosted 
  FROM bookings b 
  JOIN properties p ON b.property_id = p.id 
  WHERE p.host_id = p_user_id AND b.status IN ('accepted', 'completed');
  
  -- Upsert user_stats
  INSERT INTO user_stats (user_id, routes_created, routes_completed, reviews_written, 
                          bookings_completed, properties_listed, bookings_hosted)
  VALUES (p_user_id, v_routes_created, v_routes_completed, v_reviews_written,
          v_bookings_completed, v_properties_listed, v_bookings_hosted)
  ON CONFLICT (user_id) DO UPDATE SET
    routes_created = EXCLUDED.routes_created,
    routes_completed = EXCLUDED.routes_completed,
    reviews_written = EXCLUDED.reviews_written,
    bookings_completed = EXCLUDED.bookings_completed,
    properties_listed = EXCLUDED.properties_listed,
    bookings_hosted = EXCLUDED.bookings_hosted,
    updated_at = NOW();
  
  -- Now check and award badges
  PERFORM check_and_award_badges(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Improved route creation trigger that ensures stats are synced
CREATE OR REPLACE FUNCTION on_route_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync stats and check badges
  PERFORM sync_user_stats_and_badges(NEW.owner_user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_route_created ON routes;
CREATE TRIGGER trigger_route_created
  AFTER INSERT ON routes
  FOR EACH ROW
  EXECUTE FUNCTION on_route_created();

-- Also trigger on route completion
CREATE OR REPLACE FUNCTION on_route_completed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM sync_user_stats_and_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_route_completed ON route_completions;
CREATE TRIGGER trigger_route_completed
  AFTER INSERT ON route_completions
  FOR EACH ROW
  EXECUTE FUNCTION on_route_completed();

-- ============================================
-- 3. API function to manually trigger badge check for a user
-- ============================================

-- This can be called from admin or when user visits their profile
CREATE OR REPLACE FUNCTION api_refresh_user_badges(p_user_id UUID)
RETURNS TABLE (badge_slug TEXT, badge_name TEXT, newly_earned BOOLEAN) AS $$
BEGIN
  -- First sync stats
  PERFORM sync_user_stats_and_badges(p_user_id);
  
  -- Return newly earned badges (for UI notification)
  RETURN QUERY
  SELECT b.slug, b.name, true as newly_earned
  FROM user_badges ub
  JOIN badges b ON ub.badge_id = b.id
  WHERE ub.user_id = p_user_id
  AND ub.earned_at > NOW() - INTERVAL '5 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION api_refresh_user_badges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_stats_and_badges(UUID) TO authenticated;

-- ============================================
-- 4. SYNC ALL EXISTING USERS
-- ============================================

-- Run badge sync for all users who have created routes
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN 
    SELECT DISTINCT owner_user_id FROM routes WHERE owner_user_id IS NOT NULL
  LOOP
    PERFORM sync_user_stats_and_badges(v_user_id);
  END LOOP;
END $$;


