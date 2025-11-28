-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_pins ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Host profiles policies
CREATE POLICY "Hosts can view own profile" ON host_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Hosts can insert own profile" ON host_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hosts can update own profile" ON host_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access to host profiles" ON host_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Properties policies
CREATE POLICY "Anyone can view properties" ON properties
  FOR SELECT USING (true);

CREATE POLICY "Hosts can insert own properties" ON properties
  FOR INSERT WITH CHECK (
    auth.uid() = host_id AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('host', 'admin'))
  );

CREATE POLICY "Hosts can update own properties" ON properties
  FOR UPDATE USING (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Hosts can delete own properties" ON properties
  FOR DELETE USING (
    auth.uid() = host_id OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Property facilities policies
CREATE POLICY "Anyone can view facilities" ON property_facilities
  FOR SELECT USING (true);

CREATE POLICY "Hosts can manage own facilities" ON property_facilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_facilities.property_id
      AND properties.host_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Property photos policies
CREATE POLICY "Anyone can view photos" ON property_photos
  FOR SELECT USING (true);

CREATE POLICY "Hosts can manage own photos" ON property_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_photos.property_id
      AND properties.host_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Availability blocks policies
CREATE POLICY "Anyone can view availability blocks" ON availability_blocks
  FOR SELECT USING (true);

CREATE POLICY "Hosts can manage own blocks" ON availability_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = availability_blocks.property_id
      AND properties.host_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Bookings policies
CREATE POLICY "Guests can view own bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = guest_id OR
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = bookings.property_id
      AND properties.host_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Guests can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = guest_id);

CREATE POLICY "Hosts and guests can update relevant bookings" ON bookings
  FOR UPDATE USING (
    auth.uid() = guest_id OR
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = bookings.property_id
      AND properties.host_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Guests can create reviews for their bookings" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = guest_id AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
      AND bookings.guest_id = auth.uid()
      AND bookings.status = 'completed'
    )
  );

-- Host replies policies
CREATE POLICY "Anyone can view host replies" ON host_replies
  FOR SELECT USING (true);

CREATE POLICY "Hosts can reply to reviews of their properties" ON host_replies
  FOR INSERT WITH CHECK (
    auth.uid() = host_id AND
    EXISTS (
      SELECT 1 FROM reviews
      JOIN properties ON reviews.property_id = properties.id
      WHERE reviews.id = host_replies.review_id
      AND properties.host_id = auth.uid()
    )
  );

-- Routes policies (public read)
CREATE POLICY "Anyone can view routes" ON routes
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage routes" ON routes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Route pins policies (public read)
CREATE POLICY "Anyone can view route pins" ON route_pins
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage route pins" ON route_pins
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );



