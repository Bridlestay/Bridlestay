-- Run these queries in Supabase SQL Editor to debug

-- 1. Check what policies exist on flagged_messages
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'flagged_messages';

-- 2. Try to manually insert a test flag (as your admin user)
INSERT INTO flagged_messages (
  message_id,
  flag_reason,
  severity,
  matched_patterns
) 
SELECT 
  id,
  'inappropriate_language',
  'medium',
  ARRAY['fuck']
FROM messages 
WHERE flagged = true 
LIMIT 1
RETURNING *;

-- 3. Check the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'flagged_messages'
ORDER BY ordinal_position;

