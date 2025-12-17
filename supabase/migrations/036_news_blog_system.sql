-- News/Blog system for Bridlestay

-- Create news_posts table
CREATE TABLE IF NOT EXISTS news_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category TEXT CHECK (category IN ('announcement', 'feature', 'update', 'community', 'tips', 'event')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to auto-generate slug from title
CREATE OR REPLACE FUNCTION generate_slug_from_title()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := trim(both '-' from NEW.slug);
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM news_posts WHERE slug = NEW.slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      NEW.slug := NEW.slug || '-' || substring(gen_random_uuid()::text, 1, 8);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug
CREATE TRIGGER generate_news_post_slug
  BEFORE INSERT OR UPDATE ON news_posts
  FOR EACH ROW
  EXECUTE FUNCTION generate_slug_from_title();

-- Function to update published_at when status changes to published
CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    NEW.published_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set published_at
CREATE TRIGGER set_news_post_published_at
  BEFORE INSERT OR UPDATE ON news_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_published_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_news_posts_slug ON news_posts(slug);
CREATE INDEX IF NOT EXISTS idx_news_posts_status ON news_posts(status);
CREATE INDEX IF NOT EXISTS idx_news_posts_published_at ON news_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_posts_category ON news_posts(category);
CREATE INDEX IF NOT EXISTS idx_news_posts_featured ON news_posts(featured);
CREATE INDEX IF NOT EXISTS idx_news_posts_author_id ON news_posts(author_id);

-- Enable RLS
ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view published posts
CREATE POLICY "Anyone can view published news posts"
  ON news_posts FOR SELECT
  USING (status = 'published');

-- Admins can do everything
CREATE POLICY "Admins can manage all news posts"
  ON news_posts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_news_post_views(post_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE news_posts
  SET views_count = views_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

