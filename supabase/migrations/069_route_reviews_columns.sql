-- Migration 069: Ensure route_reviews has the columns the API writes to
-- The original migration (019) defined 'body', but the review API writes 'review_text' and 'difficulty_rating'.
-- These columns may already exist from ad-hoc SQL. This migration ensures they exist safely.

ALTER TABLE route_reviews ADD COLUMN IF NOT EXISTS review_text TEXT;
ALTER TABLE route_reviews ADD COLUMN IF NOT EXISTS difficulty_rating TEXT;
ALTER TABLE route_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Copy any existing data from 'body' to 'review_text' where review_text is empty
UPDATE route_reviews SET review_text = body WHERE review_text IS NULL AND body IS NOT NULL;
