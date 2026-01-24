-- Migration 061: Route Completion Ratings
-- Updates avg_rating on routes based on completion ratings

-- Create trigger to update route stats when a completion is added/updated
CREATE OR REPLACE FUNCTION update_route_completion_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update avg_rating and review_count from completion ratings
  UPDATE routes
  SET 
    avg_rating = COALESCE((
      SELECT AVG(rating)::NUMERIC(3,2) 
      FROM route_completions 
      WHERE route_id = COALESCE(NEW.route_id, OLD.route_id)
        AND rating IS NOT NULL
    ), 0),
    review_count = COALESCE((
      SELECT COUNT(*) 
      FROM route_completions 
      WHERE route_id = COALESCE(NEW.route_id, OLD.route_id)
        AND rating IS NOT NULL
    ), 0)
  WHERE id = COALESCE(NEW.route_id, OLD.route_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS update_route_completion_rating_trigger ON route_completions;

-- Create trigger for INSERT, UPDATE, DELETE on route_completions
CREATE TRIGGER update_route_completion_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON route_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_route_completion_rating();

-- Also update existing routes with completion ratings
UPDATE routes r
SET 
  avg_rating = COALESCE(completion_stats.avg, 0),
  review_count = COALESCE(completion_stats.cnt, 0)
FROM (
  SELECT 
    route_id,
    AVG(rating)::NUMERIC(3,2) as avg,
    COUNT(*) as cnt
  FROM route_completions
  WHERE rating IS NOT NULL
  GROUP BY route_id
) completion_stats
WHERE r.id = completion_stats.route_id;

-- Storage bucket policy for route-photos (ensure authenticated users can upload)
-- First check if policy exists before creating
DO $$
BEGIN
  -- Allow authenticated users to upload
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow authenticated uploads' 
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow authenticated uploads" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'route-photos' AND auth.uid() IS NOT NULL
      );
  END IF;

  -- Allow public read access
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow public read route-photos' 
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow public read route-photos" ON storage.objects
      FOR SELECT USING (bucket_id = 'route-photos');
  END IF;

  -- Allow users to update/delete their own photos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow owner manage route-photos' 
    AND tablename = 'objects'
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Allow owner manage route-photos" ON storage.objects
      FOR ALL USING (
        bucket_id = 'route-photos' 
        AND auth.uid()::text = (storage.foldername(name))[2]
      );
  END IF;
END $$;

COMMENT ON FUNCTION update_route_completion_rating IS 'Updates route avg_rating and review_count based on completion ratings';

