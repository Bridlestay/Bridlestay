-- Fix RLS policies for referral_codes to allow users to create their own referral codes

-- Drop the restrictive select policy and create a better one
DROP POLICY IF EXISTS "Users can view own referral code" ON referral_codes;

-- Users can view their own codes AND active promo codes
CREATE POLICY "Users can view referral codes" ON referral_codes
  FOR SELECT USING (
    owner_user_id = auth.uid() 
    OR code_type IN ('promo', 'partner', 'influencer')
  );

-- Users can create their own referral codes
CREATE POLICY "Users can create own referral code" ON referral_codes
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid() 
    AND code_type = 'user_referral'
  );

-- Users can update their own codes (to toggle active status etc)
CREATE POLICY "Users can update own referral code" ON referral_codes
  FOR UPDATE USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Fix badge policies to allow admins to insert badges
DROP POLICY IF EXISTS "Admins manage badges" ON badges;

CREATE POLICY "Admins can manage badges" ON badges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can insert user_badges (for manual awards)
CREATE POLICY "Admins can award badges" ON user_badges
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

