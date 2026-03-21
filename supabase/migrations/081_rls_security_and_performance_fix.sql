-- ============================================
-- Migration 081: RLS Security & Performance Fix
-- ============================================
-- Fixes:
--   1. Enable RLS on ALL tables (some were never enabled despite policies existing)
--   2. Replace auth.uid() with (select auth.uid()) in all policies for performance
--   3. Fix moderation_queue view from SECURITY DEFINER to SECURITY INVOKER
--   4. Add missing RLS policies for property_facilities and property_equine
--   5. Consolidate duplicate/overlapping policies
--
-- This migration is idempotent — safe to run multiple times.
-- ============================================

-- ============================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- ============================================
-- These are safe to re-run; ENABLE is idempotent.
-- Tables that may not exist on live DB are wrapped in DO blocks.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Tables that may not exist (created in early migrations but possibly never applied)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_facilities') THEN
    ALTER TABLE property_facilities ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'host_replies') THEN
    ALTER TABLE host_replies ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'route_pins') THEN
    ALTER TABLE route_pins ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_amenities') THEN
    ALTER TABLE property_amenities ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_equine') THEN
    ALTER TABLE property_equine ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'route_recordings') THEN
    ALTER TABLE route_recordings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_user_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_waypoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_point_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE last_minute_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE length_of_stay_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_damage_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_balance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE enforcement_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE warning_clear_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE waypoint_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE waypoint_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waypoint_edit_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_variants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ============================================
-- Drop every policy so we can recreate them cleanly with (select auth.uid())
-- We drop BOTH old names AND new names to make this truly idempotent.

-- users
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;

-- host_profiles
DROP POLICY IF EXISTS "Hosts can view own profile" ON host_profiles;
DROP POLICY IF EXISTS "Hosts can insert own profile" ON host_profiles;
DROP POLICY IF EXISTS "Hosts can update own profile" ON host_profiles;
DROP POLICY IF EXISTS "Admins have full access to host profiles" ON host_profiles;

-- properties (from 002 + 004 + 018)
DROP POLICY IF EXISTS "Anyone can view properties" ON properties;
DROP POLICY IF EXISTS "Hosts can insert own properties" ON properties;
DROP POLICY IF EXISTS "Hosts can update own properties" ON properties;
DROP POLICY IF EXISTS "Hosts can delete own properties" ON properties;
DROP POLICY IF EXISTS "Public can read published properties" ON properties;
DROP POLICY IF EXISTS "Hosts can read their own properties" ON properties;
DROP POLICY IF EXISTS "Hosts can insert their own properties" ON properties;
DROP POLICY IF EXISTS "Hosts can update their own properties" ON properties;
DROP POLICY IF EXISTS "Hosts can delete their own properties" ON properties;

-- property_facilities (may not exist on live DB)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_facilities') THEN
    DROP POLICY IF EXISTS "Anyone can view facilities" ON property_facilities;
    DROP POLICY IF EXISTS "Hosts can manage own facilities" ON property_facilities;
  END IF;
END $$;

-- property_photos
DROP POLICY IF EXISTS "Anyone can view photos" ON property_photos;
DROP POLICY IF EXISTS "Hosts can manage own photos" ON property_photos;

-- availability_blocks
DROP POLICY IF EXISTS "Anyone can view availability blocks" ON availability_blocks;
DROP POLICY IF EXISTS "Hosts can manage own blocks" ON availability_blocks;

-- bookings
DROP POLICY IF EXISTS "Guests can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Guests can create bookings" ON bookings;
DROP POLICY IF EXISTS "Hosts and guests can update relevant bookings" ON bookings;

-- reviews (legacy — may not exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
    DROP POLICY IF EXISTS "Guests can create reviews for their bookings" ON reviews;
  END IF;
END $$;

-- host_replies (legacy — may not exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'host_replies') THEN
    DROP POLICY IF EXISTS "Anyone can view host replies" ON host_replies;
    DROP POLICY IF EXISTS "Hosts can reply to reviews of their properties" ON host_replies;
  END IF;
END $$;

-- routes
DROP POLICY IF EXISTS "Anyone can view routes" ON routes;
DROP POLICY IF EXISTS "Admins can manage routes" ON routes;
DROP POLICY IF EXISTS "routes_visibility_select" ON routes;
DROP POLICY IF EXISTS routes_public_select ON routes;

-- route_pins (legacy — may not exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'route_pins') THEN
    DROP POLICY IF EXISTS "Anyone can view route pins" ON route_pins;
    DROP POLICY IF EXISTS "Admins can manage route pins" ON route_pins;
  END IF;
END $$;

-- property_amenities (may not exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_amenities') THEN
    DROP POLICY IF EXISTS "Public can read amenities for published properties" ON property_amenities;
    DROP POLICY IF EXISTS "Hosts can manage their own property amenities" ON property_amenities;
  END IF;
END $$;

-- property_equine (should exist but wrapping for safety)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_equine') THEN
    DROP POLICY IF EXISTS "Public can read equine facilities for published properties" ON property_equine;
    DROP POLICY IF EXISTS "Hosts can manage their own property equine facilities" ON property_equine;
  END IF;
END $$;

-- favorites
DROP POLICY IF EXISTS "Users can view their own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON favorites;
DROP POLICY IF EXISTS "Users can remove their own favorites" ON favorites;

-- messages
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;
DROP POLICY IF EXISTS "Users can update their sent messages" ON messages;

-- property_questions
DROP POLICY IF EXISTS "Anyone can view property questions" ON property_questions;
DROP POLICY IF EXISTS "Authenticated users can ask questions" ON property_questions;
DROP POLICY IF EXISTS "Property owners can answer questions" ON property_questions;
DROP POLICY IF EXISTS "Hosts can delete questions on their properties" ON property_questions;
DROP POLICY IF EXISTS "Users can delete their own questions" ON property_questions;

-- flagged_messages
DROP POLICY IF EXISTS "Admins can view all flagged messages" ON flagged_messages;
DROP POLICY IF EXISTS "Admins can update flagged messages" ON flagged_messages;
DROP POLICY IF EXISTS "System can insert flagged messages" ON flagged_messages;
DROP POLICY IF EXISTS "Admins can insert flagged messages" ON flagged_messages;

-- flagged_questions
DROP POLICY IF EXISTS "Admins can view all flagged questions" ON flagged_questions;
DROP POLICY IF EXISTS "Admins can update flagged questions" ON flagged_questions;
DROP POLICY IF EXISTS "System can insert flagged questions" ON flagged_questions;

-- admin_actions
DROP POLICY IF EXISTS "Admins can view all actions" ON admin_actions;
DROP POLICY IF EXISTS "Admins can insert actions" ON admin_actions;
DROP POLICY IF EXISTS "Users can view actions against them" ON admin_actions;

-- user_feedback
DROP POLICY IF EXISTS "Users can view their own feedback" ON user_feedback;
DROP POLICY IF EXISTS "Users can insert feedback" ON user_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON user_feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON user_feedback;

-- property_reviews
DROP POLICY IF EXISTS "Anyone can view property reviews" ON property_reviews;
DROP POLICY IF EXISTS "Guests can create property reviews" ON property_reviews;
DROP POLICY IF EXISTS "Guests can create property reviews within 14 days" ON property_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON property_reviews;
DROP POLICY IF EXISTS "Hosts can respond to reviews" ON property_reviews;

-- user_reviews
DROP POLICY IF EXISTS "Anyone can view user reviews" ON user_reviews;
DROP POLICY IF EXISTS "Hosts can create user reviews" ON user_reviews;
DROP POLICY IF EXISTS "Hosts can create user reviews within 14 days" ON user_reviews;
DROP POLICY IF EXISTS "Users can update their own user reviews" ON user_reviews;

-- pricing_rules
DROP POLICY IF EXISTS "Anyone can view pricing rules" ON pricing_rules;
DROP POLICY IF EXISTS "Hosts can insert pricing rules" ON pricing_rules;
DROP POLICY IF EXISTS "Hosts can update pricing rules" ON pricing_rules;
DROP POLICY IF EXISTS "Hosts can delete pricing rules" ON pricing_rules;

-- recurring_availability_blocks
DROP POLICY IF EXISTS "Anyone can view recurring blocks" ON recurring_availability_blocks;
DROP POLICY IF EXISTS "Hosts can insert recurring blocks" ON recurring_availability_blocks;
DROP POLICY IF EXISTS "Hosts can update recurring blocks" ON recurring_availability_blocks;
DROP POLICY IF EXISTS "Hosts can delete recurring blocks" ON recurring_availability_blocks;

-- user_horses
DROP POLICY IF EXISTS "Users can view their own horses" ON user_horses;
DROP POLICY IF EXISTS "Users can insert their own horses" ON user_horses;
DROP POLICY IF EXISTS "Users can update their own horses" ON user_horses;
DROP POLICY IF EXISTS "Users can delete their own horses" ON user_horses;
DROP POLICY IF EXISTS "Hosts can view horses for their bookings" ON user_horses;
DROP POLICY IF EXISTS "Admins can view all horses" ON user_horses;

-- booking_horses
DROP POLICY IF EXISTS "Guests can manage booking horses" ON booking_horses;
DROP POLICY IF EXISTS "Hosts can view booking horses" ON booking_horses;
DROP POLICY IF EXISTS "Admins can view all booking horses" ON booking_horses;

-- route_completions
DROP POLICY IF EXISTS "route_completions_auth_select" ON route_completions;
DROP POLICY IF EXISTS "route_completions_auth_insert" ON route_completions;
DROP POLICY IF EXISTS "route_completions_auth_update" ON route_completions;
DROP POLICY IF EXISTS "route_completions_auth_delete" ON route_completions;
DROP POLICY IF EXISTS "route_completions_public_read" ON route_completions;
DROP POLICY IF EXISTS "route_completions_user_insert" ON route_completions;
DROP POLICY IF EXISTS "route_completions_user_delete" ON route_completions;
DROP POLICY IF EXISTS "route_completions_user_update" ON route_completions;
DROP POLICY IF EXISTS "Anyone can view route completions" ON route_completions;
DROP POLICY IF EXISTS "Users can insert own completions" ON route_completions;
DROP POLICY IF EXISTS "Users can update own completions" ON route_completions;
DROP POLICY IF EXISTS "Users can delete own completions" ON route_completions;

-- route_user_photos
DROP POLICY IF EXISTS "Anyone can view route photos" ON route_user_photos;
DROP POLICY IF EXISTS "Users can upload photos to completed routes" ON route_user_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON route_user_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON route_user_photos;

-- user_verifications
DROP POLICY IF EXISTS "Users can view own verifications" ON user_verifications;
DROP POLICY IF EXISTS "Admins can manage all verifications" ON user_verifications;

-- emergency_contacts
DROP POLICY IF EXISTS "Users can manage own emergency contacts" ON emergency_contacts;

-- property_verifications
DROP POLICY IF EXISTS "Hosts can view own property verifications" ON property_verifications;
DROP POLICY IF EXISTS "Admins can manage property verifications" ON property_verifications;

-- news_posts
DROP POLICY IF EXISTS "Anyone can view published news posts" ON news_posts;
DROP POLICY IF EXISTS "Admins can manage all news posts" ON news_posts;

-- public_paths
DROP POLICY IF EXISTS "public_paths_select" ON public_paths;

-- route_waypoints
DROP POLICY IF EXISTS "route_waypoints_select" ON route_waypoints;
DROP POLICY IF EXISTS "route_waypoints_insert" ON route_waypoints;
DROP POLICY IF EXISTS "route_waypoints_auth_insert" ON route_waypoints;
DROP POLICY IF EXISTS "route_waypoints_auth_update" ON route_waypoints;
DROP POLICY IF EXISTS "route_waypoints_auth_delete" ON route_waypoints;
DROP POLICY IF EXISTS "route_waypoints_delete" ON route_waypoints;
DROP POLICY IF EXISTS "route_waypoints_owner_all" ON route_waypoints;

-- route_point_comments
DROP POLICY IF EXISTS "route_point_comments_select" ON route_point_comments;
DROP POLICY IF EXISTS "route_point_comments_insert" ON route_point_comments;
DROP POLICY IF EXISTS "route_point_comments_update" ON route_point_comments;
DROP POLICY IF EXISTS "route_point_comments_delete" ON route_point_comments;

-- route_recordings (may not exist)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'route_recordings') THEN
    DROP POLICY IF EXISTS "route_recordings_select" ON route_recordings;
    DROP POLICY IF EXISTS "route_recordings_insert" ON route_recordings;
    DROP POLICY IF EXISTS "route_recordings_update" ON route_recordings;
    DROP POLICY IF EXISTS "route_recordings_delete" ON route_recordings;
  END IF;
END $$;

-- referral_codes
DROP POLICY IF EXISTS "Users can view own referral code" ON referral_codes;
DROP POLICY IF EXISTS "Users can view referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Users can create own referral code" ON referral_codes;
DROP POLICY IF EXISTS "Users can update own referral code" ON referral_codes;
DROP POLICY IF EXISTS "Admins manage referral codes" ON referral_codes;

-- referral_redemptions
DROP POLICY IF EXISTS "Users can view own redemptions" ON referral_redemptions;
DROP POLICY IF EXISTS "Admins manage redemptions" ON referral_redemptions;

-- referrer_rewards
DROP POLICY IF EXISTS "Users can view own rewards" ON referrer_rewards;
DROP POLICY IF EXISTS "Admins manage rewards" ON referrer_rewards;

-- user_credits
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "Admins manage credits" ON user_credits;

-- badges
DROP POLICY IF EXISTS "Anyone can view badges" ON badges;
DROP POLICY IF EXISTS "Admins can manage badges" ON badges;
DROP POLICY IF EXISTS "Admins manage badges" ON badges;

-- user_badges
DROP POLICY IF EXISTS "Anyone can view earned badges" ON user_badges;
DROP POLICY IF EXISTS "Users can update own badge display" ON user_badges;
DROP POLICY IF EXISTS "Admins can award badges" ON user_badges;

-- user_stats
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
DROP POLICY IF EXISTS "Admins manage user_stats" ON user_stats;
DROP POLICY IF EXISTS "Service role can manage user_stats" ON user_stats;

-- site_settings
DROP POLICY IF EXISTS "Anyone can read site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can update site settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can insert site settings" ON site_settings;

-- property_shares
DROP POLICY IF EXISTS "Anyone can create shares" ON property_shares;
DROP POLICY IF EXISTS "Property owners can view their shares" ON property_shares;

-- last_minute_discounts
DROP POLICY IF EXISTS "Anyone can view last-minute discounts" ON last_minute_discounts;
DROP POLICY IF EXISTS "Hosts can manage their last-minute discounts" ON last_minute_discounts;

-- length_of_stay_discounts
DROP POLICY IF EXISTS "Anyone can view length-of-stay discounts" ON length_of_stay_discounts;
DROP POLICY IF EXISTS "Hosts can manage their length-of-stay discounts" ON length_of_stay_discounts;

-- seasonal_discounts
DROP POLICY IF EXISTS "Anyone can view seasonal discounts" ON seasonal_discounts;
DROP POLICY IF EXISTS "Hosts can manage their seasonal discounts" ON seasonal_discounts;

-- property_damage_claims
DROP POLICY IF EXISTS "Hosts and guests can view their claims" ON property_damage_claims;
DROP POLICY IF EXISTS "Hosts can create claims for their properties" ON property_damage_claims;
DROP POLICY IF EXISTS "Guests can update their response" ON property_damage_claims;
DROP POLICY IF EXISTS "Admins can manage all damage claims" ON property_damage_claims;

-- saved_payment_methods
DROP POLICY IF EXISTS "Users can view their payment methods" ON saved_payment_methods;
DROP POLICY IF EXISTS "Users can manage their payment methods" ON saved_payment_methods;

-- booking_issues
DROP POLICY IF EXISTS "Users can view their booking issues" ON booking_issues;
DROP POLICY IF EXISTS "Users can create issues for their bookings" ON booking_issues;

-- cancellation_policy_rules
DROP POLICY IF EXISTS "Anyone can view cancellation policies" ON cancellation_policy_rules;

-- scheduled_payouts
DROP POLICY IF EXISTS "Hosts can view their scheduled payouts" ON scheduled_payouts;

-- scheduled_balance_payments
DROP POLICY IF EXISTS "Guests can view their scheduled payments" ON scheduled_balance_payments;

-- content_reports
DROP POLICY IF EXISTS "Users can create reports" ON content_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON content_reports;
DROP POLICY IF EXISTS "Admins can view and manage all reports" ON content_reports;

-- flagged_content
DROP POLICY IF EXISTS "Admins can manage flagged content" ON flagged_content;

-- user_warnings
DROP POLICY IF EXISTS "Users can view their own warnings" ON user_warnings;
DROP POLICY IF EXISTS "Users can acknowledge their warnings" ON user_warnings;

-- enforcement_actions
DROP POLICY IF EXISTS "Users can view their own enforcement actions" ON enforcement_actions;

-- blocked_patterns
DROP POLICY IF EXISTS "Anyone can view active blocked patterns" ON blocked_patterns;

-- report_cooldowns
DROP POLICY IF EXISTS "Users can view their own cooldowns" ON report_cooldowns;

-- admin_audit_log
DROP POLICY IF EXISTS "Admins can view audit log" ON admin_audit_log;
DROP POLICY IF EXISTS "Service role can insert audit log" ON admin_audit_log;

-- route_likes
DROP POLICY IF EXISTS "route_likes_read" ON route_likes;
DROP POLICY IF EXISTS "route_likes_user_insert" ON route_likes;
DROP POLICY IF EXISTS "route_likes_user_delete" ON route_likes;

-- route_favorites
DROP POLICY IF EXISTS "route_favorites_read_own" ON route_favorites;
DROP POLICY IF EXISTS "route_favorites_user_insert" ON route_favorites;
DROP POLICY IF EXISTS "route_favorites_user_delete" ON route_favorites;

-- route_hazards
DROP POLICY IF EXISTS "route_hazards_read" ON route_hazards;
DROP POLICY IF EXISTS "route_hazards_auth_insert" ON route_hazards;
DROP POLICY IF EXISTS "route_hazards_auth_update" ON route_hazards;
DROP POLICY IF EXISTS "route_hazards_owner_delete" ON route_hazards;
DROP POLICY IF EXISTS "route_hazards_owner_update" ON route_hazards;

-- route_shares
DROP POLICY IF EXISTS "route_shares_insert" ON route_shares;
DROP POLICY IF EXISTS "route_shares_read_admin" ON route_shares;

-- user_referral_rewards
DROP POLICY IF EXISTS "Users can view their own rewards" ON user_referral_rewards;
DROP POLICY IF EXISTS "Admins can manage all rewards" ON user_referral_rewards;

-- warning_clear_votes
DROP POLICY IF EXISTS "warning_clear_votes_public_read" ON warning_clear_votes;
DROP POLICY IF EXISTS "warning_clear_votes_auth_insert" ON warning_clear_votes;
DROP POLICY IF EXISTS "warning_clear_votes_owner_delete" ON warning_clear_votes;

-- waypoint_photos
DROP POLICY IF EXISTS "waypoint_photos_public_read" ON waypoint_photos;
DROP POLICY IF EXISTS "waypoint_photos_auth_insert" ON waypoint_photos;
DROP POLICY IF EXISTS "waypoint_photos_delete" ON waypoint_photos;

-- waypoint_suggestions
DROP POLICY IF EXISTS "waypoint_suggestions_public_read" ON waypoint_suggestions;
DROP POLICY IF EXISTS "waypoint_suggestions_auth_insert" ON waypoint_suggestions;
DROP POLICY IF EXISTS "waypoint_suggestions_owner_manage" ON waypoint_suggestions;
DROP POLICY IF EXISTS "waypoint_suggestions_owner_delete" ON waypoint_suggestions;

-- waypoint_edit_suggestions
DROP POLICY IF EXISTS "waypoint_edit_suggestions_public_read" ON waypoint_edit_suggestions;
DROP POLICY IF EXISTS "waypoint_edit_suggestions_auth_insert" ON waypoint_edit_suggestions;
DROP POLICY IF EXISTS "waypoint_edit_suggestions_owner_manage" ON waypoint_edit_suggestions;
DROP POLICY IF EXISTS "waypoint_edit_suggestions_owner_delete" ON waypoint_edit_suggestions;

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can delete notifications" ON notifications;

-- route_variants
DROP POLICY IF EXISTS "route_variants_select" ON route_variants;
DROP POLICY IF EXISTS "route_variants_insert" ON route_variants;
DROP POLICY IF EXISTS "route_variants_delete" ON route_variants;


-- ============================================
-- STEP 3: RECREATE ALL POLICIES
-- All auth.uid() replaced with (select auth.uid())
-- ============================================

-- ----------------------------------------
-- users
-- ----------------------------------------
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users
  FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- ----------------------------------------
-- host_profiles
-- ----------------------------------------
DROP POLICY IF EXISTS "host_profiles_select_own" ON host_profiles;
CREATE POLICY "host_profiles_select_own" ON host_profiles
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "host_profiles_insert" ON host_profiles;
CREATE POLICY "host_profiles_insert" ON host_profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "host_profiles_update" ON host_profiles;
CREATE POLICY "host_profiles_update" ON host_profiles
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "host_profiles_admin_all" ON host_profiles;
CREATE POLICY "host_profiles_admin_all" ON host_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- properties
-- Consolidated: removed duplicate policies from 002 vs 004.
-- Public read for all (published or own), host manage own, admin manage all.
-- ----------------------------------------
DROP POLICY IF EXISTS "properties_select" ON properties;
CREATE POLICY "properties_select" ON properties
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "properties_insert" ON properties;
CREATE POLICY "properties_insert" ON properties
  FOR INSERT WITH CHECK (
    (select auth.uid()) = host_id AND
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role IN ('host', 'admin'))
  );

DROP POLICY IF EXISTS "properties_update" ON properties;
CREATE POLICY "properties_update" ON properties
  FOR UPDATE USING (
    (select auth.uid()) = host_id OR
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS "properties_delete" ON properties;
CREATE POLICY "properties_delete" ON properties
  FOR DELETE USING (
    (select auth.uid()) = host_id OR
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- property_facilities (may not exist on live DB)
-- ----------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_facilities') THEN
    EXECUTE 'DROP POLICY IF EXISTS "property_facilities_select" ON property_facilities';
    EXECUTE 'CREATE POLICY "property_facilities_select" ON property_facilities FOR SELECT USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "property_facilities_manage" ON property_facilities';
    EXECUTE 'CREATE POLICY "property_facilities_manage" ON property_facilities FOR ALL USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = property_facilities.property_id AND properties.host_id = (select auth.uid())) OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = ''admin''))';
  END IF;
END $$;

-- ----------------------------------------
-- property_photos
-- ----------------------------------------
DROP POLICY IF EXISTS "property_photos_select" ON property_photos;
CREATE POLICY "property_photos_select" ON property_photos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "property_photos_manage" ON property_photos;
CREATE POLICY "property_photos_manage" ON property_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_photos.property_id
      AND properties.host_id = (select auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- availability_blocks
-- ----------------------------------------
DROP POLICY IF EXISTS "availability_blocks_select" ON availability_blocks;
CREATE POLICY "availability_blocks_select" ON availability_blocks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "availability_blocks_manage" ON availability_blocks;
CREATE POLICY "availability_blocks_manage" ON availability_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = availability_blocks.property_id
      AND properties.host_id = (select auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- bookings
-- ----------------------------------------
DROP POLICY IF EXISTS "bookings_select" ON bookings;
CREATE POLICY "bookings_select" ON bookings
  FOR SELECT USING (
    (select auth.uid()) = guest_id OR
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = bookings.property_id
      AND properties.host_id = (select auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS "bookings_insert" ON bookings;
CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT WITH CHECK ((select auth.uid()) = guest_id);

DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE USING (
    (select auth.uid()) = guest_id OR
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = bookings.property_id
      AND properties.host_id = (select auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- reviews (legacy table — may not exist)
-- ----------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    EXECUTE 'DROP POLICY IF EXISTS "reviews_select" ON reviews';
    EXECUTE 'CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "reviews_insert" ON reviews';
    EXECUTE 'CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK ((select auth.uid()) = guest_id AND EXISTS (SELECT 1 FROM bookings WHERE bookings.id = reviews.booking_id AND bookings.guest_id = (select auth.uid()) AND bookings.status = ''completed''))';
  END IF;
END $$;

-- ----------------------------------------
-- host_replies (legacy table — may not exist)
-- ----------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'host_replies') THEN
    EXECUTE 'DROP POLICY IF EXISTS "host_replies_select" ON host_replies';
    EXECUTE 'CREATE POLICY "host_replies_select" ON host_replies FOR SELECT USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "host_replies_insert" ON host_replies';
    EXECUTE 'CREATE POLICY "host_replies_insert" ON host_replies FOR INSERT WITH CHECK ((select auth.uid()) = host_id AND EXISTS (SELECT 1 FROM reviews JOIN properties ON reviews.property_id = properties.id WHERE reviews.id = host_replies.review_id AND properties.host_id = (select auth.uid())))';
  END IF;
END $$;

-- ----------------------------------------
-- routes
-- ----------------------------------------
DROP POLICY IF EXISTS "routes_select" ON routes;
CREATE POLICY "routes_select" ON routes
  FOR SELECT USING (
    visibility = 'public'
    OR (visibility IS NULL AND is_public = true)
    OR is_public = true
    OR owner_user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS "routes_admin_manage" ON routes;
CREATE POLICY "routes_admin_manage" ON routes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- Owner can manage their own routes
DROP POLICY IF EXISTS "routes_owner_manage" ON routes;
CREATE POLICY "routes_owner_manage" ON routes
  FOR ALL USING (owner_user_id = (select auth.uid()))
  WITH CHECK (owner_user_id = (select auth.uid()));

-- ----------------------------------------
-- route_pins (legacy — may not exist)
-- ----------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'route_pins') THEN
    EXECUTE 'DROP POLICY IF EXISTS "route_pins_select" ON route_pins';
    EXECUTE 'CREATE POLICY "route_pins_select" ON route_pins FOR SELECT USING (true)';
    EXECUTE 'DROP POLICY IF EXISTS "route_pins_admin_manage" ON route_pins';
    EXECUTE 'CREATE POLICY "route_pins_admin_manage" ON route_pins FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = ''admin''))';
  END IF;
END $$;

-- ----------------------------------------
-- property_amenities (may not exist)
-- ----------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_amenities') THEN
    EXECUTE 'DROP POLICY IF EXISTS "property_amenities_select" ON property_amenities';
    EXECUTE 'CREATE POLICY "property_amenities_select" ON property_amenities FOR SELECT USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = property_amenities.property_id AND properties.published = true))';
    EXECUTE 'DROP POLICY IF EXISTS "property_amenities_manage" ON property_amenities';
    EXECUTE 'CREATE POLICY "property_amenities_manage" ON property_amenities FOR ALL USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = property_amenities.property_id AND properties.host_id = (select auth.uid())))';
  END IF;
END $$;

-- ----------------------------------------
-- property_equine (wrapping for safety)
-- ----------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_equine') THEN
    EXECUTE 'DROP POLICY IF EXISTS "property_equine_select" ON property_equine';
    EXECUTE 'CREATE POLICY "property_equine_select" ON property_equine FOR SELECT USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = property_equine.property_id AND properties.published = true))';
    EXECUTE 'DROP POLICY IF EXISTS "property_equine_manage" ON property_equine';
    EXECUTE 'CREATE POLICY "property_equine_manage" ON property_equine FOR ALL USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = property_equine.property_id AND properties.host_id = (select auth.uid())))';
  END IF;
END $$;

-- ----------------------------------------
-- favorites
-- ----------------------------------------
DROP POLICY IF EXISTS "favorites_select" ON favorites;
CREATE POLICY "favorites_select" ON favorites
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "favorites_insert" ON favorites;
CREATE POLICY "favorites_insert" ON favorites
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "favorites_delete" ON favorites;
CREATE POLICY "favorites_delete" ON favorites
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- messages
-- ----------------------------------------
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT TO authenticated USING (
    (select auth.uid()) = sender_id OR (select auth.uid()) = recipient_id
  );

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT TO authenticated WITH CHECK (
    (select auth.uid()) = sender_id OR message_type IN ('system', 'admin_action')
  );

DROP POLICY IF EXISTS "messages_update_received" ON messages;
CREATE POLICY "messages_update_received" ON messages
  FOR UPDATE TO authenticated USING ((select auth.uid()) = recipient_id);

DROP POLICY IF EXISTS "messages_update_sent" ON messages;
CREATE POLICY "messages_update_sent" ON messages
  FOR UPDATE TO authenticated USING ((select auth.uid()) = sender_id)
  WITH CHECK ((select auth.uid()) = sender_id);

-- ----------------------------------------
-- property_questions
-- ----------------------------------------
DROP POLICY IF EXISTS "property_questions_select" ON property_questions;
CREATE POLICY "property_questions_select" ON property_questions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "property_questions_insert" ON property_questions;
CREATE POLICY "property_questions_insert" ON property_questions
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = asker_id);

DROP POLICY IF EXISTS "property_questions_update" ON property_questions;
CREATE POLICY "property_questions_update" ON property_questions
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_questions.property_id
      AND properties.host_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "property_questions_delete_host" ON property_questions;
CREATE POLICY "property_questions_delete_host" ON property_questions
  FOR DELETE TO authenticated USING (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "property_questions_delete_own" ON property_questions;
CREATE POLICY "property_questions_delete_own" ON property_questions
  FOR DELETE TO authenticated USING (asker_id = (select auth.uid()));

-- ----------------------------------------
-- flagged_messages
-- ----------------------------------------
DROP POLICY IF EXISTS "flagged_messages_select" ON flagged_messages;
CREATE POLICY "flagged_messages_select" ON flagged_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "flagged_messages_update" ON flagged_messages;
CREATE POLICY "flagged_messages_update" ON flagged_messages
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "flagged_messages_insert" ON flagged_messages;
CREATE POLICY "flagged_messages_insert" ON flagged_messages
  FOR INSERT TO authenticated WITH CHECK (true);

-- ----------------------------------------
-- flagged_questions
-- ----------------------------------------
DROP POLICY IF EXISTS "flagged_questions_select" ON flagged_questions;
CREATE POLICY "flagged_questions_select" ON flagged_questions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "flagged_questions_update" ON flagged_questions;
CREATE POLICY "flagged_questions_update" ON flagged_questions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "flagged_questions_insert" ON flagged_questions;
CREATE POLICY "flagged_questions_insert" ON flagged_questions
  FOR INSERT TO authenticated WITH CHECK (true);

-- ----------------------------------------
-- admin_actions
-- ----------------------------------------
DROP POLICY IF EXISTS "admin_actions_admin_select" ON admin_actions;
CREATE POLICY "admin_actions_admin_select" ON admin_actions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_actions_admin_insert" ON admin_actions;
CREATE POLICY "admin_actions_admin_insert" ON admin_actions
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_actions_user_select" ON admin_actions;
CREATE POLICY "admin_actions_user_select" ON admin_actions
  FOR SELECT TO authenticated USING (target_user_id = (select auth.uid()));

-- ----------------------------------------
-- user_feedback
-- ----------------------------------------
DROP POLICY IF EXISTS "user_feedback_select_own" ON user_feedback;
CREATE POLICY "user_feedback_select_own" ON user_feedback
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_feedback_insert" ON user_feedback;
CREATE POLICY "user_feedback_insert" ON user_feedback
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_feedback_admin_select" ON user_feedback;
CREATE POLICY "user_feedback_admin_select" ON user_feedback
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "user_feedback_admin_update" ON user_feedback;
CREATE POLICY "user_feedback_admin_update" ON user_feedback
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

-- ----------------------------------------
-- property_reviews
-- ----------------------------------------
DROP POLICY IF EXISTS "property_reviews_select" ON property_reviews;
CREATE POLICY "property_reviews_select" ON property_reviews
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "property_reviews_insert" ON property_reviews;
CREATE POLICY "property_reviews_insert" ON property_reviews
  FOR INSERT TO authenticated WITH CHECK (
    reviewer_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND bookings.guest_id = (select auth.uid())
      AND bookings.status = 'confirmed'
      AND bookings.end_date < now()
      AND bookings.end_date > now() - interval '14 days'
    )
  );

DROP POLICY IF EXISTS "property_reviews_update_own" ON property_reviews;
CREATE POLICY "property_reviews_update_own" ON property_reviews
  FOR UPDATE TO authenticated USING (reviewer_id = (select auth.uid()))
  WITH CHECK (reviewer_id = (select auth.uid()) AND created_at > now() - interval '7 days');

DROP POLICY IF EXISTS "property_reviews_host_respond" ON property_reviews;
CREATE POLICY "property_reviews_host_respond" ON property_reviews
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.host_id = (select auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
      AND properties.host_id = (select auth.uid())
    )
  );

-- ----------------------------------------
-- user_reviews
-- ----------------------------------------
DROP POLICY IF EXISTS "user_reviews_select" ON user_reviews;
CREATE POLICY "user_reviews_select" ON user_reviews
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "user_reviews_insert" ON user_reviews;
CREATE POLICY "user_reviews_insert" ON user_reviews
  FOR INSERT TO authenticated WITH CHECK (
    reviewer_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM bookings
      JOIN properties ON properties.id = bookings.property_id
      WHERE bookings.id = booking_id
      AND properties.host_id = (select auth.uid())
      AND bookings.guest_id = reviewed_user_id
      AND bookings.status = 'confirmed'
      AND bookings.end_date < now()
      AND bookings.end_date > now() - interval '14 days'
    )
  );

DROP POLICY IF EXISTS "user_reviews_update" ON user_reviews;
CREATE POLICY "user_reviews_update" ON user_reviews
  FOR UPDATE TO authenticated USING (reviewer_id = (select auth.uid()))
  WITH CHECK (reviewer_id = (select auth.uid()) AND created_at > now() - interval '7 days');

-- ----------------------------------------
-- pricing_rules
-- ----------------------------------------
DROP POLICY IF EXISTS "pricing_rules_select" ON pricing_rules;
CREATE POLICY "pricing_rules_select" ON pricing_rules
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "pricing_rules_insert" ON pricing_rules;
CREATE POLICY "pricing_rules_insert" ON pricing_rules
  FOR INSERT TO authenticated WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "pricing_rules_update" ON pricing_rules;
CREATE POLICY "pricing_rules_update" ON pricing_rules
  FOR UPDATE TO authenticated USING (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "pricing_rules_delete" ON pricing_rules;
CREATE POLICY "pricing_rules_delete" ON pricing_rules
  FOR DELETE TO authenticated USING (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  );

-- ----------------------------------------
-- recurring_availability_blocks
-- ----------------------------------------
DROP POLICY IF EXISTS "recurring_availability_blocks_select" ON recurring_availability_blocks;
CREATE POLICY "recurring_availability_blocks_select" ON recurring_availability_blocks
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "recurring_availability_blocks_insert" ON recurring_availability_blocks;
CREATE POLICY "recurring_availability_blocks_insert" ON recurring_availability_blocks
  FOR INSERT TO authenticated WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "recurring_availability_blocks_update" ON recurring_availability_blocks;
CREATE POLICY "recurring_availability_blocks_update" ON recurring_availability_blocks
  FOR UPDATE TO authenticated USING (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "recurring_availability_blocks_delete" ON recurring_availability_blocks;
CREATE POLICY "recurring_availability_blocks_delete" ON recurring_availability_blocks
  FOR DELETE TO authenticated USING (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  );

-- ----------------------------------------
-- user_horses
-- ----------------------------------------
DROP POLICY IF EXISTS "user_horses_select_own" ON user_horses;
CREATE POLICY "user_horses_select_own" ON user_horses
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_horses_insert" ON user_horses;
CREATE POLICY "user_horses_insert" ON user_horses
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_horses_update" ON user_horses;
CREATE POLICY "user_horses_update" ON user_horses
  FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_horses_delete" ON user_horses;
CREATE POLICY "user_horses_delete" ON user_horses
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_horses_host_view" ON user_horses;
CREATE POLICY "user_horses_host_view" ON user_horses
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM booking_horses bh
      JOIN bookings b ON b.id = bh.booking_id
      JOIN properties p ON p.id = b.property_id
      WHERE bh.horse_id = user_horses.id
      AND p.host_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "user_horses_admin_view" ON user_horses;
CREATE POLICY "user_horses_admin_view" ON user_horses
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

-- ----------------------------------------
-- booking_horses
-- ----------------------------------------
DROP POLICY IF EXISTS "booking_horses_guest_manage" ON booking_horses;
CREATE POLICY "booking_horses_guest_manage" ON booking_horses
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND bookings.guest_id = (select auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND bookings.guest_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "booking_horses_host_view" ON booking_horses;
CREATE POLICY "booking_horses_host_view" ON booking_horses
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN properties p ON p.id = b.property_id
      WHERE b.id = booking_id AND p.host_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "booking_horses_admin_view" ON booking_horses;
CREATE POLICY "booking_horses_admin_view" ON booking_horses
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

-- ----------------------------------------
-- route_completions
-- ----------------------------------------
DROP POLICY IF EXISTS "route_completions_select" ON route_completions;
CREATE POLICY "route_completions_select" ON route_completions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "route_completions_insert" ON route_completions;
CREATE POLICY "route_completions_insert" ON route_completions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "route_completions_update" ON route_completions;
CREATE POLICY "route_completions_update" ON route_completions
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "route_completions_delete" ON route_completions;
CREATE POLICY "route_completions_delete" ON route_completions
  FOR DELETE USING (user_id = (select auth.uid()));

-- ----------------------------------------
-- route_user_photos
-- ----------------------------------------
DROP POLICY IF EXISTS "route_user_photos_select" ON route_user_photos;
CREATE POLICY "route_user_photos_select" ON route_user_photos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "route_user_photos_insert" ON route_user_photos;
CREATE POLICY "route_user_photos_insert" ON route_user_photos
  FOR INSERT WITH CHECK (
    (select auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM route_completions
      WHERE route_id = route_user_photos.route_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "route_user_photos_update" ON route_user_photos;
CREATE POLICY "route_user_photos_update" ON route_user_photos
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "route_user_photos_delete" ON route_user_photos;
CREATE POLICY "route_user_photos_delete" ON route_user_photos
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- user_verifications
-- ----------------------------------------
DROP POLICY IF EXISTS "user_verifications_select" ON user_verifications;
CREATE POLICY "user_verifications_select" ON user_verifications
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_verifications_admin" ON user_verifications;
CREATE POLICY "user_verifications_admin" ON user_verifications
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

-- ----------------------------------------
-- emergency_contacts
-- ----------------------------------------
DROP POLICY IF EXISTS "emergency_contacts_manage" ON emergency_contacts;
CREATE POLICY "emergency_contacts_manage" ON emergency_contacts
  FOR ALL TO authenticated USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ----------------------------------------
-- property_verifications
-- ----------------------------------------
DROP POLICY IF EXISTS "property_verifications_host_select" ON property_verifications;
CREATE POLICY "property_verifications_host_select" ON property_verifications
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_verifications.property_id
      AND properties.host_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "property_verifications_admin" ON property_verifications;
CREATE POLICY "property_verifications_admin" ON property_verifications
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

-- ----------------------------------------
-- news_posts
-- ----------------------------------------
DROP POLICY IF EXISTS "news_posts_select" ON news_posts;
CREATE POLICY "news_posts_select" ON news_posts
  FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "news_posts_admin" ON news_posts;
CREATE POLICY "news_posts_admin" ON news_posts
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

-- ----------------------------------------
-- public_paths
-- ----------------------------------------
DROP POLICY IF EXISTS "public_paths_select" ON public_paths;
CREATE POLICY "public_paths_select" ON public_paths
  FOR SELECT USING (true);

-- ----------------------------------------
-- route_waypoints
-- ----------------------------------------
DROP POLICY IF EXISTS "route_waypoints_select" ON route_waypoints;
CREATE POLICY "route_waypoints_select" ON route_waypoints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = route_waypoints.route_id
      AND (routes.visibility = 'public' OR routes.is_public = true OR routes.owner_user_id = (select auth.uid()))
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS "route_waypoints_insert" ON route_waypoints;
CREATE POLICY "route_waypoints_insert" ON route_waypoints
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "route_waypoints_update" ON route_waypoints;
CREATE POLICY "route_waypoints_update" ON route_waypoints
  FOR UPDATE USING (
    created_by_user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM routes WHERE routes.id = route_waypoints.route_id AND routes.owner_user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS "route_waypoints_delete" ON route_waypoints;
CREATE POLICY "route_waypoints_delete" ON route_waypoints
  FOR DELETE USING (
    created_by_user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM routes WHERE routes.id = route_waypoints.route_id AND routes.owner_user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- route_point_comments
-- ----------------------------------------
DROP POLICY IF EXISTS "route_point_comments_select" ON route_point_comments;
CREATE POLICY "route_point_comments_select" ON route_point_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = route_point_comments.route_id
      AND (routes.visibility = 'public' OR routes.is_public = true OR routes.owner_user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "route_point_comments_insert" ON route_point_comments;
CREATE POLICY "route_point_comments_insert" ON route_point_comments
  FOR INSERT WITH CHECK (
    (select auth.uid()) IS NOT NULL AND
    EXISTS (SELECT 1 FROM routes WHERE routes.id = route_point_comments.route_id AND routes.visibility = 'public')
  );

DROP POLICY IF EXISTS "route_point_comments_update" ON route_point_comments;
CREATE POLICY "route_point_comments_update" ON route_point_comments
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "route_point_comments_delete" ON route_point_comments;
CREATE POLICY "route_point_comments_delete" ON route_point_comments
  FOR DELETE USING (user_id = (select auth.uid()));

-- ----------------------------------------
-- route_recordings (may not exist)
-- ----------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'route_recordings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "route_recordings_select" ON route_recordings';
    EXECUTE 'CREATE POLICY "route_recordings_select" ON route_recordings FOR SELECT USING (user_id = (select auth.uid()))';
    EXECUTE 'DROP POLICY IF EXISTS "route_recordings_insert" ON route_recordings';
    EXECUTE 'CREATE POLICY "route_recordings_insert" ON route_recordings FOR INSERT WITH CHECK (user_id = (select auth.uid()))';
    EXECUTE 'DROP POLICY IF EXISTS "route_recordings_update" ON route_recordings';
    EXECUTE 'CREATE POLICY "route_recordings_update" ON route_recordings FOR UPDATE USING (user_id = (select auth.uid()))';
    EXECUTE 'DROP POLICY IF EXISTS "route_recordings_delete" ON route_recordings';
    EXECUTE 'CREATE POLICY "route_recordings_delete" ON route_recordings FOR DELETE USING (user_id = (select auth.uid()))';
  END IF;
END $$;

-- ----------------------------------------
-- referral_codes
-- ----------------------------------------
DROP POLICY IF EXISTS "referral_codes_select" ON referral_codes;
CREATE POLICY "referral_codes_select" ON referral_codes
  FOR SELECT USING (
    owner_user_id = (select auth.uid())
    OR code_type IN ('promo', 'partner', 'influencer')
  );

DROP POLICY IF EXISTS "referral_codes_insert" ON referral_codes;
CREATE POLICY "referral_codes_insert" ON referral_codes
  FOR INSERT WITH CHECK (
    owner_user_id = (select auth.uid()) AND code_type = 'user_referral'
  );

DROP POLICY IF EXISTS "referral_codes_update" ON referral_codes;
CREATE POLICY "referral_codes_update" ON referral_codes
  FOR UPDATE USING (owner_user_id = (select auth.uid()))
  WITH CHECK (owner_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "referral_codes_admin" ON referral_codes;
CREATE POLICY "referral_codes_admin" ON referral_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- referral_redemptions
-- ----------------------------------------
DROP POLICY IF EXISTS "referral_redemptions_select" ON referral_redemptions;
CREATE POLICY "referral_redemptions_select" ON referral_redemptions
  FOR SELECT USING (
    user_id = (select auth.uid()) OR referrer_user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "referral_redemptions_admin" ON referral_redemptions;
CREATE POLICY "referral_redemptions_admin" ON referral_redemptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- referrer_rewards
-- ----------------------------------------
DROP POLICY IF EXISTS "referrer_rewards_select" ON referrer_rewards;
CREATE POLICY "referrer_rewards_select" ON referrer_rewards
  FOR SELECT USING (referrer_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "referrer_rewards_admin" ON referrer_rewards;
CREATE POLICY "referrer_rewards_admin" ON referrer_rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- user_credits
-- ----------------------------------------
DROP POLICY IF EXISTS "user_credits_select" ON user_credits;
CREATE POLICY "user_credits_select" ON user_credits
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_credits_admin" ON user_credits;
CREATE POLICY "user_credits_admin" ON user_credits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- badges
-- ----------------------------------------
DROP POLICY IF EXISTS "badges_select" ON badges;
CREATE POLICY "badges_select" ON badges
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "badges_admin" ON badges;
CREATE POLICY "badges_admin" ON badges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- user_badges
-- ----------------------------------------
DROP POLICY IF EXISTS "user_badges_select" ON user_badges;
CREATE POLICY "user_badges_select" ON user_badges
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_badges_update" ON user_badges;
CREATE POLICY "user_badges_update" ON user_badges
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_badges_admin_insert" ON user_badges;
CREATE POLICY "user_badges_admin_insert" ON user_badges
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- user_stats
-- ----------------------------------------
DROP POLICY IF EXISTS "user_stats_select" ON user_stats;
CREATE POLICY "user_stats_select" ON user_stats
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_stats_insert" ON user_stats;
CREATE POLICY "user_stats_insert" ON user_stats
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "user_stats_update" ON user_stats;
CREATE POLICY "user_stats_update" ON user_stats
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_stats_admin" ON user_stats;
CREATE POLICY "user_stats_admin" ON user_stats
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS "user_stats_service" ON user_stats;
CREATE POLICY "user_stats_service" ON user_stats
  FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------
-- site_settings
-- ----------------------------------------
DROP POLICY IF EXISTS "site_settings_select" ON site_settings;
CREATE POLICY "site_settings_select" ON site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_settings_admin_update" ON site_settings;
CREATE POLICY "site_settings_admin_update" ON site_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "site_settings_admin_insert" ON site_settings;
CREATE POLICY "site_settings_admin_insert" ON site_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

-- ----------------------------------------
-- property_shares
-- ----------------------------------------
DROP POLICY IF EXISTS "property_shares_insert" ON property_shares;
CREATE POLICY "property_shares_insert" ON property_shares
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "property_shares_select" ON property_shares;
CREATE POLICY "property_shares_select" ON property_shares
  FOR SELECT USING (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- last_minute_discounts
-- ----------------------------------------
DROP POLICY IF EXISTS "last_minute_discounts_select" ON last_minute_discounts;
CREATE POLICY "last_minute_discounts_select" ON last_minute_discounts
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "last_minute_discounts_manage" ON last_minute_discounts;
CREATE POLICY "last_minute_discounts_manage" ON last_minute_discounts
  FOR ALL TO authenticated USING (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  ) WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  );

-- ----------------------------------------
-- length_of_stay_discounts
-- ----------------------------------------
DROP POLICY IF EXISTS "length_of_stay_discounts_select" ON length_of_stay_discounts;
CREATE POLICY "length_of_stay_discounts_select" ON length_of_stay_discounts
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "length_of_stay_discounts_manage" ON length_of_stay_discounts;
CREATE POLICY "length_of_stay_discounts_manage" ON length_of_stay_discounts
  FOR ALL TO authenticated USING (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  ) WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  );

-- ----------------------------------------
-- seasonal_discounts
-- ----------------------------------------
DROP POLICY IF EXISTS "seasonal_discounts_select" ON seasonal_discounts;
CREATE POLICY "seasonal_discounts_select" ON seasonal_discounts
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "seasonal_discounts_manage" ON seasonal_discounts;
CREATE POLICY "seasonal_discounts_manage" ON seasonal_discounts
  FOR ALL TO authenticated USING (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  ) WITH CHECK (
    property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
  );

-- ----------------------------------------
-- property_damage_claims
-- ----------------------------------------
DROP POLICY IF EXISTS "property_damage_claims_select" ON property_damage_claims;
CREATE POLICY "property_damage_claims_select" ON property_damage_claims
  FOR SELECT TO authenticated USING (
    host_id = (select auth.uid()) OR guest_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "property_damage_claims_insert" ON property_damage_claims;
CREATE POLICY "property_damage_claims_insert" ON property_damage_claims
  FOR INSERT TO authenticated WITH CHECK (host_id = (select auth.uid()));

DROP POLICY IF EXISTS "property_damage_claims_guest_update" ON property_damage_claims;
CREATE POLICY "property_damage_claims_guest_update" ON property_damage_claims
  FOR UPDATE TO authenticated USING (
    guest_id = (select auth.uid()) AND status = 'pending'
  ) WITH CHECK (guest_id = (select auth.uid()));

DROP POLICY IF EXISTS "property_damage_claims_admin" ON property_damage_claims;
CREATE POLICY "property_damage_claims_admin" ON property_damage_claims
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- saved_payment_methods
-- ----------------------------------------
DROP POLICY IF EXISTS "saved_payment_methods_select" ON saved_payment_methods;
CREATE POLICY "saved_payment_methods_select" ON saved_payment_methods
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "saved_payment_methods_manage" ON saved_payment_methods;
CREATE POLICY "saved_payment_methods_manage" ON saved_payment_methods
  FOR ALL TO authenticated USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ----------------------------------------
-- booking_issues
-- ----------------------------------------
DROP POLICY IF EXISTS "booking_issues_select" ON booking_issues;
CREATE POLICY "booking_issues_select" ON booking_issues
  FOR SELECT TO authenticated USING (
    reporter_id = (select auth.uid())
    OR booking_id IN (
      SELECT id FROM bookings WHERE guest_id = (select auth.uid())
      OR property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "booking_issues_insert" ON booking_issues;
CREATE POLICY "booking_issues_insert" ON booking_issues
  FOR INSERT TO authenticated WITH CHECK (
    reporter_id = (select auth.uid())
    AND booking_id IN (
      SELECT id FROM bookings WHERE guest_id = (select auth.uid())
      OR property_id IN (SELECT id FROM properties WHERE host_id = (select auth.uid()))
    )
  );

-- ----------------------------------------
-- cancellation_policy_rules
-- ----------------------------------------
DROP POLICY IF EXISTS "cancellation_policy_rules_select" ON cancellation_policy_rules;
CREATE POLICY "cancellation_policy_rules_select" ON cancellation_policy_rules
  FOR SELECT TO public USING (true);

-- ----------------------------------------
-- scheduled_payouts
-- ----------------------------------------
DROP POLICY IF EXISTS "scheduled_payouts_select" ON scheduled_payouts;
CREATE POLICY "scheduled_payouts_select" ON scheduled_payouts
  FOR SELECT TO authenticated USING (host_id = (select auth.uid()));

-- ----------------------------------------
-- scheduled_balance_payments
-- ----------------------------------------
DROP POLICY IF EXISTS "scheduled_balance_payments_select" ON scheduled_balance_payments;
CREATE POLICY "scheduled_balance_payments_select" ON scheduled_balance_payments
  FOR SELECT TO authenticated USING (guest_id = (select auth.uid()));

-- ----------------------------------------
-- content_reports
-- ----------------------------------------
DROP POLICY IF EXISTS "content_reports_insert" ON content_reports;
CREATE POLICY "content_reports_insert" ON content_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = (select auth.uid()));

DROP POLICY IF EXISTS "content_reports_select_own" ON content_reports;
CREATE POLICY "content_reports_select_own" ON content_reports
  FOR SELECT TO authenticated USING (reporter_id = (select auth.uid()));

DROP POLICY IF EXISTS "content_reports_admin" ON content_reports;
CREATE POLICY "content_reports_admin" ON content_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- flagged_content
-- ----------------------------------------
DROP POLICY IF EXISTS "flagged_content_admin" ON flagged_content;
CREATE POLICY "flagged_content_admin" ON flagged_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- user_warnings
-- ----------------------------------------
DROP POLICY IF EXISTS "user_warnings_select" ON user_warnings;
CREATE POLICY "user_warnings_select" ON user_warnings
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_warnings_update" ON user_warnings;
CREATE POLICY "user_warnings_update" ON user_warnings
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ----------------------------------------
-- enforcement_actions
-- ----------------------------------------
DROP POLICY IF EXISTS "enforcement_actions_select" ON enforcement_actions;
CREATE POLICY "enforcement_actions_select" ON enforcement_actions
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

-- ----------------------------------------
-- blocked_patterns
-- ----------------------------------------
DROP POLICY IF EXISTS "blocked_patterns_select" ON blocked_patterns;
CREATE POLICY "blocked_patterns_select" ON blocked_patterns
  FOR SELECT TO authenticated USING (is_active = TRUE);

-- ----------------------------------------
-- report_cooldowns
-- ----------------------------------------
DROP POLICY IF EXISTS "report_cooldowns_select" ON report_cooldowns;
CREATE POLICY "report_cooldowns_select" ON report_cooldowns
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

-- ----------------------------------------
-- admin_audit_log
-- ----------------------------------------
DROP POLICY IF EXISTS "admin_audit_log_select" ON admin_audit_log;
CREATE POLICY "admin_audit_log_select" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_audit_log_insert" ON admin_audit_log;
CREATE POLICY "admin_audit_log_insert" ON admin_audit_log
  FOR INSERT WITH CHECK (true);

-- ----------------------------------------
-- route_likes
-- ----------------------------------------
DROP POLICY IF EXISTS "route_likes_select" ON route_likes;
CREATE POLICY "route_likes_select" ON route_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "route_likes_insert" ON route_likes;
CREATE POLICY "route_likes_insert" ON route_likes
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "route_likes_delete" ON route_likes;
CREATE POLICY "route_likes_delete" ON route_likes
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- route_favorites
-- ----------------------------------------
DROP POLICY IF EXISTS "route_favorites_select" ON route_favorites;
CREATE POLICY "route_favorites_select" ON route_favorites
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "route_favorites_insert" ON route_favorites;
CREATE POLICY "route_favorites_insert" ON route_favorites
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "route_favorites_delete" ON route_favorites;
CREATE POLICY "route_favorites_delete" ON route_favorites
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- route_hazards
-- ----------------------------------------
DROP POLICY IF EXISTS "route_hazards_select" ON route_hazards;
CREATE POLICY "route_hazards_select" ON route_hazards
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "route_hazards_insert" ON route_hazards;
CREATE POLICY "route_hazards_insert" ON route_hazards
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "route_hazards_update" ON route_hazards;
CREATE POLICY "route_hazards_update" ON route_hazards
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "route_hazards_delete" ON route_hazards;
CREATE POLICY "route_hazards_delete" ON route_hazards
  FOR DELETE USING (
    (select auth.uid()) = reported_by_user_id
    OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- route_shares
-- ----------------------------------------
DROP POLICY IF EXISTS "route_shares_insert" ON route_shares;
CREATE POLICY "route_shares_insert" ON route_shares
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "route_shares_select" ON route_shares;
CREATE POLICY "route_shares_select" ON route_shares
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- user_referral_rewards
-- ----------------------------------------
DROP POLICY IF EXISTS "user_referral_rewards_select" ON user_referral_rewards;
CREATE POLICY "user_referral_rewards_select" ON user_referral_rewards
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "user_referral_rewards_admin" ON user_referral_rewards;
CREATE POLICY "user_referral_rewards_admin" ON user_referral_rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- warning_clear_votes
-- ----------------------------------------
DROP POLICY IF EXISTS "warning_clear_votes_select" ON warning_clear_votes;
CREATE POLICY "warning_clear_votes_select" ON warning_clear_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "warning_clear_votes_insert" ON warning_clear_votes;
CREATE POLICY "warning_clear_votes_insert" ON warning_clear_votes
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "warning_clear_votes_delete" ON warning_clear_votes;
CREATE POLICY "warning_clear_votes_delete" ON warning_clear_votes
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ----------------------------------------
-- waypoint_photos
-- ----------------------------------------
DROP POLICY IF EXISTS "waypoint_photos_select" ON waypoint_photos;
CREATE POLICY "waypoint_photos_select" ON waypoint_photos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "waypoint_photos_insert" ON waypoint_photos;
CREATE POLICY "waypoint_photos_insert" ON waypoint_photos
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "waypoint_photos_delete" ON waypoint_photos;
CREATE POLICY "waypoint_photos_delete" ON waypoint_photos
  FOR DELETE USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM routes WHERE routes.id = waypoint_photos.route_id AND routes.owner_user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM users WHERE id = (select auth.uid()) AND role = 'admin')
  );

-- ----------------------------------------
-- waypoint_suggestions
-- ----------------------------------------
DROP POLICY IF EXISTS "waypoint_suggestions_select" ON waypoint_suggestions;
CREATE POLICY "waypoint_suggestions_select" ON waypoint_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM routes
      WHERE routes.id = waypoint_suggestions.route_id
      AND (routes.is_public = true OR routes.owner_user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "waypoint_suggestions_insert" ON waypoint_suggestions;
CREATE POLICY "waypoint_suggestions_insert" ON waypoint_suggestions
  FOR INSERT WITH CHECK (
    (select auth.uid()) = user_id AND
    EXISTS (SELECT 1 FROM routes WHERE routes.id = waypoint_suggestions.route_id AND routes.is_public = true)
  );

DROP POLICY IF EXISTS "waypoint_suggestions_update" ON waypoint_suggestions;
CREATE POLICY "waypoint_suggestions_update" ON waypoint_suggestions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM routes WHERE routes.id = waypoint_suggestions.route_id AND routes.owner_user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "waypoint_suggestions_delete" ON waypoint_suggestions;
CREATE POLICY "waypoint_suggestions_delete" ON waypoint_suggestions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM routes WHERE routes.id = waypoint_suggestions.route_id AND routes.owner_user_id = (select auth.uid()))
  );

-- ----------------------------------------
-- waypoint_edit_suggestions
-- ----------------------------------------
DROP POLICY IF EXISTS "waypoint_edit_suggestions_select" ON waypoint_edit_suggestions;
CREATE POLICY "waypoint_edit_suggestions_select" ON waypoint_edit_suggestions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM route_waypoints
      JOIN routes ON routes.id = route_waypoints.route_id
      WHERE route_waypoints.id = waypoint_edit_suggestions.waypoint_id
      AND (routes.is_public = true OR routes.owner_user_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "waypoint_edit_suggestions_insert" ON waypoint_edit_suggestions;
CREATE POLICY "waypoint_edit_suggestions_insert" ON waypoint_edit_suggestions
  FOR INSERT WITH CHECK (
    (select auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM route_waypoints
      JOIN routes ON routes.id = route_waypoints.route_id
      WHERE route_waypoints.id = waypoint_edit_suggestions.waypoint_id
      AND routes.is_public = true
      AND routes.owner_user_id != (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "waypoint_edit_suggestions_update" ON waypoint_edit_suggestions;
CREATE POLICY "waypoint_edit_suggestions_update" ON waypoint_edit_suggestions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM route_waypoints
      JOIN routes ON routes.id = route_waypoints.route_id
      WHERE route_waypoints.id = waypoint_edit_suggestions.waypoint_id
      AND routes.owner_user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "waypoint_edit_suggestions_delete" ON waypoint_edit_suggestions;
CREATE POLICY "waypoint_edit_suggestions_delete" ON waypoint_edit_suggestions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM route_waypoints
      JOIN routes ON routes.id = route_waypoints.route_id
      WHERE route_waypoints.id = waypoint_edit_suggestions.waypoint_id
      AND routes.owner_user_id = (select auth.uid())
    )
  );

-- ----------------------------------------
-- notifications
-- ----------------------------------------
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE USING (true);

-- ----------------------------------------
-- route_variants
-- ----------------------------------------
DROP POLICY IF EXISTS "route_variants_select" ON route_variants;
CREATE POLICY "route_variants_select" ON route_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM routes WHERE routes.id = route_variants.route_a_id AND (routes.is_public = true OR routes.owner_user_id = (select auth.uid())))
    OR EXISTS (SELECT 1 FROM routes WHERE routes.id = route_variants.route_b_id AND (routes.is_public = true OR routes.owner_user_id = (select auth.uid())))
  );

DROP POLICY IF EXISTS "route_variants_insert" ON route_variants;
CREATE POLICY "route_variants_insert" ON route_variants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM routes WHERE routes.id = route_variants.route_a_id AND routes.owner_user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM routes WHERE routes.id = route_variants.route_b_id AND routes.owner_user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "route_variants_delete" ON route_variants;
CREATE POLICY "route_variants_delete" ON route_variants
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM routes WHERE routes.id = route_variants.route_a_id AND routes.owner_user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM routes WHERE routes.id = route_variants.route_b_id AND routes.owner_user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM users WHERE users.id = (select auth.uid()) AND users.role = 'admin')
  );


-- ============================================
-- STEP 4: FIX MODERATION QUEUE VIEW
-- ============================================
-- Change from SECURITY DEFINER (default) to SECURITY INVOKER
-- This prevents privilege escalation through the view

CREATE OR REPLACE VIEW moderation_queue
WITH (security_invoker = true)
AS
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

COMMENT ON VIEW moderation_queue IS 'Unified admin view of pending moderation items (security invoker)';


-- ============================================
-- DONE
-- ============================================
-- Summary:
--   - RLS enabled on all 71 tables
--   - ~170 policies recreated with (select auth.uid()) for performance
--   - Duplicate/overlapping policies on properties table consolidated
--   - moderation_queue view fixed to SECURITY INVOKER
--   - property_facilities and property_equine now have proper RLS policies
