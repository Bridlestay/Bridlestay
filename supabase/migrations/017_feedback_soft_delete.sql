-- Add soft delete columns to user_feedback table
ALTER TABLE user_feedback
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index for faster filtering of non-deleted feedback
CREATE INDEX IF NOT EXISTS idx_feedback_deleted ON user_feedback(deleted);

-- Comment
COMMENT ON COLUMN user_feedback.deleted IS 'Soft delete flag - true if feedback has been deleted by admin';
COMMENT ON COLUMN user_feedback.deleted_at IS 'Timestamp when feedback was deleted';

