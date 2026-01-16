-- ============================================
-- Fix: Add admin RLS policies for damage claims and content reports
-- Created: 2026-01-16
-- ============================================

-- ============================================
-- 1. DAMAGE CLAIMS - Add admin policy
-- ============================================

-- Admins should be able to view and manage all damage claims
CREATE POLICY "Admins can manage all damage claims" ON property_damage_claims
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON POLICY "Admins can manage all damage claims" ON property_damage_claims 
  IS 'Allows admin users to view, create, update, and delete any damage claim';

-- ============================================
-- 2. CONTENT REPORTS - Add admin policy
-- ============================================

-- Admins should be able to view and manage all content reports
CREATE POLICY "Admins can view and manage all reports" ON content_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON POLICY "Admins can view and manage all reports" ON content_reports 
  IS 'Allows admin users to view and manage all content reports';

-- ============================================
-- 3. FLAGGED CONTENT - Add admin policy
-- ============================================

-- Admins should be able to view and manage flagged content
CREATE POLICY "Admins can manage flagged content" ON flagged_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON POLICY "Admins can manage flagged content" ON flagged_content 
  IS 'Allows admin users to view and manage all flagged content';

