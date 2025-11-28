-- Add 14-day time limit for leaving reviews after checkout
-- Guests have 14 days after checkout to review property
-- Hosts have 14 days after checkout to review guest

-- Drop old policies
DROP POLICY IF EXISTS "Guests can create property reviews" ON property_reviews;
DROP POLICY IF EXISTS "Hosts can create user reviews" ON user_reviews;

-- New policy: Guests can create property reviews within 14 days after checkout
CREATE POLICY "Guests can create property reviews within 14 days"
ON property_reviews FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_id
    AND bookings.guest_id = auth.uid()
    AND bookings.status = 'confirmed'
    AND bookings.end_date < now() -- Must be after checkout
    AND bookings.end_date > now() - interval '14 days' -- Within 14 days of checkout
  )
);

-- New policy: Hosts can create user reviews within 14 days after checkout
CREATE POLICY "Hosts can create user reviews within 14 days"
ON user_reviews FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM bookings
    JOIN properties ON properties.id = bookings.property_id
    WHERE bookings.id = booking_id
    AND properties.host_id = auth.uid()
    AND bookings.guest_id = reviewed_user_id
    AND bookings.status = 'confirmed'
    AND bookings.end_date < now() -- Must be after checkout
    AND bookings.end_date > now() - interval '14 days' -- Within 14 days of checkout
  )
);

-- Add helper function to check if review period is still open
CREATE OR REPLACE FUNCTION is_review_period_open(booking_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  checkout_date TIMESTAMPTZ;
BEGIN
  SELECT end_date INTO checkout_date
  FROM bookings
  WHERE id = booking_id_param;
  
  RETURN (
    checkout_date < now() AND
    checkout_date > now() - interval '14 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION is_review_period_open IS 'Check if a booking is within the 14-day review window after checkout';

