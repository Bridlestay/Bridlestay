-- Migration 075: Fix waypoint_photos user_id FK
-- The FK was pointing to auth.users instead of public.users,
-- causing PostgREST joins to fail with 500 errors.

ALTER TABLE waypoint_photos
  DROP CONSTRAINT IF EXISTS waypoint_photos_user_id_fkey;

ALTER TABLE waypoint_photos
  ADD CONSTRAINT waypoint_photos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
