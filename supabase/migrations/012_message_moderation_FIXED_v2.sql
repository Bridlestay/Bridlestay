-- ============================================
-- CLEANUP: Drop existing objects first
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all flagged messages" ON flagged_messages;
DROP POLICY IF EXISTS "Admins can update flagged messages" ON flagged_messages;
DROP POLICY IF EXISTS "Admins can insert flagged messages" ON flagged_messages;
DROP POLICY IF EXISTS "System can insert flagged messages" ON flagged_messages;

-- ============================================
-- FIX: Update RLS policies
-- ============================================

-- Admin can view all flagged messages
CREATE POLICY "Admins can view all flagged messages"
ON flagged_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Admin can update flagged messages (review them)
CREATE POLICY "Admins can update flagged messages"
ON flagged_messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- FIXED: Allow authenticated users to insert flagged messages (system creates them automatically)
CREATE POLICY "System can insert flagged messages"
ON flagged_messages FOR INSERT
TO authenticated
WITH CHECK (true); -- Any authenticated user can trigger flags (the API will create them)



