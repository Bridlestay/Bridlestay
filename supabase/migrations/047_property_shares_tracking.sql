-- Create table to track property shares
CREATE TABLE IF NOT EXISTS property_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT NOT NULL, -- 'copy_link', 'facebook', 'twitter', 'whatsapp', 'email', 'native'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_hash TEXT -- Optional: hashed IP for anonymous tracking
);

-- Create indexes
CREATE INDEX idx_property_shares_property_id ON property_shares(property_id);
CREATE INDEX idx_property_shares_platform ON property_shares(platform);
CREATE INDEX idx_property_shares_created_at ON property_shares(created_at);

-- Add total_shares column to properties for quick lookup
ALTER TABLE properties ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- Create function to increment share count
CREATE OR REPLACE FUNCTION increment_property_share_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE properties 
  SET share_count = share_count + 1
  WHERE id = NEW.property_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment share count
DROP TRIGGER IF EXISTS trigger_increment_share_count ON property_shares;
CREATE TRIGGER trigger_increment_share_count
  AFTER INSERT ON property_shares
  FOR EACH ROW
  EXECUTE FUNCTION increment_property_share_count();

-- Enable RLS
ALTER TABLE property_shares ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert shares (even anonymous users can share)
CREATE POLICY "Anyone can create shares" ON property_shares
  FOR INSERT WITH CHECK (true);

-- Allow viewing shares for property owners and admins
CREATE POLICY "Property owners can view their shares" ON property_shares
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Grant permissions
GRANT INSERT ON property_shares TO anon, authenticated;
GRANT SELECT ON property_shares TO authenticated;

