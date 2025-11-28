-- Add welcome email tracking to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS welcome_email_sent TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN users.welcome_email_sent IS 'Timestamp when welcome email was sent to user';

