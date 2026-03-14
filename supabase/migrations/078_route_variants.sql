-- Route variants: links routes that share similar geometry
-- Parent = first route created, variant = newer similar route

-- Variants relationship table
CREATE TABLE IF NOT EXISTS route_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_a_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  route_b_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual', 'fork')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (route_a_id, route_b_id),
  CHECK (route_a_id != route_b_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_route_variants_a ON route_variants(route_a_id);
CREATE INDEX IF NOT EXISTS idx_route_variants_b ON route_variants(route_b_id);

-- Add show_on_explore column to routes
-- Default true for existing routes, variants will be set to false
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'routes' AND column_name = 'show_on_explore'
  ) THEN
    ALTER TABLE routes ADD COLUMN show_on_explore BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add variant_of_id for direct parent tracking (set when forking or auto-detected)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'routes' AND column_name = 'variant_of_id'
  ) THEN
    ALTER TABLE routes ADD COLUMN variant_of_id UUID REFERENCES routes(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_routes_show_on_explore ON routes(show_on_explore);
CREATE INDEX IF NOT EXISTS idx_routes_variant_of ON routes(variant_of_id);

-- RLS policies for route_variants
ALTER TABLE route_variants ENABLE ROW LEVEL SECURITY;

-- Anyone can read variant relationships for routes they can see
CREATE POLICY "route_variants_select"
  ON route_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = route_variants.route_a_id
        AND (routes.is_public = true OR routes.owner_user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = route_variants.route_b_id
        AND (routes.is_public = true OR routes.owner_user_id = auth.uid())
    )
  );

-- Route owners and admins can create variant links
CREATE POLICY "route_variants_insert"
  ON route_variants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = route_variants.route_a_id
        AND routes.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = route_variants.route_b_id
        AND routes.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Route owners and admins can delete variant links
CREATE POLICY "route_variants_delete"
  ON route_variants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = route_variants.route_a_id
        AND routes.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = route_variants.route_b_id
        AND routes.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
