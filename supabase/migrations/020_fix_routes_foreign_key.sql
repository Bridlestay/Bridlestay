-- Fix routes foreign key to reference public.users instead of auth.users
-- This allows Supabase PostgREST to properly join routes with users

-- Drop the old foreign key constraint
ALTER TABLE routes 
  DROP CONSTRAINT IF EXISTS routes_owner_user_id_fkey;

-- Add new foreign key constraint referencing public.users
ALTER TABLE routes
  ADD CONSTRAINT routes_owner_user_id_fkey 
  FOREIGN KEY (owner_user_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Also fix route_photos, route_waypoints, route_comments, route_reviews
ALTER TABLE route_photos 
  DROP CONSTRAINT IF EXISTS route_photos_uploaded_by_user_id_fkey;

ALTER TABLE route_photos
  ADD CONSTRAINT route_photos_uploaded_by_user_id_fkey 
  FOREIGN KEY (uploaded_by_user_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

ALTER TABLE route_comments 
  DROP CONSTRAINT IF EXISTS route_comments_user_id_fkey;

ALTER TABLE route_comments
  ADD CONSTRAINT route_comments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

ALTER TABLE route_comment_flags 
  DROP CONSTRAINT IF EXISTS route_comment_flags_flagged_by_user_id_fkey;

ALTER TABLE route_comment_flags
  ADD CONSTRAINT route_comment_flags_flagged_by_user_id_fkey 
  FOREIGN KEY (flagged_by_user_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

ALTER TABLE route_reviews 
  DROP CONSTRAINT IF EXISTS route_reviews_user_id_fkey;

ALTER TABLE route_reviews
  ADD CONSTRAINT route_reviews_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;



