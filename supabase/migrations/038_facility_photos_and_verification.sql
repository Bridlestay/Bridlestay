-- Migration: Add facility photos category and verification workflow
-- This migration adds:
-- 1. Category field to property_photos for organizing facility photos
-- 2. pending_verification and submitted_for_verification_at to properties

-- Add category to property_photos for facility photo organization
ALTER TABLE property_photos 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Add index for filtering by category
CREATE INDEX IF NOT EXISTS idx_property_photos_category 
ON property_photos(property_id, category);

-- Add verification workflow columns to properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS pending_verification BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS submitted_for_verification_at TIMESTAMPTZ;

-- Create an index for finding properties pending verification
CREATE INDEX IF NOT EXISTS idx_properties_pending_verification 
ON properties(pending_verification) 
WHERE pending_verification = TRUE;

-- Add comment explaining the facility photo categories
COMMENT ON COLUMN property_photos.category IS 'Category of facility photo: stables, paddock, arena, tack_room, wash_bay, parking. NULL for general property photos.';

COMMENT ON COLUMN properties.pending_verification IS 'True when listing has been submitted for verification but not yet approved';

COMMENT ON COLUMN properties.submitted_for_verification_at IS 'Timestamp when the listing was submitted for verification';

-- Update admin verification endpoint to also set published = true
-- This is handled in the API, but we add a trigger for safety
CREATE OR REPLACE FUNCTION auto_publish_on_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- When admin_verified changes to true, also publish the property
  IF NEW.admin_verified = TRUE AND OLD.admin_verified IS DISTINCT FROM TRUE THEN
    NEW.published := TRUE;
    NEW.pending_verification := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-publishing on verification
DROP TRIGGER IF EXISTS trg_auto_publish_on_verification ON properties;
CREATE TRIGGER trg_auto_publish_on_verification
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION auto_publish_on_verification();

