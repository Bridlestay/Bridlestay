-- Add deletion tracking to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted);

-- Add comments
COMMENT ON COLUMN messages.deleted IS 'Whether this message has been deleted by the sender';
COMMENT ON COLUMN messages.deleted_at IS 'Timestamp when the message was deleted';
COMMENT ON COLUMN messages.deleted_by IS 'User who deleted the message';

-- Update RLS policy to allow users to soft-delete their own messages
DROP POLICY IF EXISTS "Users can update their sent messages" ON messages;

CREATE POLICY "Users can update their sent messages"
ON messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);



