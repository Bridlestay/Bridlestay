-- Add message type and priority for system messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'system', 'admin_action')),
ADD COLUMN IF NOT EXISTS system_priority BOOLEAN DEFAULT FALSE;

-- Add admin action tracking to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS softbanned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES users(id);

-- Add removal tracking to properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS removed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS removal_reason TEXT,
ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES users(id);

-- Add soft delete to moderation records
ALTER TABLE flagged_messages
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE flagged_questions
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create admin actions log table
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  target_property_id UUID REFERENCES properties(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'ban_user',
    'softban_user',
    'unban_user',
    'remove_property',
    'restore_property',
    'verify_user',
    'verify_property',
    'delete_moderation'
  )),
  reason TEXT NOT NULL,
  metadata JSONB, -- Store additional action-specific data
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_system_priority ON messages(system_priority);
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(banned);
CREATE INDEX IF NOT EXISTS idx_users_softbanned ON users(softbanned);
CREATE INDEX IF NOT EXISTS idx_properties_removed ON properties(removed);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user_id ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- Enable RLS on admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Admin can view all actions
CREATE POLICY "Admins can view all actions"
ON admin_actions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Admin can insert actions
CREATE POLICY "Admins can insert actions"
ON admin_actions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Users can view actions taken against them
CREATE POLICY "Users can view actions against them"
ON admin_actions FOR SELECT
TO authenticated
USING (target_user_id = auth.uid());

-- Update RLS for messages to allow system messages
DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id OR 
  -- Allow system to send messages
  message_type IN ('system', 'admin_action')
);

-- Comments
COMMENT ON COLUMN messages.message_type IS 'Type of message: user, system, or admin_action';
COMMENT ON COLUMN messages.system_priority IS 'Whether this message should appear at the top of inbox';
COMMENT ON COLUMN users.banned IS 'Whether user is permanently banned';
COMMENT ON COLUMN users.softbanned IS 'Whether user is temporarily restricted';
COMMENT ON COLUMN users.ban_reason IS 'Reason for ban/softban';
COMMENT ON COLUMN properties.removed IS 'Whether property has been removed by admin';
COMMENT ON COLUMN properties.removal_reason IS 'Reason for property removal';
COMMENT ON TABLE admin_actions IS 'Log of all admin actions taken on the platform';



