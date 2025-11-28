-- Advanced Pricing & Availability Features
-- Weekend pricing, seasonal pricing, long-stay discounts, recurring availability blocks

-- Pricing Rules Table
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  
  -- Rule type
  rule_type TEXT NOT NULL CHECK (rule_type IN ('weekend', 'seasonal', 'long_stay_discount', 'custom_date')),
  
  -- For weekend pricing
  friday_multiplier DECIMAL(3,2), -- e.g., 1.2 = 20% more expensive
  saturday_multiplier DECIMAL(3,2),
  sunday_multiplier DECIMAL(3,2),
  
  -- For seasonal pricing
  season_name TEXT, -- 'Summer', 'Winter', 'Peak', etc.
  season_start_date DATE,
  season_end_date DATE,
  season_price_pennies INTEGER,
  
  -- For long-stay discounts
  min_nights INTEGER,
  discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  
  -- For custom date pricing
  custom_start_date DATE,
  custom_end_date DATE,
  custom_price_pennies INTEGER,
  
  -- Metadata
  active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0, -- Higher priority rules override lower ones
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure logical constraints
  CONSTRAINT pricing_rule_dates_valid CHECK (
    (rule_type != 'seasonal' OR (season_start_date IS NOT NULL AND season_end_date IS NOT NULL AND season_end_date >= season_start_date)) AND
    (rule_type != 'custom_date' OR (custom_start_date IS NOT NULL AND custom_end_date IS NOT NULL AND custom_end_date >= custom_start_date))
  )
);

-- Indexes for pricing_rules
CREATE INDEX IF NOT EXISTS idx_pricing_rules_property_id ON pricing_rules(property_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_type ON pricing_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_dates ON pricing_rules(season_start_date, season_end_date);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(active);

-- Recurring Availability Blocks (e.g., "Block every Monday")
CREATE TABLE IF NOT EXISTS recurring_availability_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  
  -- Recurrence pattern
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('weekly', 'monthly', 'custom')),
  
  -- For weekly recurrence
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  
  -- For monthly recurrence
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  
  -- Date range for recurrence
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = indefinite
  
  -- Block reason
  reason TEXT DEFAULT 'unavailable',
  
  -- Metadata
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for recurring_availability_blocks
CREATE INDEX IF NOT EXISTS idx_recurring_blocks_property_id ON recurring_availability_blocks(property_id);
CREATE INDEX IF NOT EXISTS idx_recurring_blocks_active ON recurring_availability_blocks(active);
CREATE INDEX IF NOT EXISTS idx_recurring_blocks_dates ON recurring_availability_blocks(start_date, end_date);

-- Enable RLS
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_availability_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_rules

-- Anyone can view pricing rules (needed for price calculation)
CREATE POLICY "Anyone can view pricing rules"
ON pricing_rules FOR SELECT
TO public
USING (true);

-- Hosts can manage pricing rules for their properties
CREATE POLICY "Hosts can insert pricing rules"
ON pricing_rules FOR INSERT
TO authenticated
WITH CHECK (
  property_id IN (
    SELECT id FROM properties
    WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can update pricing rules"
ON pricing_rules FOR UPDATE
TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties
    WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can delete pricing rules"
ON pricing_rules FOR DELETE
TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties
    WHERE host_id = auth.uid()
  )
);

-- RLS Policies for recurring_availability_blocks

-- Anyone can view recurring blocks (needed for availability checking)
CREATE POLICY "Anyone can view recurring blocks"
ON recurring_availability_blocks FOR SELECT
TO public
USING (true);

-- Hosts can manage recurring blocks for their properties
CREATE POLICY "Hosts can insert recurring blocks"
ON recurring_availability_blocks FOR INSERT
TO authenticated
WITH CHECK (
  property_id IN (
    SELECT id FROM properties
    WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can update recurring blocks"
ON recurring_availability_blocks FOR UPDATE
TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties
    WHERE host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can delete recurring blocks"
ON recurring_availability_blocks FOR DELETE
TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties
    WHERE host_id = auth.uid()
  )
);

-- Function to generate availability blocks from recurring rules
-- This can be called periodically (e.g., daily) to create actual blocks from recurring rules
CREATE OR REPLACE FUNCTION generate_blocks_from_recurring_rules(
  p_property_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_rule RECORD;
  v_current_date DATE;
  v_blocks_created INTEGER := 0;
BEGIN
  -- Get active recurring rules for this property
  FOR v_rule IN 
    SELECT * FROM recurring_availability_blocks
    WHERE property_id = p_property_id
    AND active = TRUE
    AND start_date <= p_end_date
    AND (end_date IS NULL OR end_date >= p_start_date)
  LOOP
    v_current_date := GREATEST(v_rule.start_date, p_start_date);
    
    WHILE v_current_date <= p_end_date AND (v_rule.end_date IS NULL OR v_current_date <= v_rule.end_date) LOOP
      -- Check if this date matches the recurrence pattern
      IF (v_rule.recurrence_type = 'weekly' AND EXTRACT(DOW FROM v_current_date)::INTEGER = v_rule.day_of_week) OR
         (v_rule.recurrence_type = 'monthly' AND EXTRACT(DAY FROM v_current_date)::INTEGER = v_rule.day_of_month) THEN
        
        -- Create availability block if it doesn't exist
        INSERT INTO availability_blocks (property_id, start_date, end_date, reason)
        VALUES (p_property_id, v_current_date, v_current_date, v_rule.reason)
        ON CONFLICT DO NOTHING;
        
        v_blocks_created := v_blocks_created + 1;
      END IF;
      
      v_current_date := v_current_date + 1;
    END LOOP;
  END LOOP;
  
  RETURN v_blocks_created;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE pricing_rules IS 'Dynamic pricing rules for properties (weekend, seasonal, long-stay discounts)';
COMMENT ON TABLE recurring_availability_blocks IS 'Recurring patterns for availability blocking (e.g., "Block every Monday")';
COMMENT ON COLUMN pricing_rules.priority IS 'Higher priority rules override lower ones when multiple rules apply';
COMMENT ON COLUMN pricing_rules.friday_multiplier IS 'Price multiplier for Fridays (1.0 = no change, 1.2 = 20% increase)';
COMMENT ON FUNCTION generate_blocks_from_recurring_rules IS 'Generates actual availability blocks from recurring rules for a date range';



