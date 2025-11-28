-- Add guests and horses columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS guests INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS horses INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN bookings.guests IS 'Number of guests for this booking';
COMMENT ON COLUMN bookings.horses IS 'Number of horses for this booking';



