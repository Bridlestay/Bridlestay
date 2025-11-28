-- Create favorites table (with IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'favorites_user_id_property_id_key'
  ) THEN
    ALTER TABLE favorites ADD CONSTRAINT favorites_user_id_property_id_key UNIQUE(user_id, property_id);
  END IF;
END $$;

-- Create indexes (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON favorites(property_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

-- Add comment
COMMENT ON TABLE favorites IS 'User favorites/wishlist for properties';

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON favorites;
DROP POLICY IF EXISTS "Users can remove their own favorites" ON favorites;

-- Create RLS policies
CREATE POLICY "Users can view their own favorites"
  ON favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON favorites
  FOR DELETE
  USING (auth.uid() = user_id);



