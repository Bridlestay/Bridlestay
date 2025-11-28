-- Reviews and Ratings System
-- Property reviews (guests review properties after stays)
-- User reviews (hosts review guests after stays)

-- Property Reviews Table
CREATE TABLE IF NOT EXISTS property_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Ratings (1-5 stars)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  accuracy_rating INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  location_rating INTEGER CHECK (location_rating >= 1 AND location_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- Review content
  review_text TEXT,
  
  -- Equestrian-specific ratings
  stable_quality_rating INTEGER CHECK (stable_quality_rating >= 1 AND stable_quality_rating <= 5),
  turnout_quality_rating INTEGER CHECK (turnout_quality_rating >= 1 AND turnout_quality_rating <= 5),
  
  -- Host response
  host_response TEXT,
  host_response_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one review per booking per user
  UNIQUE(booking_id, reviewer_id)
);

-- User Reviews Table (hosts review guests)
CREATE TABLE IF NOT EXISTS user_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewed_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Ratings (1-5 stars)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  respect_rating INTEGER CHECK (respect_rating >= 1 AND respect_rating <= 5),
  
  -- Review content
  review_text TEXT,
  
  -- Would host again / would stay again
  would_recommend BOOLEAN,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one review per booking per reviewer
  UNIQUE(booking_id, reviewer_id, reviewed_user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_reviews_property_id ON property_reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_property_reviews_reviewer_id ON property_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_property_reviews_booking_id ON property_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_property_reviews_created_at ON property_reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewed_user_id ON user_reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewer_id ON user_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_booking_id ON user_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_created_at ON user_reviews(created_at DESC);

-- Enable RLS
ALTER TABLE property_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_reviews

-- Anyone can view property reviews
CREATE POLICY "Anyone can view property reviews"
ON property_reviews FOR SELECT
TO public
USING (true);

-- Guests can create reviews for bookings they made
CREATE POLICY "Guests can create property reviews"
ON property_reviews FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_id
    AND bookings.guest_id = auth.uid()
    AND bookings.status = 'confirmed'
    AND bookings.end_date < now() -- Must be after checkout
  )
);

-- Users can update their own reviews (within reasonable time)
CREATE POLICY "Users can update their own reviews"
ON property_reviews FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (
  reviewer_id = auth.uid() AND
  created_at > now() - interval '7 days' -- Can edit within 7 days
);

-- Hosts can update host_response on reviews for their properties
CREATE POLICY "Hosts can respond to reviews"
ON property_reviews FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_id
    AND properties.host_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = property_id
    AND properties.host_id = auth.uid()
  )
);

-- RLS Policies for user_reviews

-- Anyone can view user reviews (for transparency)
CREATE POLICY "Anyone can view user reviews"
ON user_reviews FOR SELECT
TO public
USING (true);

-- Hosts can create reviews for guests who stayed at their properties
CREATE POLICY "Hosts can create user reviews"
ON user_reviews FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM bookings
    JOIN properties ON properties.id = bookings.property_id
    WHERE bookings.id = booking_id
    AND properties.host_id = auth.uid()
    AND bookings.guest_id = reviewed_user_id
    AND bookings.status = 'confirmed'
    AND bookings.end_date < now() -- Must be after checkout
  )
);

-- Users can update their own reviews (within reasonable time)
CREATE POLICY "Users can update their own user reviews"
ON user_reviews FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (
  reviewer_id = auth.uid() AND
  created_at > now() - interval '7 days' -- Can edit within 7 days
);

-- Add average rating columns to properties table (denormalized for performance)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add average rating columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Function to update property average rating
CREATE OR REPLACE FUNCTION update_property_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE properties
  SET 
    average_rating = (
      SELECT AVG(overall_rating)::DECIMAL(3,2)
      FROM property_reviews
      WHERE property_id = COALESCE(NEW.property_id, OLD.property_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM property_reviews
      WHERE property_id = COALESCE(NEW.property_id, OLD.property_id)
    )
  WHERE id = COALESCE(NEW.property_id, OLD.property_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update user average rating
CREATE OR REPLACE FUNCTION update_user_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET 
    average_rating = (
      SELECT AVG(overall_rating)::DECIMAL(3,2)
      FROM user_reviews
      WHERE reviewed_user_id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM user_reviews
      WHERE reviewed_user_id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id)
    )
  WHERE id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update average ratings
CREATE TRIGGER trigger_update_property_rating
AFTER INSERT OR UPDATE OR DELETE ON property_reviews
FOR EACH ROW
EXECUTE FUNCTION update_property_average_rating();

CREATE TRIGGER trigger_update_user_rating
AFTER INSERT OR UPDATE OR DELETE ON user_reviews
FOR EACH ROW
EXECUTE FUNCTION update_user_average_rating();

-- Comments for documentation
COMMENT ON TABLE property_reviews IS 'Guest reviews of properties after completed stays';
COMMENT ON TABLE user_reviews IS 'Host reviews of guests after completed stays (mutual review system)';
COMMENT ON COLUMN property_reviews.booking_id IS 'Links review to specific booking - ensures one review per stay';
COMMENT ON COLUMN user_reviews.would_recommend IS 'Whether host would host this guest again';

