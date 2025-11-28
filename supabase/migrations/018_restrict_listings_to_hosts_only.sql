-- Drop the old policy that allows both hosts and admins
DROP POLICY IF EXISTS "Hosts can insert own properties" ON properties;

-- Create new policy that only allows hosts to insert properties
CREATE POLICY "Hosts can insert own properties" ON properties
  FOR INSERT WITH CHECK (
    auth.uid() = host_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'host')
  );

-- Update the policy name in comments for clarity
COMMENT ON POLICY "Hosts can insert own properties" ON properties IS 'Only users with host role can create properties';

