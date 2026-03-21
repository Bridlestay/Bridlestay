-- ============================================
-- Migration 082: Drop Unused & Deprecated Tables
-- ============================================
-- Removes 11 tables that are either:
--   1. Deprecated (replaced by newer tables)
--   2. Never referenced in application code
--
-- Original schemas preserved in docs/dropped-tables-reference.md
-- All drops use IF EXISTS for safety.
-- CASCADE drops dependent policies, triggers, etc.
-- ============================================

-- ----------------------------------------
-- DEPRECATED TABLES (replaced by newer ones)
-- ----------------------------------------

-- reviews → replaced by property_reviews + user_reviews
DROP TABLE IF EXISTS reviews CASCADE;

-- host_replies → replaced by host_response column on property_reviews
DROP TABLE IF EXISTS host_replies CASCADE;

-- route_pins → replaced by route_waypoints + route_hazards
DROP TABLE IF EXISTS route_pins CASCADE;

-- ----------------------------------------
-- UNUSED TABLES (never referenced in app code)
-- ----------------------------------------

-- route_recordings — GPS recording storage, frontend never built
DROP TABLE IF EXISTS route_recordings CASCADE;

-- referrer_rewards — referral system uses referral_codes + referral_redemptions instead
DROP TABLE IF EXISTS referrer_rewards CASCADE;

-- user_credits — never integrated with booking/payment
DROP TABLE IF EXISTS user_credits CASCADE;

-- saved_payment_methods — Stripe handles via Customer objects
DROP TABLE IF EXISTS saved_payment_methods CASCADE;

-- blocked_patterns — moderation uses inline checks, not DB patterns
DROP TABLE IF EXISTS blocked_patterns CASCADE;

-- report_cooldowns — rate limiting handled by lib/rate-limit.ts
DROP TABLE IF EXISTS report_cooldowns CASCADE;

-- user_referral_rewards — duplicate concept of referrer_rewards, never used
DROP TABLE IF EXISTS user_referral_rewards CASCADE;

-- ============================================
-- DONE — 11 tables dropped
-- ============================================
-- See docs/dropped-tables-reference.md for original schemas
