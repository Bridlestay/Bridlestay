-- ============================================
-- Migration 083: Fix reviews table reference in stats function
-- ============================================
-- The sync_user_stats_and_badges function (from migration 064)
-- references the old `reviews` table which was dropped in migration 082.
-- Update it to use `property_reviews` instead.
-- ============================================

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

  -- Count reviews written (using property_reviews — old `reviews` table was dropped)
  SELECT COUNT(*) INTO v_reviews_written
  FROM property_reviews WHERE reviewer_id = p_user_id;

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
