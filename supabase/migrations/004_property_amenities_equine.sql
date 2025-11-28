-- Extend properties table with new fields
ALTER TABLE properties
ADD COLUMN bedrooms INT DEFAULT 0,
ADD COLUMN beds INT DEFAULT 0,
ADD COLUMN bathrooms NUMERIC DEFAULT 0,
ADD COLUMN checkin_time TEXT DEFAULT '15:00',
ADD COLUMN checkout_time TEXT DEFAULT '11:00',
ADD COLUMN published BOOLEAN DEFAULT FALSE,
ADD COLUMN per_horse_fee_pennies INT DEFAULT 0,
ADD COLUMN cleaning_fee_pennies INT DEFAULT 0,
ADD COLUMN min_nights INT DEFAULT 1,
ADD COLUMN max_nights INT DEFAULT 28,
ADD COLUMN cancellation_policy TEXT DEFAULT 'moderate' CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict'));

-- Create property_amenities table (1:1 with properties)
CREATE TABLE property_amenities (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  -- Essentials
  wifi BOOLEAN DEFAULT FALSE,
  heating BOOLEAN DEFAULT FALSE,
  air_con BOOLEAN DEFAULT FALSE,
  hot_water BOOLEAN DEFAULT FALSE,
  workspace BOOLEAN DEFAULT FALSE,
  -- Kitchen
  kitchen BOOLEAN DEFAULT FALSE,
  oven BOOLEAN DEFAULT FALSE,
  hob BOOLEAN DEFAULT FALSE,
  microwave BOOLEAN DEFAULT FALSE,
  fridge BOOLEAN DEFAULT FALSE,
  freezer BOOLEAN DEFAULT FALSE,
  dishwasher BOOLEAN DEFAULT FALSE,
  coffee_maker BOOLEAN DEFAULT FALSE,
  kettle BOOLEAN DEFAULT FALSE,
  cookware BOOLEAN DEFAULT FALSE,
  -- Laundry
  washer BOOLEAN DEFAULT FALSE,
  dryer BOOLEAN DEFAULT FALSE,
  drying_rack BOOLEAN DEFAULT FALSE,
  ironing_board BOOLEAN DEFAULT FALSE,
  -- Bathroom
  shower BOOLEAN DEFAULT FALSE,
  bathtub BOOLEAN DEFAULT FALSE,
  hairdryer BOOLEAN DEFAULT FALSE,
  toiletries BOOLEAN DEFAULT FALSE,
  -- Safety
  smoke_alarm BOOLEAN DEFAULT FALSE,
  carbon_monoxide_alarm BOOLEAN DEFAULT FALSE,
  first_aid_kit BOOLEAN DEFAULT FALSE,
  fire_extinguisher BOOLEAN DEFAULT FALSE,
  -- Access & Parking
  step_free_access BOOLEAN DEFAULT FALSE,
  private_entrance BOOLEAN DEFAULT FALSE,
  on_site_parking BOOLEAN DEFAULT FALSE,
  ev_charger BOOLEAN DEFAULT FALSE,
  -- Family/Pet
  cot BOOLEAN DEFAULT FALSE,
  high_chair BOOLEAN DEFAULT FALSE,
  pets_allowed BOOLEAN DEFAULT FALSE,
  pet_rules TEXT,
  -- Entertainment
  tv BOOLEAN DEFAULT FALSE,
  streaming BOOLEAN DEFAULT FALSE,
  outdoor_seating BOOLEAN DEFAULT FALSE,
  bbq BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create property_equine table (1:1 with properties)
CREATE TABLE property_equine (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  -- Capacity
  max_horses INT DEFAULT 0,
  stable_count INT DEFAULT 0,
  -- Stabling
  stable_dimensions_text TEXT,
  stall_type TEXT CHECK (stall_type IN ('loose_box', 'tie_stall', 'american_barn', 'other', NULL)),
  bedding_available BOOLEAN DEFAULT FALSE,
  bedding_types TEXT,
  bedding_fee_pennies INT,
  forage_available BOOLEAN DEFAULT FALSE,
  forage_types TEXT,
  forage_fee_pennies INT,
  feed_available BOOLEAN DEFAULT FALSE,
  feed_brands TEXT,
  feed_fee_pennies INT,
  -- Turnout & Paddocks
  paddock_available BOOLEAN DEFAULT FALSE,
  paddock_size_acres NUMERIC,
  paddock_fencing TEXT CHECK (paddock_fencing IN ('post_rail', 'electric', 'wire', 'mixed', NULL)),
  shelter_available BOOLEAN DEFAULT FALSE,
  water_points BOOLEAN DEFAULT FALSE,
  -- Riding
  arena_indoor BOOLEAN DEFAULT FALSE,
  arena_outdoor BOOLEAN DEFAULT FALSE,
  arena_size_m TEXT,
  arena_surface TEXT CHECK (arena_surface IN ('sand', 'silica', 'fibre', 'rubber', 'grass', 'mixed', NULL)),
  jumps_available BOOLEAN DEFAULT FALSE,
  poles_available BOOLEAN DEFAULT FALSE,
  arena_hire_fee_pennies INT,
  floodlights BOOLEAN DEFAULT FALSE,
  direct_bridleway_access BOOLEAN DEFAULT FALSE,
  distance_to_bridleway_m INT,
  trailer_parking BOOLEAN DEFAULT FALSE,
  lorry_parking BOOLEAN DEFAULT FALSE,
  -- Care & Biosecurity
  tie_up_area BOOLEAN DEFAULT FALSE,
  wash_bay BOOLEAN DEFAULT FALSE,
  hot_hose BOOLEAN DEFAULT FALSE,
  solarium BOOLEAN DEFAULT FALSE,
  tack_room BOOLEAN DEFAULT FALSE,
  locked_tack_room BOOLEAN DEFAULT FALSE,
  muck_heap_access BOOLEAN DEFAULT FALSE,
  manure_disposal_notes TEXT,
  quarantine_stable BOOLEAN DEFAULT FALSE,
  vet_on_call TEXT,
  farrier_on_call TEXT,
  safety_rules TEXT,
  route_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_properties_published ON properties(published);
CREATE INDEX idx_properties_host_published ON properties(host_id, published);
CREATE INDEX idx_property_equine_max_horses ON property_equine(max_horses);
CREATE INDEX idx_property_equine_arena ON property_equine(arena_indoor, arena_outdoor);
CREATE INDEX idx_property_equine_bridleway ON property_equine(direct_bridleway_access);

-- RLS Policies for property_amenities
ALTER TABLE property_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read amenities for published properties"
  ON property_amenities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_amenities.property_id
      AND properties.published = true
    )
  );

CREATE POLICY "Hosts can manage their own property amenities"
  ON property_amenities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_amenities.property_id
      AND properties.host_id = auth.uid()
    )
  );

-- RLS Policies for property_equine
ALTER TABLE property_equine ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read equine facilities for published properties"
  ON property_equine FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_equine.property_id
      AND properties.published = true
    )
  );

CREATE POLICY "Hosts can manage their own property equine facilities"
  ON property_equine FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_equine.property_id
      AND properties.host_id = auth.uid()
    )
  );

-- Update RLS for properties to allow hosts to see their own unpublished listings
DROP POLICY IF EXISTS "Public can read published properties" ON properties;

CREATE POLICY "Public can read published properties"
  ON properties FOR SELECT
  USING (published = true);

CREATE POLICY "Hosts can read their own properties"
  ON properties FOR SELECT
  USING (host_id = auth.uid());

CREATE POLICY "Hosts can insert their own properties"
  ON properties FOR INSERT
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update their own properties"
  ON properties FOR UPDATE
  USING (host_id = auth.uid());

CREATE POLICY "Hosts can delete their own properties"
  ON properties FOR DELETE
  USING (host_id = auth.uid());



