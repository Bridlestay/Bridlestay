-- Storage bucket 'horse-photos' must be created manually in Supabase Dashboard
-- Go to Storage > New bucket > Name: horse-photos > Public: Yes

-- Policy: Users can upload their own horse photos
CREATE POLICY "Users can upload horse photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'horse-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view all horse photos (public bucket)
CREATE POLICY "Anyone can view horse photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'horse-photos');

-- Policy: Users can update their own horse photos
CREATE POLICY "Users can update their own horse photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'horse-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'horse-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own horse photos
CREATE POLICY "Users can delete their own horse photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'horse-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
