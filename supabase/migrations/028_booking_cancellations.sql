-- Add cancellation tracking fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS refund_amount_pennies INTEGER,
ADD COLUMN IF NOT EXISTS review_reminder_sent TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN bookings.cancellation_reason IS 'Reason provided for cancellation (optional)';
COMMENT ON COLUMN bookings.cancelled_at IS 'Timestamp when booking was cancelled';
COMMENT ON COLUMN bookings.refund_amount_pennies IS 'Amount refunded to guest in pennies';
COMMENT ON COLUMN bookings.review_reminder_sent IS 'Timestamp when review reminder emails were sent';

