-- Seed data for padoq
-- This provides initial data for the platform

-- Note: In production, users and routes are created via the application UI
-- Routes now require GeoJSON geometry data, so they should be created through the app

-- Add table comments for documentation
COMMENT ON TABLE properties IS 'Host properties available for booking';
COMMENT ON TABLE bookings IS 'Guest booking requests and confirmed stays';
COMMENT ON TABLE routes IS 'User-created riding routes with GeoJSON geometry';
COMMENT ON TABLE route_waypoints IS 'Points of interest along routes';
COMMENT ON TABLE users IS 'User profiles linked to Supabase Auth';

-- Sample property types reference (these are defined in the property_type constraint)
-- Accommodation: bnb, cottage, farm_stay, manor, glamping
-- Camping/Outdoor: campsite, caravan_park, shepherds_hut, yurt, tipi, bell_tent, pod, treehouse
-- Equine-specific: livery_yard, equestrian_centre, riding_school
-- Other: other

