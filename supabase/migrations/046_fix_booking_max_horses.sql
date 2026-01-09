-- Fix booking validation to use property_equine.max_horses instead of properties.max_horses
-- The authoritative max_horses value is in property_equine table

CREATE OR REPLACE FUNCTION validate_booking_capacity()
RETURNS TRIGGER AS $$
DECLARE
  prop_guests INTEGER;
  equine_horses INTEGER;
  prop_min_nights INTEGER;
  booking_nights INTEGER;
BEGIN
  -- Get property max_guests and minimum_nights
  SELECT max_guests, COALESCE(minimum_nights, 1)
  INTO prop_guests, prop_min_nights
  FROM properties
  WHERE id = NEW.property_id;

  -- Get max_horses from property_equine (the authoritative source)
  SELECT COALESCE(max_horses, 0)
  INTO equine_horses
  FROM property_equine
  WHERE property_id = NEW.property_id;
  
  -- If no property_equine record exists, default to 0
  IF equine_horses IS NULL THEN
    equine_horses := 0;
  END IF;

  -- Validate guest count
  IF NEW.guests > prop_guests THEN
    RAISE EXCEPTION 'Guest count (%) exceeds property maximum (%)', NEW.guests, prop_guests;
  END IF;

  -- Validate horse count against property_equine.max_horses
  IF NEW.horses > equine_horses THEN
    RAISE EXCEPTION 'Horse count (%) exceeds property maximum (%)', NEW.horses, equine_horses;
  END IF;

  -- Validate minimum nights
  booking_nights := NEW.end_date - NEW.start_date;
  IF booking_nights < prop_min_nights THEN
    RAISE EXCEPTION 'Booking duration (% nights) is less than minimum required (% nights)', booking_nights, prop_min_nights;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the comment
COMMENT ON FUNCTION validate_booking_capacity IS 'Validates guest and horse counts against property limits, using property_equine for horse capacity';

