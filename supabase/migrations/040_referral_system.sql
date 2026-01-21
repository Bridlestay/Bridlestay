-- Referral and Discount Code System for padoq

-- ===========================================
-- 1. REFERRAL CODES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,              -- e.g., "RICHARD2024", "CANTRA50"
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- User who owns this code (null for admin codes)
  
  -- Code type
  code_type TEXT NOT NULL CHECK (code_type IN ('user_referral', 'promo', 'influencer', 'partner')),
  
  -- Benefits for the REFERRED user (new user using the code)
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('guest_fee_discount', 'host_fee_waiver', 'fixed_credit')),
  benefit_value INTEGER NOT NULL,         -- Percentage (e.g., 50 for 50%) or pennies for fixed credit
  benefit_duration_months INTEGER,        -- How long the benefit lasts (null = one-time)
  benefit_uses_limit INTEGER,             -- Max number of bookings benefit applies to (null = unlimited during duration)
  
  -- Benefits for the REFERRER (person who shared the code)
  referrer_benefit_type TEXT CHECK (referrer_benefit_type IN ('host_fee_waiver', 'fixed_credit', 'none')),
  referrer_benefit_value INTEGER,         -- Percentage or pennies
  referrer_benefit_per_referral BOOLEAN DEFAULT true,  -- Per successful referral or one-time
  
  -- Limits
  max_uses INTEGER,                       -- Total times code can be used (null = unlimited)
  uses_count INTEGER DEFAULT 0,           -- Current usage count
  
  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,                -- null = never expires
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ===========================================
-- 2. REFERRAL REDEMPTIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Who referred them
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'exhausted')),
  
  -- Tracking benefit usage
  benefit_uses_remaining INTEGER,         -- How many more times benefit can be used
  benefit_expires_at TIMESTAMPTZ,         -- When the benefit expires
  
  -- Track actual savings
  total_savings_pennies INTEGER DEFAULT 0,
  bookings_with_benefit INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- User can only redeem a code once
  UNIQUE(code_id, user_id)
);

-- ===========================================
-- 3. REFERRER REWARDS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS referrer_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redemption_id UUID NOT NULL REFERENCES referral_redemptions(id) ON DELETE CASCADE,
  
  -- Reward details
  reward_type TEXT NOT NULL,
  reward_value INTEGER NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'expired')),
  credited_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 4. USER CREDITS/BALANCE TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Credit type
  credit_type TEXT NOT NULL CHECK (credit_type IN ('referral_bonus', 'promo_credit', 'refund', 'compensation')),
  
  -- Amount
  amount_pennies INTEGER NOT NULL,
  
  -- Usage
  used_pennies INTEGER DEFAULT 0,
  remaining_pennies INTEGER GENERATED ALWAYS AS (amount_pennies - used_pennies) STORED,
  
  -- Validity
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Reference
  source_id UUID,                         -- Reference to redemption or other source
  source_type TEXT,
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 5. ADD REFERRAL CODE TO USERS TABLE
-- ===========================================
DO $$
BEGIN
  -- Add column for user's personal referral code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'referral_code') THEN
    ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
  END IF;
  
  -- Add column for who referred this user
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'referred_by_user_id') THEN
    ALTER TABLE users ADD COLUMN referred_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  -- Add column for referral code used at signup
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'signup_referral_code') THEN
    ALTER TABLE users ADD COLUMN signup_referral_code TEXT;
  END IF;
END $$;

-- ===========================================
-- 6. INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_owner ON referral_codes(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_user ON referral_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_code ON referral_redemptions(code_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_user ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_active ON user_credits(user_id, is_active) WHERE is_active = true;

-- ===========================================
-- 7. FUNCTION: Generate unique referral code for user
-- ===========================================
CREATE OR REPLACE FUNCTION generate_user_referral_code(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_name TEXT;
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  -- Get user's name
  SELECT UPPER(REGEXP_REPLACE(SPLIT_PART(name, ' ', 1), '[^A-Z]', '', 'gi'))
  INTO user_name
  FROM users WHERE id = user_id;
  
  -- Create base code (name + random suffix)
  base_code := COALESCE(user_name, 'CANTRA') || SUBSTRING(gen_random_uuid()::text, 1, 4);
  final_code := UPPER(base_code);
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = final_code) LOOP
    counter := counter + 1;
    final_code := UPPER(base_code) || counter::text;
  END LOOP;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 8. FUNCTION: Apply referral discount to booking
-- ===========================================
CREATE OR REPLACE FUNCTION calculate_referral_discount(
  p_user_id UUID,
  p_base_guest_fee_pennies INTEGER,
  p_base_host_fee_pennies INTEGER
)
RETURNS TABLE (
  guest_fee_discount_pennies INTEGER,
  host_fee_discount_pennies INTEGER,
  redemption_id UUID
) AS $$
DECLARE
  v_redemption RECORD;
BEGIN
  guest_fee_discount_pennies := 0;
  host_fee_discount_pennies := 0;
  redemption_id := NULL;
  
  -- Find active redemption for user
  SELECT r.*, c.benefit_type, c.benefit_value
  INTO v_redemption
  FROM referral_redemptions r
  JOIN referral_codes c ON r.code_id = c.id
  WHERE r.user_id = p_user_id
    AND r.status = 'active'
    AND (r.benefit_expires_at IS NULL OR r.benefit_expires_at > NOW())
    AND (r.benefit_uses_remaining IS NULL OR r.benefit_uses_remaining > 0)
  LIMIT 1;
  
  IF FOUND THEN
    redemption_id := v_redemption.id;
    
    IF v_redemption.benefit_type = 'guest_fee_discount' THEN
      guest_fee_discount_pennies := (p_base_guest_fee_pennies * v_redemption.benefit_value / 100);
    ELSIF v_redemption.benefit_type = 'host_fee_waiver' THEN
      host_fee_discount_pennies := (p_base_host_fee_pennies * v_redemption.benefit_value / 100);
    END IF;
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 9. RLS POLICIES
-- ===========================================
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Users can view their own referral code
CREATE POLICY "Users can view own referral code" ON referral_codes
  FOR SELECT USING (owner_user_id = auth.uid());

-- Users can view their redemptions
CREATE POLICY "Users can view own redemptions" ON referral_redemptions
  FOR SELECT USING (user_id = auth.uid() OR referrer_user_id = auth.uid());

-- Users can view their rewards
CREATE POLICY "Users can view own rewards" ON referrer_rewards
  FOR SELECT USING (referrer_user_id = auth.uid());

-- Users can view their credits
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (user_id = auth.uid());

-- Admins can manage everything
CREATE POLICY "Admins manage referral codes" ON referral_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins manage redemptions" ON referral_redemptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins manage rewards" ON referrer_rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins manage credits" ON user_credits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ===========================================
-- 10. COMMENTS
-- ===========================================
COMMENT ON TABLE referral_codes IS 'Referral and promo codes with configurable benefits';
COMMENT ON TABLE referral_redemptions IS 'Tracks which users have redeemed which codes';
COMMENT ON TABLE referrer_rewards IS 'Rewards earned by users who referred others';
COMMENT ON TABLE user_credits IS 'Credit balance for users from referrals, promos, etc.';

