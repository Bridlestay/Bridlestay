-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'host', 'admin')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Host profiles
CREATE TABLE host_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_connect_id TEXT UNIQUE,
  payout_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  county TEXT NOT NULL,
  postcode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'UK',
  nightly_price_pennies INTEGER NOT NULL CHECK (nightly_price_pennies > 0),
  max_guests INTEGER NOT NULL CHECK (max_guests > 0),
  max_horses INTEGER NOT NULL CHECK (max_horses > 0),
  verified_facilities BOOLEAN DEFAULT FALSE,
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property facilities
CREATE TABLE property_facilities (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  has_stables BOOLEAN DEFAULT FALSE,
  stable_count INTEGER,
  has_paddock BOOLEAN DEFAULT FALSE,
  paddock_size_acres NUMERIC(10, 2),
  has_arena BOOLEAN DEFAULT FALSE,
  trailer_parking BOOLEAN DEFAULT FALSE,
  water_access BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- Property photos
CREATE TABLE property_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability blocks
CREATE TABLE availability_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('booked', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  guest_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  nights INTEGER NOT NULL CHECK (nights > 0),
  base_price_pennies INTEGER NOT NULL CHECK (base_price_pennies > 0),
  guest_fee_pennies INTEGER NOT NULL CHECK (guest_fee_pennies >= 0),
  guest_fee_vat_pennies INTEGER NOT NULL CHECK (guest_fee_vat_pennies >= 0),
  host_fee_pennies INTEGER NOT NULL CHECK (host_fee_pennies >= 0),
  host_fee_vat_pennies INTEGER NOT NULL CHECK (host_fee_vat_pennies >= 0),
  total_charge_pennies INTEGER NOT NULL CHECK (total_charge_pennies > 0),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'declined', 'cancelled', 'completed')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date > start_date)
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Host replies
CREATE TABLE host_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id)
);

-- Routes
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  county TEXT NOT NULL,
  distance_km NUMERIC(10, 2) NOT NULL,
  terrain TEXT NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route pins
CREATE TABLE route_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  pin_type TEXT NOT NULL CHECK (pin_type IN ('route', 'viewpoint', 'pub')),
  lat NUMERIC(10, 7) NOT NULL,
  lng NUMERIC(10, 7) NOT NULL,
  note TEXT
);

-- Indexes
CREATE INDEX idx_properties_host ON properties(host_id);
CREATE INDEX idx_properties_county ON properties(county);
CREATE INDEX idx_property_photos_property ON property_photos(property_id, sort_order);
CREATE INDEX idx_availability_blocks_property ON availability_blocks(property_id);
CREATE INDEX idx_availability_blocks_dates ON availability_blocks(start_date, end_date);
CREATE INDEX idx_bookings_property ON bookings(property_id);
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_reviews_property ON reviews(property_id);
CREATE INDEX idx_routes_county ON routes(county);
CREATE INDEX idx_route_pins_route ON route_pins(route_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



