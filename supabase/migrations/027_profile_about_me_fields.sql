-- Add Airbnb-style "About Me" profile fields to users table

ALTER TABLE users
ADD COLUMN IF NOT EXISTS dream_destination TEXT,
ADD COLUMN IF NOT EXISTS work TEXT,
ADD COLUMN IF NOT EXISTS spend_time TEXT,
ADD COLUMN IF NOT EXISTS pets TEXT,
ADD COLUMN IF NOT EXISTS decade_born TEXT,
ADD COLUMN IF NOT EXISTS school TEXT,
ADD COLUMN IF NOT EXISTS fun_fact TEXT,
ADD COLUMN IF NOT EXISTS useless_skill TEXT,
ADD COLUMN IF NOT EXISTS favorite_song TEXT,
ADD COLUMN IF NOT EXISTS biography_title TEXT,
ADD COLUMN IF NOT EXISTS obsessed_with TEXT,
ADD COLUMN IF NOT EXISTS languages TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.dream_destination IS 'Where I''ve always wanted to go (e.g., Patagonia + Japan)';
COMMENT ON COLUMN users.work IS 'My work or occupation';
COMMENT ON COLUMN users.spend_time IS 'What I spend too much time doing';
COMMENT ON COLUMN users.pets IS 'My pets or pet preferences';
COMMENT ON COLUMN users.decade_born IS 'Decade I was born (e.g., 1990s)';
COMMENT ON COLUMN users.school IS 'Where I went to school';
COMMENT ON COLUMN users.fun_fact IS 'My fun fact';
COMMENT ON COLUMN users.useless_skill IS 'My most useless skill';
COMMENT ON COLUMN users.favorite_song IS 'My favourite song';
COMMENT ON COLUMN users.biography_title IS 'My biography title would be';
COMMENT ON COLUMN users.obsessed_with IS 'What I''m obsessed with';
COMMENT ON COLUMN users.languages IS 'Languages I speak';

