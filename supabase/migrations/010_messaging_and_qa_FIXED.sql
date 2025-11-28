-- ============================================
-- CLEANUP: Drop existing objects first
-- ============================================

-- Drop existing triggers FIRST (before functions they depend on)
DROP TRIGGER IF EXISTS trigger_update_response_time ON messages;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;
DROP POLICY IF EXISTS "Anyone can view property questions" ON property_questions;
DROP POLICY IF EXISTS "Authenticated users can ask questions" ON property_questions;
DROP POLICY IF EXISTS "Property owners can answer questions" ON property_questions;

-- Drop existing tables
DROP TABLE IF EXISTS property_questions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

-- Drop existing functions (after triggers and tables)
DROP FUNCTION IF EXISTS update_user_response_time() CASCADE;
DROP FUNCTION IF EXISTS get_unread_message_count(UUID) CASCADE;

-- ============================================
-- CREATE TABLES
-- ============================================

-- Messages table for in-app communication
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  subject TEXT,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Property questions (public Q&A)
CREATE TABLE property_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  asker_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add response time tracking to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avg_response_time_hours NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_messages_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_messages_received INTEGER DEFAULT 0;

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_property ON messages(property_id);
CREATE INDEX idx_messages_read ON messages(read);
CREATE INDEX idx_messages_created_at ON messages(created_at);

CREATE INDEX idx_property_questions_property ON property_questions(property_id);
CREATE INDEX idx_property_questions_asker ON property_questions(asker_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_questions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR MESSAGES
-- ============================================

-- Users can read messages they sent or received
CREATE POLICY "Users can view their own messages"
ON messages FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send messages
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can update their received messages"
ON messages FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id);

-- ============================================
-- RLS POLICIES FOR PROPERTY QUESTIONS
-- ============================================

-- Anyone can read questions and answers
CREATE POLICY "Anyone can view property questions"
ON property_questions FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can ask questions
CREATE POLICY "Authenticated users can ask questions"
ON property_questions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = asker_id);

-- Property owners can answer questions
CREATE POLICY "Property owners can answer questions"
ON property_questions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_questions.property_id
    AND properties.host_id = auth.uid()
  )
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate and update average response time
CREATE OR REPLACE FUNCTION update_user_response_time()
RETURNS TRIGGER AS $$
DECLARE
  response_time_hours NUMERIC;
  previous_message_time TIMESTAMPTZ;
BEGIN
  -- Only calculate if this is a reply to a previous message
  IF NEW.sender_id != OLD.sender_id THEN
    -- Find the most recent message from the other person
    SELECT created_at INTO previous_message_time
    FROM messages
    WHERE (sender_id = NEW.recipient_id AND recipient_id = NEW.sender_id)
       OR (sender_id = NEW.sender_id AND recipient_id = NEW.recipient_id)
    AND created_at < NEW.created_at
    ORDER BY created_at DESC
    LIMIT 1;

    IF previous_message_time IS NOT NULL THEN
      -- Calculate response time in hours
      response_time_hours := EXTRACT(EPOCH FROM (NEW.created_at - previous_message_time)) / 3600;
      
      -- Update sender's average response time
      UPDATE users
      SET avg_response_time_hours = COALESCE(
        (avg_response_time_hours * total_messages_sent + response_time_hours) / (total_messages_sent + 1),
        response_time_hours
      ),
      total_messages_sent = total_messages_sent + 1
      WHERE id = NEW.sender_id;
    END IF;
  END IF;

  -- Update message counts
  UPDATE users SET total_messages_sent = total_messages_sent + 1 WHERE id = NEW.sender_id;
  UPDATE users SET total_messages_received = total_messages_received + 1 WHERE id = NEW.recipient_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update response times
CREATE TRIGGER trigger_update_response_time
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_user_response_time();

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    unread_count BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM messages
    WHERE recipient_id = user_id AND read = FALSE;

    RETURN unread_count;
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE messages IS 'In-app messaging between users';
COMMENT ON TABLE property_questions IS 'Public Q&A on property pages';
COMMENT ON COLUMN users.avg_response_time_hours IS 'Average time in hours to respond to messages';
COMMENT ON COLUMN messages.read IS 'Whether the recipient has read this message';
COMMENT ON COLUMN property_questions.answer IS 'Host answer to the question';

