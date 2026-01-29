-- Migration 065: Profile Improvements
-- Date: 2026-01-29
-- 
-- Changes:
-- 1. Add name change tracking (limit 3 per month)
-- 2. Add featured badge display
-- 3. Add image upload guidance columns (for reference)

-- ============================================
-- 1. NAME CHANGE TRACKING
-- ============================================

-- Add columns for tracking name changes
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name_change_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS name_last_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN users.name_change_count IS 'Number of name changes in current month';
COMMENT ON COLUMN users.name_last_changed_at IS 'Timestamp of last name change';

-- Function to check if name change is allowed
CREATE OR REPLACE FUNCTION can_change_name(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_last_changed TIMESTAMPTZ;
BEGIN
  SELECT name_change_count, name_last_changed_at 
  INTO v_count, v_last_changed 
  FROM users WHERE id = user_id;
  
  -- If last changed more than a month ago, reset count
  IF v_last_changed IS NULL OR v_last_changed < NOW() - INTERVAL '1 month' THEN
    RETURN TRUE;
  END IF;
  
  -- Allow if under 3 changes this month
  RETURN COALESCE(v_count, 0) < 3;
END;
$$ LANGUAGE plpgsql;

-- Function to record name change
CREATE OR REPLACE FUNCTION record_name_change(user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_last_changed TIMESTAMPTZ;
BEGIN
  SELECT name_last_changed_at INTO v_last_changed 
  FROM users WHERE id = user_id;
  
  -- Reset count if more than a month has passed
  IF v_last_changed IS NULL OR v_last_changed < NOW() - INTERVAL '1 month' THEN
    UPDATE users SET 
      name_change_count = 1,
      name_last_changed_at = NOW()
    WHERE id = user_id;
  ELSE
    UPDATE users SET 
      name_change_count = COALESCE(name_change_count, 0) + 1,
      name_last_changed_at = NOW()
    WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. FEATURED BADGE DISPLAY
-- ============================================

-- Add featured badge column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS featured_badge_id UUID REFERENCES badges(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.featured_badge_id IS 'Badge to display prominently next to profile picture';

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_users_featured_badge ON users(featured_badge_id) WHERE featured_badge_id IS NOT NULL;

-- ============================================
-- 3. ENSURE PROFILE FIELDS ARE CONSISTENT
-- ============================================

-- Make sure both old and new field names exist (for backwards compatibility)
-- The app will use the newer field names (work, favorite_song)

-- If data exists in old fields but not new, copy it
UPDATE users 
SET work = occupation 
WHERE work IS NULL AND occupation IS NOT NULL;

UPDATE users 
SET favorite_song = favourite_song 
WHERE favorite_song IS NULL AND favourite_song IS NOT NULL;


