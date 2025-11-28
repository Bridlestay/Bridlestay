-- Add a trigger to prevent booking conflicts at the database level
-- This handles race conditions where multiple booking requests come in simultaneously

CREATE OR REPLACE FUNCTION check_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping bookings (confirmed or requested)
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE property_id = NEW.property_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status IN ('confirmed', 'requested')
    AND (
      (NEW.start_date >= start_date AND NEW.start_date < end_date) OR
      (NEW.end_date > start_date AND NEW.end_date <= end_date) OR
      (NEW.start_date <= start_date AND NEW.end_date >= end_date)
    )
  ) THEN
    RAISE EXCEPTION 'Booking conflict: Property is already booked for these dates'
      USING ERRCODE = '23505'; -- unique_violation error code
  END IF;

  -- Check for host availability blocks
  IF EXISTS (
    SELECT 1 FROM availability_blocks
    WHERE property_id = NEW.property_id
    AND (
      (NEW.start_date >= start_date AND NEW.start_date < end_date) OR
      (NEW.end_date > start_date AND NEW.end_date <= end_date) OR
      (NEW.start_date <= start_date AND NEW.end_date >= end_date)
    )
  ) THEN
    RAISE EXCEPTION 'Booking conflict: Property is blocked by host for these dates'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before INSERT or UPDATE
DROP TRIGGER IF EXISTS trigger_check_booking_conflict ON bookings;
CREATE TRIGGER trigger_check_booking_conflict
  BEFORE INSERT OR UPDATE OF start_date, end_date, property_id, status
  ON bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('confirmed', 'requested'))
  EXECUTE FUNCTION check_booking_conflict();

COMMENT ON FUNCTION check_booking_conflict IS 'Prevents double-bookings and ensures bookings respect availability blocks at the database level';
COMMENT ON TRIGGER trigger_check_booking_conflict ON bookings IS 'Database-level protection against race conditions in booking creation';

