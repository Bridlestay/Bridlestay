-- Comprehensive Moderation System
-- 4-layer approach: Prevent, Auto-filter, Community flagging, Human review

-- ============================================
-- 1. USER TRUST SCORES
-- ============================================

-- Add trust-related fields to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'standard' CHECK (trust_level IN ('new', 'standard', 'trusted', 'verified', 'moderator')),
ADD COLUMN IF NOT EXISTS social_login_provider TEXT,
ADD COLUMN IF NOT EXISTS has_social_login BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_bookings_made INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bookings_hosted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_given INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accurate_reports INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS false_reports INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS warnings_received INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS restriction_reason TEXT,
ADD COLUMN IF NOT EXISTS restriction_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS messaging_banner_dismissed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS messaging_banner_dismissed_at TIMESTAMPTZ;

-- Helper function to get account age in days (can't use generated column with now())
CREATE OR REPLACE FUNCTION get_account_age_days(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_created_at TIMESTAMPTZ;
BEGIN
  SELECT created_at INTO v_created_at FROM users WHERE id = p_user_id;
  IF v_created_at IS NULL THEN
    RETURN 0;
  END IF;
  RETURN EXTRACT(DAY FROM (now() - v_created_at))::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 2. CONTENT REPORTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reporter
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  reporter_trust_score INTEGER,
  
  -- Content being reported
  content_type TEXT NOT NULL CHECK (content_type IN (
    'review', 'message', 'property', 'route', 'comment', 'photo', 'profile', 'other'
  )),
  content_id UUID NOT NULL,
  content_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content_preview TEXT, -- First 200 chars for quick admin review
  
  -- Report details
  report_reason TEXT NOT NULL CHECK (report_reason IN (
    'spam', 'harassment', 'hate_speech', 'inappropriate_content',
    'off_platform_payment', 'fake_or_misleading', 'privacy_violation',
    'safety_concern', 'copyright', 'other'
  )),
  report_description TEXT, -- Optional 50-char explanation
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'under_review', 'action_taken', 'dismissed', 'false_report'
  )),
  
  -- Resolution
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT CHECK (action_taken IN (
    'none', 'content_hidden', 'content_removed', 'warning_sent', 
    'user_restricted', 'user_suspended', 'escalated'
  )),
  review_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. FLAGGED CONTENT TABLE (Auto-moderation)
-- ============================================

CREATE TABLE IF NOT EXISTS flagged_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content details
  content_type TEXT NOT NULL CHECK (content_type IN (
    'review', 'message', 'property', 'route', 'comment', 'photo', 'listing_text'
  )),
  content_id UUID NOT NULL,
  content_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content_text TEXT,
  content_url TEXT, -- For photos
  
  -- Flagging details
  flag_source TEXT NOT NULL CHECK (flag_source IN (
    'auto_text', 'auto_image', 'user_report', 'admin', 'system'
  )),
  flag_reasons JSONB DEFAULT '[]'::jsonb, -- Array of detected issues
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  
  -- Matched patterns (for transparency)
  matched_patterns JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'hidden', 'removed', 'escalated'
  )),
  is_visible BOOLEAN DEFAULT TRUE, -- Whether content is currently shown
  
  -- Review
  auto_action_taken TEXT, -- What the system did automatically
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_action TEXT,
  review_notes TEXT,
  
  -- Metadata
  report_count INTEGER DEFAULT 0, -- How many users reported this
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. MODERATION QUEUE VIEW
-- ============================================

CREATE OR REPLACE VIEW moderation_queue AS
SELECT 
  fc.id,
  fc.content_type,
  fc.content_id,
  fc.content_text,
  fc.content_url,
  fc.flag_source,
  fc.flag_reasons,
  fc.risk_score,
  fc.matched_patterns,
  fc.status,
  fc.report_count,
  fc.created_at,
  u.id as owner_id,
  u.name as owner_name,
  u.trust_score as owner_trust_score,
  u.trust_level as owner_trust_level,
  u.warnings_received as owner_warnings,
  CASE 
    WHEN fc.risk_score >= 80 THEN 'high'
    WHEN fc.risk_score >= 50 THEN 'medium'
    ELSE 'low'
  END as priority,
  CASE
    WHEN fc.risk_score >= 80 THEN 'remove'
    WHEN fc.risk_score >= 50 THEN 'review'
    WHEN fc.report_count >= 3 THEN 'review'
    ELSE 'approve'
  END as suggested_action
FROM flagged_content fc
LEFT JOIN users u ON fc.content_owner_id = u.id
WHERE fc.status = 'pending'
ORDER BY 
  fc.risk_score DESC,
  fc.report_count DESC,
  fc.created_at ASC;

-- ============================================
-- 5. USER WARNINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Warning details
  warning_type TEXT NOT NULL CHECK (warning_type IN (
    'community_guidelines', 'off_platform_payment', 'harassment',
    'inappropriate_content', 'spam', 'fake_content', 'other'
  )),
  warning_message TEXT NOT NULL,
  related_content_id UUID, -- Reference to flagged content if applicable
  
  -- Severity
  severity TEXT NOT NULL DEFAULT 'mild' CHECK (severity IN ('mild', 'moderate', 'severe')),
  
  -- Admin
  issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Status
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. ENFORCEMENT ACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS enforcement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'warning', 'message_restriction', 'booking_restriction',
    'listing_restriction', 'temporary_suspension', 'permanent_ban'
  )),
  reason TEXT NOT NULL,
  
  -- Duration (for temporary actions)
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ, -- NULL for permanent
  
  -- Related content
  related_content_ids JSONB DEFAULT '[]'::jsonb,
  related_report_ids JSONB DEFAULT '[]'::jsonb,
  
  -- Admin
  issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  lifted_at TIMESTAMPTZ,
  lifted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  lift_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. BLOCKED PATTERNS TABLE (for text screening)
-- ============================================

CREATE TABLE IF NOT EXISTS blocked_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern details
  pattern TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'exact', 'contains', 'regex', 'phone', 'email', 'url'
  )),
  category TEXT NOT NULL CHECK (category IN (
    'off_platform_payment', 'contact_info', 'profanity', 'spam',
    'harassment', 'hate_speech', 'unsafe', 'competitor'
  )),
  
  -- Severity
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  risk_score_contribution INTEGER DEFAULT 25, -- Added to risk score when matched
  
  -- Action
  auto_action TEXT DEFAULT 'flag' CHECK (auto_action IN ('flag', 'block', 'hide', 'warn')),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default blocked patterns
INSERT INTO blocked_patterns (pattern, pattern_type, category, severity, risk_score_contribution, auto_action)
VALUES
  -- Off-platform payment patterns
  ('whatsapp', 'contains', 'off_platform_payment', 'high', 40, 'block'),
  ('telegram', 'contains', 'off_platform_payment', 'high', 40, 'block'),
  ('paypal', 'contains', 'off_platform_payment', 'high', 50, 'block'),
  ('venmo', 'contains', 'off_platform_payment', 'high', 50, 'block'),
  ('cash on arrival', 'contains', 'off_platform_payment', 'high', 60, 'block'),
  ('pay cash', 'contains', 'off_platform_payment', 'high', 60, 'block'),
  ('bank transfer', 'contains', 'off_platform_payment', 'medium', 35, 'flag'),
  ('pay me directly', 'contains', 'off_platform_payment', 'high', 50, 'block'),
  ('off platform', 'contains', 'off_platform_payment', 'high', 60, 'block'),
  ('outside the app', 'contains', 'off_platform_payment', 'high', 50, 'block'),
  ('dm me', 'contains', 'contact_info', 'medium', 30, 'flag'),
  ('text me', 'contains', 'contact_info', 'medium', 30, 'flag'),
  ('call me at', 'contains', 'contact_info', 'medium', 35, 'flag'),
  
  -- Phone number patterns (regex)
  ('\+?[\d\s\-\(\)]{10,}', 'regex', 'contact_info', 'medium', 35, 'flag'),
  
  -- Email patterns (regex)
  ('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', 'regex', 'contact_info', 'medium', 30, 'flag'),
  
  -- URL patterns
  ('http://', 'contains', 'spam', 'low', 15, 'flag'),
  ('https://', 'contains', 'spam', 'low', 15, 'flag'),
  ('www.', 'contains', 'spam', 'low', 15, 'flag')
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. REPORT RATE LIMITING
-- ============================================

CREATE TABLE IF NOT EXISTS report_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  last_report_at TIMESTAMPTZ DEFAULT now(),
  reports_today INTEGER DEFAULT 1,
  reports_this_week INTEGER DEFAULT 1,
  cooldown_until TIMESTAMPTZ,
  
  UNIQUE(user_id)
);

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to calculate user trust level based on trust score
CREATE OR REPLACE FUNCTION calculate_trust_level(p_trust_score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF p_trust_score >= 90 THEN
    RETURN 'moderator';
  ELSIF p_trust_score >= 75 THEN
    RETURN 'verified';
  ELSIF p_trust_score >= 50 THEN
    RETURN 'trusted';
  ELSIF p_trust_score >= 25 THEN
    RETURN 'standard';
  ELSE
    RETURN 'new';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update trust score
CREATE OR REPLACE FUNCTION update_user_trust_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_user RECORD;
  v_new_score INTEGER;
  v_base_score INTEGER := 30;
  v_account_age_days INTEGER;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Get account age
  v_account_age_days := get_account_age_days(p_user_id);
  
  -- Calculate score components
  v_new_score := v_base_score;
  
  -- Account age bonus (up to +15)
  v_new_score := v_new_score + LEAST(15, v_account_age_days / 30);
  
  -- Social login bonus (+10)
  IF v_user.has_social_login THEN
    v_new_score := v_new_score + 10;
  END IF;
  
  -- Booking activity bonus (up to +15)
  v_new_score := v_new_score + LEAST(15, (COALESCE(v_user.total_bookings_made, 0) + COALESCE(v_user.total_bookings_hosted, 0)) * 3);
  
  -- Reviews given bonus (up to +10)
  v_new_score := v_new_score + LEAST(10, COALESCE(v_user.reviews_given, 0) * 2);
  
  -- Accurate reports bonus (up to +10)
  v_new_score := v_new_score + LEAST(10, COALESCE(v_user.accurate_reports, 0) * 5);
  
  -- False reports penalty (up to -20)
  v_new_score := v_new_score - LEAST(20, COALESCE(v_user.false_reports, 0) * 10);
  
  -- Warnings penalty (up to -30)
  v_new_score := v_new_score - LEAST(30, COALESCE(v_user.warnings_received, 0) * 10);
  
  -- Ensure within bounds
  v_new_score := GREATEST(0, LEAST(100, v_new_score));
  
  -- Update user
  UPDATE users 
  SET 
    trust_score = v_new_score,
    trust_level = calculate_trust_level(v_new_score)
  WHERE id = p_user_id;
  
  RETURN v_new_score;
END;
$$ LANGUAGE plpgsql;

-- Function to check report rate limiting
CREATE OR REPLACE FUNCTION can_user_report(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_cooldown RECORD;
  v_max_reports_per_day INTEGER := 10;
  v_max_reports_per_week INTEGER := 30;
BEGIN
  SELECT * INTO v_cooldown FROM report_cooldowns WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- First report, always allowed
    INSERT INTO report_cooldowns (user_id) VALUES (p_user_id);
    RETURN TRUE;
  END IF;
  
  -- Check if in cooldown
  IF v_cooldown.cooldown_until IS NOT NULL AND v_cooldown.cooldown_until > now() THEN
    RETURN FALSE;
  END IF;
  
  -- Reset daily counter if new day
  IF v_cooldown.last_report_at::date < CURRENT_DATE THEN
    UPDATE report_cooldowns 
    SET reports_today = 0 
    WHERE user_id = p_user_id;
    v_cooldown.reports_today := 0;
  END IF;
  
  -- Reset weekly counter if new week
  IF v_cooldown.last_report_at < now() - INTERVAL '7 days' THEN
    UPDATE report_cooldowns 
    SET reports_this_week = 0 
    WHERE user_id = p_user_id;
    v_cooldown.reports_this_week := 0;
  END IF;
  
  -- Check limits
  IF v_cooldown.reports_today >= v_max_reports_per_day THEN
    -- Set cooldown until tomorrow
    UPDATE report_cooldowns 
    SET cooldown_until = (CURRENT_DATE + INTERVAL '1 day')::timestamptz
    WHERE user_id = p_user_id;
    RETURN FALSE;
  END IF;
  
  IF v_cooldown.reports_this_week >= v_max_reports_per_week THEN
    -- Set cooldown for 24 hours
    UPDATE report_cooldowns 
    SET cooldown_until = now() + INTERVAL '24 hours'
    WHERE user_id = p_user_id;
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to record a report
CREATE OR REPLACE FUNCTION record_user_report(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO report_cooldowns (user_id, last_report_at, reports_today, reports_this_week)
  VALUES (p_user_id, now(), 1, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    last_report_at = now(),
    reports_today = report_cooldowns.reports_today + 1,
    reports_this_week = report_cooldowns.reports_this_week + 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. RLS POLICIES
-- ============================================

-- Content reports
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON content_reports
FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view their own reports" ON content_reports
FOR SELECT TO authenticated
USING (reporter_id = auth.uid());

-- Flagged content (admin only via service role)
ALTER TABLE flagged_content ENABLE ROW LEVEL SECURITY;

-- User warnings
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own warnings" ON user_warnings
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can acknowledge their warnings" ON user_warnings
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Enforcement actions
ALTER TABLE enforcement_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enforcement actions" ON enforcement_actions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Blocked patterns (public read for client-side screening)
ALTER TABLE blocked_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active blocked patterns" ON blocked_patterns
FOR SELECT TO authenticated
USING (is_active = TRUE);

-- Report cooldowns
ALTER TABLE report_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cooldowns" ON report_cooldowns
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 11. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_flagged_content_status ON flagged_content(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_flagged_content_risk ON flagged_content(risk_score DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_flagged_content_content ON flagged_content(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON user_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_warnings_unack ON user_warnings(user_id) WHERE acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_enforcement_actions_user ON enforcement_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_actions_active ON enforcement_actions(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_blocked_patterns_active ON blocked_patterns(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_trust ON users(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_restricted ON users(is_restricted) WHERE is_restricted = TRUE;

-- ============================================
-- 12. GRANTS
-- ============================================

GRANT ALL ON TABLE content_reports TO authenticated;
GRANT SELECT ON TABLE blocked_patterns TO authenticated;
GRANT ALL ON TABLE user_warnings TO authenticated;
GRANT SELECT ON TABLE enforcement_actions TO authenticated;
GRANT SELECT ON TABLE report_cooldowns TO authenticated;

-- ============================================
-- 13. COMMENTS
-- ============================================

COMMENT ON TABLE content_reports IS 'User-submitted content reports with rate limiting';
COMMENT ON TABLE flagged_content IS 'Auto-moderated and reported content awaiting review';
COMMENT ON TABLE user_warnings IS 'Educational warnings issued to users';
COMMENT ON TABLE enforcement_actions IS 'Enforcement actions taken against users (warnings to bans)';
COMMENT ON TABLE blocked_patterns IS 'Patterns for auto-detecting problematic content';
COMMENT ON VIEW moderation_queue IS 'Unified admin view of pending moderation items';
COMMENT ON FUNCTION update_user_trust_score IS 'Recalculates user trust score based on activity and behavior';
COMMENT ON FUNCTION can_user_report IS 'Checks if user is rate-limited from reporting';

