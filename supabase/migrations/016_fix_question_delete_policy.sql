-- Fix question deletion policy
-- Drop the old policy if it exists
DROP POLICY IF EXISTS "Property owners can delete questions on their properties" ON property_questions;

-- Create a more explicit policy for deleting questions
CREATE POLICY "Hosts can delete questions on their properties"
ON property_questions
FOR DELETE
TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties
    WHERE host_id = auth.uid()
  )
);

-- Also allow users to delete their own questions (optional but good UX)
CREATE POLICY "Users can delete their own questions"
ON property_questions
FOR DELETE
TO authenticated
USING (asker_id = auth.uid());

-- Debug: Check what policies exist
COMMENT ON TABLE property_questions IS 'Questions with delete policies for hosts and askers';



