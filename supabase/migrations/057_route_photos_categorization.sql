-- ============================================
-- Route Photos Categorization
-- Created: 2026-01-18
-- ============================================

-- Add columns for photo categorization
ALTER TABLE route_photos
ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_display BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS photo_type TEXT DEFAULT 'user' CHECK (photo_type IN ('author', 'user', 'completion'));

-- Add column for routes to track cover image
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS cover_photo_id UUID REFERENCES route_photos(id) ON DELETE SET NULL;

-- Only one cover photo per route - enforced via application logic
-- (Can't easily have partial unique index across tables)

-- Update existing photos: mark owner uploads as 'author' type
UPDATE route_photos rp
SET photo_type = 'author'
WHERE EXISTS (
  SELECT 1 FROM routes r 
  WHERE r.id = rp.route_id 
  AND r.owner_user_id = rp.uploaded_by_user_id
);

-- Mark completion photos
UPDATE route_photos rp
SET photo_type = 'completion'
WHERE rp.photo_type = 'user' 
AND EXISTS (
  SELECT 1 FROM route_completions rc
  WHERE rc.route_id = rp.route_id
  AND rc.user_id = rp.uploaded_by_user_id
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_route_photos_type ON route_photos (route_id, photo_type);
CREATE INDEX IF NOT EXISTS idx_route_photos_display ON route_photos (route_id, is_display) WHERE is_display = true;
CREATE INDEX IF NOT EXISTS idx_route_photos_cover ON route_photos (route_id, is_cover) WHERE is_cover = true;

COMMENT ON COLUMN route_photos.is_cover IS 'Whether this is the main cover photo for the route';
COMMENT ON COLUMN route_photos.is_display IS 'Whether this photo should be shown in the route gallery/display';
COMMENT ON COLUMN route_photos.photo_type IS 'Type of photo: author (uploaded by route owner), user (uploaded by other users), completion (uploaded during route completion)';
COMMENT ON COLUMN routes.cover_photo_id IS 'Reference to the cover photo for this route';

