-- Enhanced routes features
-- Add condition tracking, elevation data, and improve property integration

-- Add condition tracking to routes
ALTER TABLE routes
ADD COLUMN IF NOT EXISTS condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'closed')),
ADD COLUMN IF NOT EXISTS condition_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS condition_updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS elevation_gain_m NUMERIC,
ADD COLUMN IF NOT EXISTS elevation_loss_m NUMERIC,
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INT;

-- Add index for condition
CREATE INDEX IF NOT EXISTS idx_routes_condition ON routes(condition);

-- Comments
COMMENT ON COLUMN routes.condition IS 'Current trail condition reported by community';
COMMENT ON COLUMN routes.condition_updated_at IS 'When condition was last updated';
COMMENT ON COLUMN routes.condition_updated_by IS 'User who last updated the condition';
COMMENT ON COLUMN routes.elevation_gain_m IS 'Total elevation gain in meters';
COMMENT ON COLUMN routes.elevation_loss_m IS 'Total elevation loss in meters';
COMMENT ON COLUMN routes.estimated_duration_minutes IS 'Estimated time to complete route';

