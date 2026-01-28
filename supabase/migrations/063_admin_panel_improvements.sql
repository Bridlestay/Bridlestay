-- Migration 063: Admin Panel Improvements
-- Date: 2026-01-28
-- 
-- Changes:
-- 1. Add is_important to user_feedback for prioritizing feedback
-- 2. Remove rarity from badges display (keep in DB for backwards compat, just won't use it)
-- 3. Add fee_discount_percent to users for referral-based fee discounts
-- 4. Add referral_fee_discount tracking

-- ============================================
-- 1. FEEDBACK - Add "Mark as Important" feature
-- ============================================

ALTER TABLE user_feedback 
ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_feedback.is_important IS 'Admin can mark feedback as important for prioritization';

CREATE INDEX IF NOT EXISTS idx_user_feedback_important ON user_feedback(is_important) WHERE is_important = true;

-- ============================================
-- 2. REFERRAL FEE DISCOUNTS
-- ============================================

-- Add fee discount tracking to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_fee_discount_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_discount_bookings_remaining INTEGER DEFAULT 0;

COMMENT ON COLUMN users.referral_fee_discount_percent IS 'Current fee discount percentage from referrals (e.g., 50 = 50% off)';
COMMENT ON COLUMN users.referral_discount_bookings_remaining IS 'Number of bookings the discount applies to';

-- Update referral_codes to use fee discounts by default
UPDATE referral_codes 
SET benefit_type = 'guest_fee_discount', 
    benefit_value = 50  -- 50% off guest fees
WHERE code_type = 'user_referral' 
AND benefit_type = 'fixed_credit';

-- Add column to track stacked referral benefits
CREATE TABLE IF NOT EXISTS user_referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- What they earned
  reward_type TEXT NOT NULL CHECK (reward_type IN ('fee_discount', 'badge')),
  discount_percent INTEGER, -- For fee_discount type
  bookings_applicable INTEGER DEFAULT 1, -- How many bookings this applies to
  bookings_used INTEGER DEFAULT 0,
  
  -- Where it came from
  from_referral_id UUID REFERENCES referral_redemptions(id),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_referral_rewards_user ON user_referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_referral_rewards_active ON user_referral_rewards(user_id, status) WHERE status = 'active';

-- RLS for referral rewards
ALTER TABLE user_referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewards" ON user_referral_rewards
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all rewards" ON user_referral_rewards
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 3. BADGE SIMPLIFICATION
-- ============================================

-- We keep the rarity column for backwards compatibility but will ignore it in UI
-- Add a note column for admin-awarded badges

ALTER TABLE badges
ADD COLUMN IF NOT EXISTS admin_note TEXT;

COMMENT ON COLUMN badges.admin_note IS 'Internal admin note about this badge (not shown to users)';

-- ============================================
-- 4. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON TABLE user_referral_rewards TO authenticated;


