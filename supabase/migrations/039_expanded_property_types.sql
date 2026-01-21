-- Expand property_type to include more listing types for campsite, caravan park, etc.
-- This supports padoq's broader positioning as a full horse app beyond just Airbnb-style stays

-- First drop the existing constraint
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Add the new constraint with expanded options
ALTER TABLE properties ADD CONSTRAINT properties_property_type_check 
  CHECK (property_type IN (
    -- Accommodation types
    'bnb',
    'cottage', 
    'farm_stay', 
    'manor', 
    'glamping',
    -- Camping/Outdoor types
    'campsite',
    'caravan_park',
    'shepherds_hut',
    'yurt',
    'tipi',
    'bell_tent',
    'pod',
    'treehouse',
    -- Equine-specific types
    'livery_yard',
    'equestrian_centre',
    'riding_school',
    -- Other
    'other'
  ));

-- Update the comment to reflect new types
COMMENT ON COLUMN properties.property_type IS 'Type of listing: bnb, cottage, farm_stay, manor, glamping, campsite, caravan_park, shepherds_hut, yurt, tipi, bell_tent, pod, treehouse, livery_yard, equestrian_centre, riding_school, other';

