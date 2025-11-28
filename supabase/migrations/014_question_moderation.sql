-- Add moderation fields to property_questions table
ALTER TABLE property_questions
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE;

-- Create flagged questions table for moderation
CREATE TABLE IF NOT EXISTS flagged_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES property_questions(id) ON DELETE CASCADE NOT NULL,
  flag_reason TEXT NOT NULL CHECK (flag_reason IN (
    'inappropriate_language',
    'payment_attempt',
    'antisocial_behavior',
    'spam',
    'other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  matched_patterns TEXT[], -- Store what patterns were matched
  content_type TEXT NOT NULL CHECK (content_type IN ('question', 'answer')), -- Track whether it's the question or answer
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT, -- 'none', 'warning_sent', 'user_suspended', 'content_deleted'
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_flagged_questions_question_id ON flagged_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_flagged_questions_reviewed ON flagged_questions(reviewed);
CREATE INDEX IF NOT EXISTS idx_flagged_questions_severity ON flagged_questions(severity);
CREATE INDEX IF NOT EXISTS idx_flagged_questions_created_at ON flagged_questions(created_at);
CREATE INDEX IF NOT EXISTS idx_property_questions_flagged ON property_questions(flagged);

-- Enable RLS
ALTER TABLE flagged_questions ENABLE ROW LEVEL SECURITY;

-- Admin can view all flagged questions
CREATE POLICY "Admins can view all flagged questions"
ON flagged_questions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Admin can update flagged questions (review them)
CREATE POLICY "Admins can update flagged questions"
ON flagged_questions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- System can insert flagged questions (allows API to insert)
CREATE POLICY "System can insert flagged questions"
ON flagged_questions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Comments
COMMENT ON TABLE flagged_questions IS 'Questions and answers flagged by auto-moderation system';
COMMENT ON COLUMN flagged_questions.flag_reason IS 'Category of violation detected';
COMMENT ON COLUMN flagged_questions.severity IS 'How serious the violation is';
COMMENT ON COLUMN flagged_questions.matched_patterns IS 'What keywords or patterns triggered the flag';
COMMENT ON COLUMN flagged_questions.content_type IS 'Whether the question or answer was flagged';
COMMENT ON COLUMN property_questions.flagged IS 'Whether this question/answer has been flagged for review';
COMMENT ON COLUMN property_questions.blocked IS 'Whether this question/answer was blocked from being posted';



