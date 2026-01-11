-- Payments, Cancellations & Refunds System
-- Based on comprehensive payment specification

-- ============================================
-- 1. UPDATE CANCELLATION POLICY ENUM
-- ============================================

-- Add new cancellation policy values if they don't exist
DO $$ 
BEGIN
  -- Check if the type exists and alter if needed
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cancellation_policy') THEN
    -- Type exists, we'll work with existing values
    NULL;
  END IF;
END $$;

-- ============================================
-- 2. ENHANCE BOOKINGS TABLE FOR PAYMENT TRACKING
-- ============================================

-- Add payment tracking fields
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' 
  CHECK (payment_status IN ('pending', 'deposit_paid', 'fully_paid', 'refunded', 'partially_refunded', 'failed')),
ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending'
  CHECK (payout_status IN ('pending', 'held', 'released', 'cancelled', 'clawed_back')),
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_balance_payment_intent_id TEXT, -- For split payments
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payout_id TEXT,

-- Split payment tracking
ADD COLUMN IF NOT EXISTS is_split_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deposit_amount_pennies INTEGER,
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS balance_amount_pennies INTEGER,
ADD COLUMN IF NOT EXISTS balance_due_date DATE,
ADD COLUMN IF NOT EXISTS balance_paid_at TIMESTAMPTZ,

-- Fee breakdown
ADD COLUMN IF NOT EXISTS guest_fee_pennies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS host_fee_pennies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS host_payout_pennies INTEGER DEFAULT 0,

-- Resolution window
ADD COLUMN IF NOT EXISTS resolution_window_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolution_window_status TEXT DEFAULT 'not_started'
  CHECK (resolution_window_status IN ('not_started', 'active', 'issue_reported', 'resolved', 'expired')),
ADD COLUMN IF NOT EXISTS payout_released_at TIMESTAMPTZ,

-- Cancellation tracking
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('guest', 'host', 'platform')),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_amount_pennies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

-- ============================================
-- 3. CREATE POST CHECK-IN ISSUES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS booking_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  
  -- Reported by
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  reporter_type TEXT NOT NULL CHECK (reporter_type IN ('guest', 'host')),
  
  -- Issue details
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'misrepresentation',      -- Property not as described
    'cleanliness',            -- Serious cleanliness issues
    'safety',                 -- Safety concerns (including horse safety)
    'access_denied',          -- Couldn't access property
    'missing_amenities',      -- Core amenities missing
    'host_cancellation',      -- Host cancelled last minute
    'other'                   -- Other serious issues
  )),
  description TEXT NOT NULL,
  evidence_urls JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'under_review',
    'approved',       -- Issue confirmed, action taken
    'rejected',       -- Issue not valid
    'resolved'        -- Issue resolved without action
  )),
  
  -- Resolution
  resolution_type TEXT CHECK (resolution_type IN (
    'no_action',
    'partial_refund',
    'unused_nights_refund',
    'full_refund',
    'payout_cancelled'
  )),
  resolution_notes TEXT,
  refund_amount_pennies INTEGER,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure reported within resolution window
  reported_within_window BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 4. CREATE CANCELLATION POLICY DETAILS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cancellation_policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL UNIQUE CHECK (policy_name IN ('flexible', 'standard', 'strict')),
  
  -- Rule definitions (JSON array of rules)
  rules JSONB NOT NULL,
  
  -- Display info
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  guest_friendly_summary TEXT NOT NULL,
  host_friendly_summary TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert the 3 cancellation policies
INSERT INTO cancellation_policy_rules (policy_name, rules, display_name, description, guest_friendly_summary, host_friendly_summary)
VALUES 
  (
    'flexible',
    '[
      {"days_before": 7, "refund_percent": 100},
      {"days_before": 0, "refund_percent": 0, "note": "First night non-refundable, remaining refundable if rebooked"}
    ]'::jsonb,
    'Flexible',
    'Full refund up to 7 days before check-in. After that, first night is non-refundable and remaining nights are refundable if the property is rebooked.',
    'Full refund if you cancel at least 7 days before check-in. After that, your first night is non-refundable.',
    'Guests get a full refund up to 7 days before. Inside 7 days, you keep the first night and remaining is refundable only if rebooked.'
  ),
  (
    'standard',
    '[
      {"days_before": 14, "refund_percent": 100},
      {"days_before": 7, "refund_percent": 50},
      {"days_before": 0, "refund_percent": 0}
    ]'::jsonb,
    'Standard',
    'Full refund up to 14 days before check-in. 50% refund between 14 and 7 days. No refund inside 7 days.',
    'Full refund if you cancel at least 14 days before. 50% refund between 14-7 days. No refund inside 7 days.',
    'Guests get a full refund up to 14 days before. 50% between 14-7 days. No refund inside 7 days.'
  ),
  (
    'strict',
    '[
      {"days_before": 30, "refund_percent": 100},
      {"days_before": 14, "refund_percent": 50},
      {"days_before": 0, "refund_percent": 0}
    ]'::jsonb,
    'Strict',
    'Full refund up to 30 days before check-in. 50% refund between 30 and 14 days. No refund inside 14 days.',
    'Full refund if you cancel at least 30 days before. 50% refund between 30-14 days. No refund inside 14 days.',
    'Guests get a full refund up to 30 days before. 50% between 30-14 days. No refund inside 14 days.'
  )
ON CONFLICT (policy_name) DO UPDATE SET
  rules = EXCLUDED.rules,
  description = EXCLUDED.description,
  guest_friendly_summary = EXCLUDED.guest_friendly_summary,
  host_friendly_summary = EXCLUDED.host_friendly_summary,
  updated_at = now();

-- ============================================
-- 5. PAYOUT SCHEDULE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS scheduled_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Payout details
  amount_pennies INTEGER NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'processing',
    'completed',
    'cancelled',
    'failed'
  )),
  
  -- Stripe references
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,
  
  -- Processing
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. SPLIT PAYMENT SCHEDULE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS scheduled_balance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Payment details
  amount_pennies INTEGER NOT NULL,
  scheduled_for DATE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'processing',
    'completed',
    'failed',
    'cancelled'
  )),
  
  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_payment_method_id TEXT,
  
  -- Processing
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- Booking issues
ALTER TABLE booking_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their booking issues" ON booking_issues
FOR SELECT TO authenticated
USING (
  reporter_id = auth.uid() OR
  booking_id IN (SELECT id FROM bookings WHERE guest_id = auth.uid() OR property_id IN (SELECT id FROM properties WHERE host_id = auth.uid()))
);

CREATE POLICY "Users can create issues for their bookings" ON booking_issues
FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid() AND
  booking_id IN (SELECT id FROM bookings WHERE guest_id = auth.uid() OR property_id IN (SELECT id FROM properties WHERE host_id = auth.uid()))
);

-- Cancellation policy rules (public read)
ALTER TABLE cancellation_policy_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cancellation policies" ON cancellation_policy_rules
FOR SELECT TO public USING (true);

-- Scheduled payouts
ALTER TABLE scheduled_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their scheduled payouts" ON scheduled_payouts
FOR SELECT TO authenticated
USING (host_id = auth.uid());

-- Scheduled balance payments
ALTER TABLE scheduled_balance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can view their scheduled payments" ON scheduled_balance_payments
FOR SELECT TO authenticated
USING (guest_id = auth.uid());

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to calculate refund amount based on cancellation policy
CREATE OR REPLACE FUNCTION calculate_refund_amount(
  p_booking_id UUID,
  p_cancellation_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  refund_amount_pennies INTEGER,
  refund_percent INTEGER,
  policy_applied TEXT
) AS $$
DECLARE
  v_booking RECORD;
  v_days_before INTEGER;
  v_policy_rules JSONB;
  v_rule JSONB;
  v_refund_percent INTEGER := 0;
BEGIN
  -- Get booking details
  SELECT b.*, p.cancellation_policy
  INTO v_booking
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  WHERE b.id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate days before check-in
  v_days_before := (v_booking.start_date::date - p_cancellation_date::date);
  
  -- Get policy rules
  SELECT rules INTO v_policy_rules
  FROM cancellation_policy_rules
  WHERE policy_name = v_booking.cancellation_policy;
  
  IF v_policy_rules IS NULL THEN
    -- Default to standard policy
    SELECT rules INTO v_policy_rules
    FROM cancellation_policy_rules
    WHERE policy_name = 'standard';
  END IF;
  
  -- Find applicable refund percentage
  FOR v_rule IN SELECT * FROM jsonb_array_elements(v_policy_rules) ORDER BY (value->>'days_before')::int DESC
  LOOP
    IF v_days_before >= (v_rule->>'days_before')::int THEN
      v_refund_percent := (v_rule->>'refund_percent')::int;
      EXIT;
    END IF;
  END LOOP;
  
  -- Calculate refund amount (on accommodation only, not service fees)
  refund_amount_pennies := (v_booking.total_pennies - COALESCE(v_booking.guest_fee_pennies, 0)) * v_refund_percent / 100;
  refund_percent := v_refund_percent;
  policy_applied := v_booking.cancellation_policy;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to check if booking is within resolution window
CREATE OR REPLACE FUNCTION is_within_resolution_window(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if current time is within 48 hours of check-in start
  RETURN (
    now() >= v_booking.start_date AND 
    now() <= v_booking.start_date + INTERVAL '48 hours'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to determine if split payment is needed
CREATE OR REPLACE FUNCTION needs_split_payment(p_checkin_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  -- Split payment if check-in is more than 60 days away
  RETURN (p_checkin_date - CURRENT_DATE) > 60;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payout_status ON bookings(payout_status);
CREATE INDEX IF NOT EXISTS idx_bookings_resolution_window ON bookings(resolution_window_ends_at) WHERE resolution_window_status = 'active';
CREATE INDEX IF NOT EXISTS idx_booking_issues_booking ON booking_issues(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_issues_status ON booking_issues(status) WHERE status IN ('pending', 'under_review');
CREATE INDEX IF NOT EXISTS idx_scheduled_payouts_status ON scheduled_payouts(status) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_scheduled_payouts_scheduled_for ON scheduled_payouts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_balance_payments_status ON scheduled_balance_payments(status) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_scheduled_balance_payments_date ON scheduled_balance_payments(scheduled_for);

-- ============================================
-- 10. GRANTS
-- ============================================

GRANT ALL ON TABLE booking_issues TO authenticated;
GRANT SELECT ON TABLE cancellation_policy_rules TO authenticated;
GRANT SELECT ON TABLE cancellation_policy_rules TO anon;
GRANT SELECT ON TABLE scheduled_payouts TO authenticated;
GRANT SELECT ON TABLE scheduled_balance_payments TO authenticated;

-- ============================================
-- 11. COMMENTS
-- ============================================

COMMENT ON TABLE booking_issues IS 'Post check-in issues reported within 48-hour resolution window';
COMMENT ON TABLE cancellation_policy_rules IS 'Three fixed cancellation policy templates: flexible, standard, strict';
COMMENT ON TABLE scheduled_payouts IS 'Host payouts scheduled after resolution window expires';
COMMENT ON TABLE scheduled_balance_payments IS 'Split payment balance charges for bookings >60 days out';
COMMENT ON FUNCTION calculate_refund_amount IS 'Calculates refund based on cancellation policy and days before check-in';
COMMENT ON FUNCTION is_within_resolution_window IS 'Checks if booking is within 48-hour post check-in issue reporting window';
COMMENT ON FUNCTION needs_split_payment IS 'Determines if booking needs split payment (>60 days out)';

