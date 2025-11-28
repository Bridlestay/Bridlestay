-- Add public visibility column to user_horses
ALTER TABLE user_horses
ADD COLUMN IF NOT EXISTS public BOOLEAN DEFAULT true;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_horses_public ON user_horses(public);

-- Comment
COMMENT ON COLUMN user_horses.public IS 'Whether this horse is visible on the user''s public profile. Hosts can still see all horses in booking contexts.';

