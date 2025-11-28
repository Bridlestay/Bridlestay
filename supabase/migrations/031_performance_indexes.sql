-- Performance Optimization: Add Indexes
-- These indexes speed up common queries significantly

-- Properties table indexes
CREATE INDEX IF NOT EXISTS idx_properties_county ON properties(county);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(nightly_price_pennies);
CREATE INDEX IF NOT EXISTS idx_properties_max_guests ON properties(max_guests);
CREATE INDEX IF NOT EXISTS idx_properties_max_horses ON properties(max_horses);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- Bookings table indexes
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON bookings(start_date);
CREATE INDEX IF NOT EXISTS idx_bookings_end_date ON bookings(end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- Composite index for date range queries (availability)
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates 
  ON bookings(property_id, start_date, end_date) 
  WHERE status IN ('accepted', 'requested');

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_property_reviews_property ON property_reviews(property_id);
CREATE INDEX IF NOT EXISTS idx_property_reviews_reviewer ON property_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_property_reviews_created ON property_reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewed_user ON user_reviews(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewer ON user_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_created ON user_reviews(created_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_property ON messages(property_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Routes indexes
CREATE INDEX IF NOT EXISTS idx_routes_owner ON routes(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_routes_county ON routes(county);
CREATE INDEX IF NOT EXISTS idx_routes_difficulty ON routes(difficulty);
CREATE INDEX IF NOT EXISTS idx_routes_distance ON routes(distance_km);
CREATE INDEX IF NOT EXISTS idx_routes_public ON routes(is_public);

-- Route completions and photos
CREATE INDEX IF NOT EXISTS idx_route_completions_route ON route_completions(route_id);
CREATE INDEX IF NOT EXISTS idx_route_completions_user ON route_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_route_user_photos_route ON route_user_photos(route_id);
CREATE INDEX IF NOT EXISTS idx_route_user_photos_user ON route_user_photos(user_id);

-- User horses
CREATE INDEX IF NOT EXISTS idx_user_horses_user ON user_horses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_horses_public ON user_horses(public) WHERE public = true;

-- Favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property ON favorites(property_id);

-- Availability blocks
CREATE INDEX IF NOT EXISTS idx_availability_blocks_property ON availability_blocks(property_id);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_dates 
  ON availability_blocks(property_id, start_date, end_date);

-- Admin moderation
CREATE INDEX IF NOT EXISTS idx_flagged_messages_reviewed ON flagged_messages(reviewed);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_severity ON flagged_messages(severity);
CREATE INDEX IF NOT EXISTS idx_flagged_messages_created ON flagged_messages(created_at DESC);

-- User feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);

