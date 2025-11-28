-- Add property management features
-- Check-in/check-out times, min/max stay, house rules, instant book

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS checkin_time TIME DEFAULT '15:00:00',
ADD COLUMN IF NOT EXISTS checkout_time TIME DEFAULT '11:00:00',
ADD COLUMN IF NOT EXISTS min_nights INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_nights INTEGER,
ADD COLUMN IF NOT EXISTS house_rules TEXT,
ADD COLUMN IF NOT EXISTS instant_book BOOLEAN DEFAULT false;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_properties_instant_book ON properties(instant_book);
CREATE INDEX IF NOT EXISTS idx_properties_min_nights ON properties(min_nights);

-- Add check constraints
ALTER TABLE properties
ADD CONSTRAINT check_min_nights_positive CHECK (min_nights > 0),
ADD CONSTRAINT check_max_nights_valid CHECK (max_nights IS NULL OR max_nights >= min_nights);

-- Comments for documentation
COMMENT ON COLUMN properties.checkin_time IS 'Default check-in time for guests (e.g., 15:00)';
COMMENT ON COLUMN properties.checkout_time IS 'Default checkout time for guests (e.g., 11:00)';
COMMENT ON COLUMN properties.min_nights IS 'Minimum number of nights required for booking';
COMMENT ON COLUMN properties.max_nights IS 'Maximum number of nights allowed (NULL = no limit)';
COMMENT ON COLUMN properties.house_rules IS 'Property-specific rules (smoking, pets, noise, etc.)';
COMMENT ON COLUMN properties.instant_book IS 'Allow instant booking without host approval';

