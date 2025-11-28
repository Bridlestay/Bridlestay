-- Seed data for BridleStay
-- This creates demo properties in key UK equestrian regions

-- Note: In production, users would be created via Supabase Auth
-- This is just for demonstration

-- Insert demo routes
INSERT INTO routes (id, title, county, distance_km, terrain, rating) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Cotswolds Valley Trail', 'Gloucestershire', 12.5, 'Mixed: fields, woodland trails', 4.8),
  ('550e8400-e29b-41d4-a716-446655440002', 'New Forest Circular', 'Hampshire', 18.0, 'Forest trails, open heathland', 4.9),
  ('550e8400-e29b-41d4-a716-446655440003', 'Exmoor Coastal Path', 'Devon', 15.5, 'Coastal cliffs, moorland', 4.7);

-- Insert route pins
INSERT INTO route_pins (route_id, pin_type, lat, lng, note) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'route', 51.8330, -1.8580, 'Trail start at Bourton-on-the-Water'),
  ('550e8400-e29b-41d4-a716-446655440001', 'viewpoint', 51.8450, -1.8700, 'Panoramic Cotswold views'),
  ('550e8400-e29b-41d4-a716-446655440001', 'pub', 51.8380, -1.8620, 'The Horse & Groom - horse-friendly'),
  ('550e8400-e29b-41d4-a716-446655440002', 'route', 50.8620, -1.5850, 'Lyndhurst starting point'),
  ('550e8400-e29b-41d4-a716-446655440002', 'viewpoint', 50.8750, -1.6000, 'Ancient oak viewpoint'),
  ('550e8400-e29b-41d4-a716-446655440003', 'route', 51.2150, -3.9980, 'Exmoor coastal trail head'),
  ('550e8400-e29b-41d4-a716-446655440003', 'viewpoint', 51.2250, -4.0100, 'Stunning sea views');

-- Sample demo data structure for properties
-- In practice, hosts would create these through the UI

COMMENT ON TABLE routes IS 'Contains curated riding routes across UK equestrian regions';
COMMENT ON TABLE route_pins IS 'Points of interest along routes';
COMMENT ON TABLE properties IS 'Host properties available for booking';
COMMENT ON TABLE bookings IS 'Guest booking requests and confirmed stays';



