-- Add extended profile fields to users table
ALTER TABLE users
ADD COLUMN avatar_url TEXT,
ADD COLUMN bio TEXT,
ADD COLUMN occupation TEXT,
ADD COLUMN school TEXT,
ADD COLUMN favourite_song TEXT,
ADD COLUMN fun_fact TEXT,
ADD COLUMN dream_destination TEXT,
ADD COLUMN verified BOOLEAN DEFAULT FALSE;

-- Add index on verified field
CREATE INDEX idx_users_verified ON users(verified);

-- Add comment
COMMENT ON COLUMN users.avatar_url IS 'URL to profile picture in Supabase Storage';
COMMENT ON COLUMN users.verified IS 'Whether the user has completed identity verification';



