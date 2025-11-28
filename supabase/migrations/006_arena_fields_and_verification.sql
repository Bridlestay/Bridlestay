-- Update property_equine table with separate arena fields
ALTER TABLE property_equine
  DROP COLUMN IF EXISTS arena_size_m,
  DROP COLUMN IF EXISTS arena_surface,
    ADD COLUMN IF NOT EXISTS arena_indoor_width NUMERIC,
  ADD COLUMN IF NOT EXISTS arena_indoor_unit TEXT CHECK (arena_indoor_unit IN ('ft', 'm')),
  ADD COLUMN IF NOT EXISTS arena_indoor_surface TEXT CHECK (arena_indoor_surface IN ('sand', 'silica', 'fibre', 'rubber', 'grass', 'mixed')),
  ADD COLUMN IF NOT EXISTS arena_outdoor_length NUMERIC,
  ADD COLUMN IF NOT EXISTS arena_outdoor_width NUMERIC,
  ADD COLUMN IF NOT EXISTS arena_outdoor_unit TEXT CHECK (arena_outdoor_unit IN ('ft', 'm')),
  ADD COLUMN IF NOT EXISTS arena_outdoor_surface TEXT CHECK (arena_outdoor_surface IN ('sand', 'silica', 'fibre', 'rubber', 'grass', 'mixed'));

-- Add verification fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id);

-- Add verified field to properties table (admin can verify listings)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS admin_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id);

-- Add comments
COMMENT ON COLUMN users.email_verified IS 'Whether user has verified their email address';
COMMENT ON COLUMN users.admin_verified IS 'Whether an admin has verified this user account';
COMMENT ON COLUMN properties.admin_verified IS 'Whether an admin has verified this property listing';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_admin_verified ON users(admin_verified);
CREATE INDEX IF NOT EXISTS idx_properties_admin_verified ON properties(admin_verified);

