-- Route Completions Table
-- Track which users have completed which routes
CREATE TABLE IF NOT EXISTS route_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  UNIQUE(route_id, user_id)
);

-- User-Uploaded Route Photos Table
CREATE TABLE IF NOT EXISTS route_user_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  order_index INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_route_completions_user ON route_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_route_completions_route ON route_completions(route_id);
CREATE INDEX IF NOT EXISTS idx_route_user_photos_route ON route_user_photos(route_id);
CREATE INDEX IF NOT EXISTS idx_route_user_photos_user ON route_user_photos(user_id);

-- RLS Policies for route_completions
ALTER TABLE route_completions ENABLE ROW LEVEL SECURITY;

-- Users can view all completions
CREATE POLICY "Anyone can view route completions"
  ON route_completions FOR SELECT
  USING (true);

-- Users can insert their own completions
CREATE POLICY "Users can mark routes as complete"
  ON route_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own completions
CREATE POLICY "Users can update their own completions"
  ON route_completions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own completions
CREATE POLICY "Users can delete their own completions"
  ON route_completions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for route_user_photos
ALTER TABLE route_user_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view photos
CREATE POLICY "Anyone can view route photos"
  ON route_user_photos FOR SELECT
  USING (true);

-- Users can upload photos to routes they've completed
CREATE POLICY "Users can upload photos to completed routes"
  ON route_user_photos FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM route_completions 
      WHERE route_id = route_user_photos.route_id 
      AND user_id = auth.uid()
    )
  );

-- Users can update their own photos
CREATE POLICY "Users can update their own photos"
  ON route_user_photos FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own photos
CREATE POLICY "Users can delete their own photos"
  ON route_user_photos FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for route photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('route-photos', 'route-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view route photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'route-photos');

CREATE POLICY "Authenticated users can upload route photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'route-photos' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own route photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'route-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own route photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'route-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

