-- Add constraints to prevent double-bookings and validate capacity

-- 1. Add check constraint for guest capacity
ALTER TABLE bookings
ADD CONSTRAINT check_guest_capacity 
CHECK (guests >= 1);

-- 2. Add check constraint for horse capacity  
ALTER TABLE bookings
ADD CONSTRAINT check_horse_capacity
CHECK (horses >= 0);

-- 3. Create function to validate booking capacity against property limits
CREATE OR REPLACE FUNCTION validate_booking_capacity()
RETURNS TRIGGER AS $$
DECLARE
  prop RECORD;
BEGIN
  -- Get property details
  SELECT max_guests, max_horses
  INTO prop
  FROM properties
  WHERE id = NEW.property_id;

  -- Validate guest count
  IF NEW.guests > prop.max_guests THEN
    RAISE EXCEPTION 'Guest count (%) exceeds property maximum (%)', NEW.guests, prop.max_guests;
  END IF;

  -- Validate horse count
  IF NEW.horses > COALESCE(prop.max_horses, 0) THEN
    RAISE EXCEPTION 'Horse count (%) exceeds property maximum (%)', NEW.horses, COALESCE(prop.max_horses, 0);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to validate capacity before insert/update
DROP TRIGGER IF EXISTS trigger_validate_booking_capacity ON bookings;
CREATE TRIGGER trigger_validate_booking_capacity
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_capacity();

-- 5. Create function to check for booking overlaps
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
DECLARE
  overlap_count INTEGER;
BEGIN
  -- Only check for confirmed or requested bookings
  IF NEW.status NOT IN ('confirmed', 'requested') THEN
    RETURN NEW;
  END IF;

  -- Check for overlapping bookings (excluding current booking if updating)
  SELECT COUNT(*)
  INTO overlap_count
  FROM bookings
  WHERE property_id = NEW.property_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND status IN ('confirmed', 'requested')
    AND (
      -- New booking starts during existing booking
      (NEW.start_date >= start_date AND NEW.start_date < end_date)
      OR
      -- New booking ends during existing booking
      (NEW.end_date > start_date AND NEW.end_date <= end_date)
      OR
      -- New booking completely contains existing booking
      (NEW.start_date <= start_date AND NEW.end_date >= end_date)
    );

  IF overlap_count > 0 THEN
    RAISE EXCEPTION 'Booking dates overlap with existing booking for this property';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to prevent overlapping bookings
DROP TRIGGER IF EXISTS trigger_check_booking_overlap ON bookings;
CREATE TRIGGER trigger_check_booking_overlap
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_overlap();

-- 7. Create index for faster overlap checks
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates ON bookings(property_id, start_date, end_date, status);

-- Comments for documentation
COMMENT ON FUNCTION validate_booking_capacity IS 'Validates guest and horse counts against property limits';
COMMENT ON FUNCTION check_booking_overlap IS 'Prevents double-bookings by checking for date overlaps';
COMMENT ON CONSTRAINT check_guest_capacity ON bookings IS 'Ensures at least 1 guest per booking';
COMMENT ON CONSTRAINT check_horse_capacity ON bookings IS 'Ensures non-negative horse count';

