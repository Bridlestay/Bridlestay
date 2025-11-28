-- ============================================
-- CLEANUP: Drop existing objects first
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all flagged messages" ON flagged_messages;
DROP POLICY IF EXISTS "Admins can update flagged messages" ON flagged_messages;
DROP POLICY IF EXISTS "Admins can insert flagged messages" ON flagged_messages;

-- Drop existing function
DROP FUNCTION IF EXISTS get_unreviewed_flagged_count();

-- Drop existing table (use with caution - only if you want to start fresh)
-- DROP TABLE IF EXISTS flagged_messages CASCADE;

-- ============================================
-- CREATE TABLES AND COLUMNS
-- ============================================

-- Create flagged messages table for moderation
CREATE TABLE IF NOT EXISTS flagged_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  flag_reason TEXT NOT NULL CHECK (flag_reason IN (
    'inappropriate_language',
    'payment_attempt',
    'antisocial_behavior',
    'spam',
    'other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  matched_patterns TEXT[], -- Store what patterns were matched
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT, -- 'none', 'warning_sent', 'user_suspended', 'message_deleted'
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add moderation fields to messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_flagged_messages_message_id ON flagged_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_reviewed ON flagged_messages(reviewed);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_severity ON flagged_messages(severity);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_created_at ON flagged_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages(flagged);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE flagged_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
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

-- Admin can insert flagged messages
CREATE POLICY "Admins can insert flagged messages"
ON flagged_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================
-- CREATE FUNCTIONS
-- ============================================

-- Function to get flagged message count
CREATE OR REPLACE FUNCTION get_unreviewed_flagged_count()
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    flagged_count BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO flagged_count
    FROM flagged_messages
    WHERE reviewed = FALSE;

    RETURN flagged_count;
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE flagged_messages IS 'Messages flagged by auto-moderation system';
COMMENT ON COLUMN flagged_messages.flag_reason IS 'Category of violation detected';
COMMENT ON COLUMN flagged_messages.severity IS 'How serious the violation is';
COMMENT ON COLUMN flagged_messages.matched_patterns IS 'What keywords or patterns triggered the flag';
COMMENT ON COLUMN messages.flagged IS 'Whether this message has been flagged for review';
COMMENT ON COLUMN messages.blocked IS 'Whether this message was blocked from being sent';



