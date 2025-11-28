-- Add property_type to properties table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'property_type'
  ) THEN
    ALTER TABLE properties 
    ADD COLUMN property_type TEXT 
    CHECK (property_type IN ('bnb', 'cottage', 'farm_stay', 'manor', 'glamping', 'other'));
  END IF;
END $$;

-- Set default for existing properties
UPDATE properties 
SET property_type = 'cottage' 
WHERE property_type IS NULL;

-- Add comment
COMMENT ON COLUMN properties.property_type IS 'Type of accommodation: bnb, cottage, farm_stay, manor, glamping, other';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);



