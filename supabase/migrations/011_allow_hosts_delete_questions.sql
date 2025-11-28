-- Allow property owners to delete questions on their properties
CREATE POLICY "Property owners can delete questions on their properties"
ON property_questions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_questions.property_id
    AND properties.host_id = auth.uid()
  )
);



