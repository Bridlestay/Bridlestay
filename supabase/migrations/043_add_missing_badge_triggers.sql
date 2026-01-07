-- Add missing triggers for badge system

-- When a review is written for a property
CREATE OR REPLACE FUNCTION on_review_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the reviewer's stats
  PERFORM update_user_stat(NEW.guest_id, 'reviews_written', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_review_created ON reviews;
CREATE TRIGGER trigger_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION on_review_created();

-- When a route review is written
CREATE OR REPLACE FUNCTION on_route_review_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_stat(NEW.user_id, 'routes_reviewed', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_route_review_created ON route_reviews;
CREATE TRIGGER trigger_route_review_created
  AFTER INSERT ON route_reviews
  FOR EACH ROW
  EXECUTE FUNCTION on_route_review_created();

-- When a route is marked as completed (via route_completions table if exists)
-- For now, we'll track this via a manual increment or separate completion table

-- When a referral is successful
CREATE OR REPLACE FUNCTION on_referral_redeemed()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the referrer's stats if they exist
  IF NEW.referrer_user_id IS NOT NULL THEN
    PERFORM update_user_stat(NEW.referrer_user_id, 'referrals_made', 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_referral_redeemed ON referral_redemptions;
CREATE TRIGGER trigger_referral_redeemed
  AFTER INSERT ON referral_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION on_referral_redeemed();

-- Fix: Initialize user_stats when a user is created
CREATE OR REPLACE FUNCTION on_user_created_init_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_created_init_stats ON users;
CREATE TRIGGER trigger_user_created_init_stats
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION on_user_created_init_stats();

-- Create route_completions table to track when users complete routes
CREATE TABLE IF NOT EXISTS route_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  UNIQUE(user_id, route_id)
);

CREATE INDEX IF NOT EXISTS idx_route_completions_user ON route_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_route_completions_route ON route_completions(route_id);

-- Enable RLS
ALTER TABLE route_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all completions" ON route_completions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own completions" ON route_completions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own completions" ON route_completions
  FOR UPDATE USING (user_id = auth.uid());

-- Trigger for route completion
CREATE OR REPLACE FUNCTION on_route_completed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_stat(NEW.user_id, 'routes_completed', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_route_completed ON route_completions;
CREATE TRIGGER trigger_route_completed
  AFTER INSERT ON route_completions
  FOR EACH ROW
  EXECUTE FUNCTION on_route_completed();

COMMENT ON TABLE route_completions IS 'Tracks when users complete routes for badge progression';

