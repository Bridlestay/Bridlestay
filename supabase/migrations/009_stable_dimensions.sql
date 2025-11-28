-- Update property_equine table to replace stable_dimensions_text with structured fields
DO $$ 
BEGIN
  -- Drop old column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_equine' AND column_name = 'stable_dimensions_text'
  ) THEN
    ALTER TABLE property_equine DROP COLUMN stable_dimensions_text;
  END IF;

  -- Add new structured stable dimension columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_equine' AND column_name = 'stable_length'
  ) THEN
    ALTER TABLE property_equine ADD COLUMN stable_length NUMERIC;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_equine' AND column_name = 'stable_width'
  ) THEN
    ALTER TABLE property_equine ADD COLUMN stable_width NUMERIC;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_equine' AND column_name = 'stable_unit'
  ) THEN
    ALTER TABLE property_equine 
    ADD COLUMN stable_unit TEXT 
    CHECK (stable_unit IN ('ft', 'm'));
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN property_equine.stable_length IS 'Length of individual stables';
COMMENT ON COLUMN property_equine.stable_width IS 'Width of individual stables';
COMMENT ON COLUMN property_equine.stable_unit IS 'Unit of measurement for stable dimensions (ft or m)';



