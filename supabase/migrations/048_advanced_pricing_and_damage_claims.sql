-- Advanced Pricing, Discounts & Damage Claims System
-- Based on comprehensive pricing specification

-- ============================================
-- 1. UPDATE PROPERTIES TABLE FOR SPLIT CLEANING FEES
-- ============================================

-- Add split cleaning fees (house + stable)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS house_cleaning_fee_pennies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stable_cleaning_fee_pennies INTEGER DEFAULT 0;

-- Add extra guest fee
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS extra_guest_fee_pennies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_guests_included INTEGER DEFAULT 2;

-- Add discount settings
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS allow_discount_stacking BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_discount_cap INTEGER DEFAULT 20 CHECK (max_discount_cap >= 0 AND max_discount_cap <= 100),
ADD COLUMN IF NOT EXISTS first_time_rider_discount_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS first_time_rider_discount_percent INTEGER DEFAULT 10 CHECK (first_time_rider_discount_percent >= 0 AND first_time_rider_discount_percent <= 50);

-- Migrate existing cleaning_fee_pennies to house_cleaning_fee_pennies
UPDATE properties 
SET house_cleaning_fee_pennies = COALESCE(cleaning_fee_pennies, 0)
WHERE house_cleaning_fee_pennies = 0 OR house_cleaning_fee_pennies IS NULL;

-- ============================================
-- 2. CREATE LAST-MINUTE DISCOUNT RULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS last_minute_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  
  -- Rule tier (1-3)
  tier INTEGER NOT NULL CHECK (tier >= 1 AND tier <= 3),
  
  -- Days before check-in threshold
  days_before_checkin INTEGER NOT NULL CHECK (days_before_checkin >= 1 AND days_before_checkin <= 60),
  
  -- Discount percentage
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 50),
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique tiers per property
  UNIQUE(property_id, tier)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_last_minute_discounts_property ON last_minute_discounts(property_id);
CREATE INDEX IF NOT EXISTS idx_last_minute_discounts_enabled ON last_minute_discounts(enabled) WHERE enabled = TRUE;

-- ============================================
-- 3. ENHANCE LENGTH-OF-STAY DISCOUNTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS length_of_stay_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  
  -- Minimum nights to qualify
  min_nights INTEGER NOT NULL CHECK (min_nights >= 2 AND min_nights <= 90),
  
  -- Discount percentage
  discount_percent INTEGER NOT NULL CHECK (discount_percent >= 1 AND discount_percent <= 50),
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique min_nights thresholds per property
  UNIQUE(property_id, min_nights)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_length_of_stay_discounts_property ON length_of_stay_discounts(property_id);
CREATE INDEX IF NOT EXISTS idx_length_of_stay_discounts_enabled ON length_of_stay_discounts(enabled) WHERE enabled = TRUE;

-- ============================================
-- 4. CREATE SEASONAL DISCOUNTS TABLE (Enhanced)
-- ============================================

CREATE TABLE IF NOT EXISTS seasonal_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  
  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Discount percentage (or price override)
  discount_percent INTEGER CHECK (discount_percent >= 1 AND discount_percent <= 50),
  override_price_pennies INTEGER, -- Alternative: set a specific price instead of percentage
  
  -- Name/label for the season
  name TEXT,
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure valid date range
  CONSTRAINT seasonal_discount_dates_valid CHECK (end_date >= start_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_seasonal_discounts_property ON seasonal_discounts(property_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_discounts_dates ON seasonal_discounts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasonal_discounts_enabled ON seasonal_discounts(enabled) WHERE enabled = TRUE;

-- ============================================
-- 5. CREATE DAMAGE CLAIMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS property_damage_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  guest_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  
  -- Claim details
  claim_type TEXT NOT NULL CHECK (claim_type IN ('damage', 'excessive_cleaning', 'both')),
  description TEXT NOT NULL,
  amount_pennies INTEGER NOT NULL CHECK (amount_pennies > 0),
  
  -- Evidence (JSON array of photo URLs)
  evidence_urls JSONB DEFAULT '[]'::jsonb,
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Host submitted, awaiting guest response
    'guest_accepted',    -- Guest accepts claim
    'guest_disputed',    -- Guest disputes claim
    'under_review',      -- Platform reviewing dispute
    'approved',          -- Platform approved claim
    'rejected',          -- Platform rejected claim
    'paid',              -- Payment collected from guest
    'payment_failed',    -- Payment attempt failed
    'cancelled'          -- Claim withdrawn
  )),
  
  -- Guest response
  guest_response TEXT,
  guest_response_at TIMESTAMPTZ,
  
  -- Platform review
  admin_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  admin_decision_at TIMESTAMPTZ,
  
  -- Payment tracking
  stripe_payment_intent_id TEXT,
  payment_collected_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- 48-hour window constraint checked in application layer
  claim_deadline TIMESTAMPTZ NOT NULL -- Set to checkout_date + 48 hours
);

-- Indexes for damage claims
CREATE INDEX IF NOT EXISTS idx_damage_claims_property ON property_damage_claims(property_id);
CREATE INDEX IF NOT EXISTS idx_damage_claims_booking ON property_damage_claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_damage_claims_host ON property_damage_claims(host_id);
CREATE INDEX IF NOT EXISTS idx_damage_claims_guest ON property_damage_claims(guest_id);
CREATE INDEX IF NOT EXISTS idx_damage_claims_status ON property_damage_claims(status);
CREATE INDEX IF NOT EXISTS idx_damage_claims_pending ON property_damage_claims(status) WHERE status IN ('pending', 'guest_disputed', 'under_review');

-- ============================================
-- 6. ADD STRIPE CUSTOMER/PAYMENT METHOD TRACKING
-- ============================================

-- Add Stripe customer ID to users if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Track saved payment methods for off-session charges
CREATE TABLE IF NOT EXISTS saved_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Stripe references
  stripe_payment_method_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  
  -- Card details (for display only)
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  
  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Consent tracking
  off_session_consent_given BOOLEAN DEFAULT FALSE,
  consent_given_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for payment methods
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_user ON saved_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_stripe ON saved_payment_methods(stripe_payment_method_id);

-- ============================================
-- 7. ADD DISCOUNT TRACKING TO BOOKINGS
-- ============================================

-- Track which discounts were applied to a booking
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS discounts_applied JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_discount_pennies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_subtotal_pennies INTEGER,
ADD COLUMN IF NOT EXISTS is_first_time_booking BOOLEAN DEFAULT FALSE;

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- Last-minute discounts
ALTER TABLE last_minute_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view last-minute discounts" ON last_minute_discounts
FOR SELECT TO public USING (true);

CREATE POLICY "Hosts can manage their last-minute discounts" ON last_minute_discounts
FOR ALL TO authenticated
USING (property_id IN (SELECT id FROM properties WHERE host_id = auth.uid()))
WITH CHECK (property_id IN (SELECT id FROM properties WHERE host_id = auth.uid()));

-- Length-of-stay discounts
ALTER TABLE length_of_stay_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view length-of-stay discounts" ON length_of_stay_discounts
FOR SELECT TO public USING (true);

CREATE POLICY "Hosts can manage their length-of-stay discounts" ON length_of_stay_discounts
FOR ALL TO authenticated
USING (property_id IN (SELECT id FROM properties WHERE host_id = auth.uid()))
WITH CHECK (property_id IN (SELECT id FROM properties WHERE host_id = auth.uid()));

-- Seasonal discounts
ALTER TABLE seasonal_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seasonal discounts" ON seasonal_discounts
FOR SELECT TO public USING (true);

CREATE POLICY "Hosts can manage their seasonal discounts" ON seasonal_discounts
FOR ALL TO authenticated
USING (property_id IN (SELECT id FROM properties WHERE host_id = auth.uid()))
WITH CHECK (property_id IN (SELECT id FROM properties WHERE host_id = auth.uid()));

-- Damage claims
ALTER TABLE property_damage_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts and guests can view their claims" ON property_damage_claims
FOR SELECT TO authenticated
USING (host_id = auth.uid() OR guest_id = auth.uid());

CREATE POLICY "Hosts can create claims for their properties" ON property_damage_claims
FOR INSERT TO authenticated
WITH CHECK (host_id = auth.uid());

CREATE POLICY "Guests can update their response" ON property_damage_claims
FOR UPDATE TO authenticated
USING (guest_id = auth.uid() AND status = 'pending')
WITH CHECK (guest_id = auth.uid());

-- Admins can manage all claims (via service role)

-- Saved payment methods
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their payment methods" ON saved_payment_methods
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can manage their payment methods" ON saved_payment_methods
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to calculate best applicable discount
CREATE OR REPLACE FUNCTION calculate_best_discount(
  p_property_id UUID,
  p_checkin_date DATE,
  p_nights INTEGER,
  p_is_first_time_booking BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  discount_type TEXT,
  discount_name TEXT,
  discount_percent INTEGER
) AS $$
DECLARE
  v_days_before_checkin INTEGER;
  v_best_discount_percent INTEGER := 0;
  v_best_discount_type TEXT := NULL;
  v_best_discount_name TEXT := NULL;
  v_discount RECORD;
  v_property RECORD;
BEGIN
  -- Calculate days until check-in
  v_days_before_checkin := p_checkin_date - CURRENT_DATE;
  
  -- Get property settings
  SELECT * INTO v_property FROM properties WHERE id = p_property_id;
  
  -- Check last-minute discounts
  FOR v_discount IN 
    SELECT * FROM last_minute_discounts 
    WHERE property_id = p_property_id 
    AND enabled = TRUE 
    AND days_before_checkin >= v_days_before_checkin
    ORDER BY discount_percent DESC
    LIMIT 1
  LOOP
    IF v_discount.discount_percent > v_best_discount_percent THEN
      v_best_discount_percent := v_discount.discount_percent;
      v_best_discount_type := 'last_minute';
      v_best_discount_name := v_days_before_checkin || ' days before check-in';
    END IF;
  END LOOP;
  
  -- Check length-of-stay discounts
  FOR v_discount IN 
    SELECT * FROM length_of_stay_discounts 
    WHERE property_id = p_property_id 
    AND enabled = TRUE 
    AND min_nights <= p_nights
    ORDER BY discount_percent DESC
    LIMIT 1
  LOOP
    IF v_discount.discount_percent > v_best_discount_percent THEN
      v_best_discount_percent := v_discount.discount_percent;
      v_best_discount_type := 'length_of_stay';
      v_best_discount_name := p_nights || '+ nights stay';
    END IF;
  END LOOP;
  
  -- Check seasonal discounts
  FOR v_discount IN 
    SELECT * FROM seasonal_discounts 
    WHERE property_id = p_property_id 
    AND enabled = TRUE 
    AND start_date <= p_checkin_date 
    AND end_date >= p_checkin_date
    ORDER BY discount_percent DESC
    LIMIT 1
  LOOP
    IF v_discount.discount_percent > v_best_discount_percent THEN
      v_best_discount_percent := v_discount.discount_percent;
      v_best_discount_type := 'seasonal';
      v_best_discount_name := COALESCE(v_discount.name, 'Seasonal discount');
    END IF;
  END LOOP;
  
  -- Check first-time rider discount
  IF p_is_first_time_booking AND v_property.first_time_rider_discount_enabled THEN
    IF v_property.first_time_rider_discount_percent > v_best_discount_percent THEN
      v_best_discount_percent := v_property.first_time_rider_discount_percent;
      v_best_discount_type := 'first_time_rider';
      v_best_discount_name := 'First-time booking discount';
    END IF;
  END IF;
  
  -- Return best discount if any
  IF v_best_discount_percent > 0 THEN
    discount_type := v_best_discount_type;
    discount_name := v_best_discount_name;
    discount_percent := v_best_discount_percent;
    RETURN NEXT;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON TABLE last_minute_discounts TO authenticated;
GRANT ALL ON TABLE length_of_stay_discounts TO authenticated;
GRANT ALL ON TABLE seasonal_discounts TO authenticated;
GRANT ALL ON TABLE property_damage_claims TO authenticated;
GRANT ALL ON TABLE saved_payment_methods TO authenticated;

-- Comments
COMMENT ON TABLE last_minute_discounts IS 'Last-minute booking discounts (up to 3 tiered rules per property)';
COMMENT ON TABLE length_of_stay_discounts IS 'Discounts for longer bookings based on number of nights';
COMMENT ON TABLE seasonal_discounts IS 'Date-based discounts for specific seasons or periods';
COMMENT ON TABLE property_damage_claims IS 'Post-checkout damage and excessive cleaning claims (48hr window)';
COMMENT ON TABLE saved_payment_methods IS 'Saved payment methods for off-session charges (damage claims)';
COMMENT ON FUNCTION calculate_best_discount IS 'Returns the single best applicable discount for a booking (no stacking by default)';

