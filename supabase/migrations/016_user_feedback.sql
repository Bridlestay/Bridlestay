-- Create user feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT CHECK (category IN ('bug', 'feature', 'improvement', 'other')) DEFAULT 'other',
  status TEXT CHECK (status IN ('pending', 'reviewed', 'resolved')) DEFAULT 'pending',
  admin_response TEXT,
  responded_by UUID REFERENCES users(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON user_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON user_feedback(category);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON user_feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert feedback"
ON user_feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON user_feedback FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Admins can update feedback (respond, change status)
CREATE POLICY "Admins can update feedback"
ON user_feedback FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Comments
COMMENT ON TABLE user_feedback IS 'User feedback and suggestions submitted to admins';
COMMENT ON COLUMN user_feedback.category IS 'Type of feedback: bug, feature, improvement, or other';
COMMENT ON COLUMN user_feedback.status IS 'Current status: pending, reviewed, or resolved';

