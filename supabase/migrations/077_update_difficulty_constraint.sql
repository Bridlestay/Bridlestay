-- Update difficulty constraint to match creation form values
-- Old: easy, medium, hard
-- New: unrated, easy, moderate, difficult (also keep medium, hard for backward compat)
ALTER TABLE routes DROP CONSTRAINT IF EXISTS routes_difficulty_check;
ALTER TABLE routes ADD CONSTRAINT routes_difficulty_check
  CHECK (difficulty IN ('unrated', 'easy', 'moderate', 'medium', 'difficult', 'hard'));
