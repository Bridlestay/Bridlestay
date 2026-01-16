-- ============================================
-- Ensure min_nights column exists on properties table
-- Created: 2026-01-16
-- Note: min_nights may already exist from migration 026 or 004
-- ============================================

-- Add min_nights column with default of 1 (if not exists)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS min_nights INTEGER DEFAULT 1;

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_min_nights_positive'
  ) THEN
    ALTER TABLE properties ADD CONSTRAINT check_min_nights_positive CHECK (min_nights > 0);
  END IF;
END $$;

COMMENT ON COLUMN properties.min_nights IS 'Minimum number of nights required for booking';

