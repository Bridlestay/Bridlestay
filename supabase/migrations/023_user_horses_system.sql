-- Create user_horses table
CREATE TABLE IF NOT EXISTS user_horses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic Info
  name TEXT NOT NULL,
  photo_url TEXT,
  breed TEXT NOT NULL,
  date_of_birth DATE,
  age INTEGER,
  gender TEXT NOT NULL CHECK (gender IN ('stallion', 'mare', 'gelding')),
  color_markings TEXT,
  
  -- Physical Details
  height_hands DECIMAL(4,1), -- e.g., 16.2
  weight_kg INTEGER,
  
  -- Health & Special Needs
  dietary_requirements TEXT,
  medical_conditions TEXT,
  current_medications TEXT,
  vaccination_date DATE,
  passport_number TEXT,
  
  -- Behavior & Temperament
  temperament TEXT, -- calm, energetic, nervous, spooky, friendly
  behavior_notes TEXT,
  turnout_preferences TEXT,
  
  -- Experience & Disciplines
  experience_level TEXT, -- beginner-safe, intermediate, advanced
  disciplines TEXT[], -- Array of disciplines
  
  -- Emergency Contacts
  vet_contact TEXT,
  farrier_contact TEXT,
  
  -- Quick Facts (computed or user-set)
  quick_facts TEXT[], -- e.g., ['Family Safe', 'Competition Horse', 'Special Needs']
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create booking_horses junction table
CREATE TABLE IF NOT EXISTS booking_horses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  horse_id UUID REFERENCES user_horses(id) ON DELETE CASCADE NOT NULL,
  
  -- Booking-specific notes
  special_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure a horse isn't added to the same booking twice
  UNIQUE(booking_id, horse_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_horses_user_id ON user_horses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_horses_breed ON user_horses(breed);
CREATE INDEX IF NOT EXISTS idx_user_horses_created_at ON user_horses(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_horses_booking_id ON booking_horses(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_horses_horse_id ON booking_horses(horse_id);

-- Enable Row Level Security
ALTER TABLE user_horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_horses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_horses

-- Users can view their own horses
CREATE POLICY "Users can view their own horses"
ON user_horses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own horses
CREATE POLICY "Users can insert their own horses"
ON user_horses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own horses
CREATE POLICY "Users can update their own horses"
ON user_horses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own horses
CREATE POLICY "Users can delete their own horses"
ON user_horses FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Hosts can view horses for their bookings
CREATE POLICY "Hosts can view horses for their bookings"
ON user_horses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM booking_horses bh
    JOIN bookings b ON b.id = bh.booking_id
    JOIN properties p ON p.id = b.property_id
    WHERE bh.horse_id = user_horses.id
    AND p.host_id = auth.uid()
  )
);

-- Admins can view all horses
CREATE POLICY "Admins can view all horses"
ON user_horses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- RLS Policies for booking_horses

-- Guests can manage horses for their own bookings
CREATE POLICY "Guests can manage booking horses"
ON booking_horses FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_id
    AND bookings.guest_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_id
    AND bookings.guest_id = auth.uid()
  )
);

-- Hosts can view booking horses for their properties
CREATE POLICY "Hosts can view booking horses"
ON booking_horses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN properties p ON p.id = b.property_id
    WHERE b.id = booking_id
    AND p.host_id = auth.uid()
  )
);

-- Admins can view all booking horses
CREATE POLICY "Admins can view all booking horses"
ON booking_horses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_horses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_user_horses_updated_at
  BEFORE UPDATE ON user_horses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_horses_updated_at();

-- Comments
COMMENT ON TABLE user_horses IS 'User-registered horses with complete profiles and health information';
COMMENT ON TABLE booking_horses IS 'Junction table linking horses to bookings';
COMMENT ON COLUMN user_horses.height_hands IS 'Horse height in hands (e.g., 16.2)';
COMMENT ON COLUMN user_horses.temperament IS 'General temperament: calm, energetic, nervous, spooky, friendly';
COMMENT ON COLUMN user_horses.experience_level IS 'Rider experience required: beginner-safe, intermediate, advanced';
COMMENT ON COLUMN user_horses.disciplines IS 'Array of disciplines: dressage, jumping, eventing, trail riding, etc.';
COMMENT ON COLUMN user_horses.quick_facts IS 'Quick reference tags for important characteristics';

