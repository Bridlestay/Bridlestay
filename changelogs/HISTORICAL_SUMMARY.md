# Historical Summary of Bridlestay/Cantra Development

**Generated:** 2026-01-16  
**Purpose:** Comprehensive record of all features and changes implemented before changelog system was established  
**Note:** This is a reconstructed summary based on codebase analysis, not a real-time changelog

---

## 📊 Project Overview

**Project Name:** Bridlestay (also referred to as Cantra)  
**Type:** Equestrian accommodation marketplace (UK-focused)  
**Stack:** Next.js 14 + TypeScript + Supabase + Stripe + Tailwind CSS  
**Database:** Supabase (PostgreSQL with Row-Level Security)  
**Payments:** Stripe Connect Standard  

---

## 🏗️ Phase 1: Foundation (Migrations 001-006)

### Migration 001: Initial Schema
**Core tables established:**
- `users` - User profiles (extends Supabase auth) with roles: guest, host, admin
- `host_profiles` - Stripe Connect tracking for hosts
- `properties` - Property listings with pricing, location, capacity
- `property_facilities` - Original facilities table (later replaced)
- `property_photos` - Property image URLs with sort order
- `availability_blocks` - Date blocking system
- `bookings` - Core booking table with fee breakdown (all in pennies)
- `reviews` - Guest reviews with 1-5 star ratings
- `host_replies` - Host responses to reviews
- `routes` - Riding routes with terrain info
- `route_pins` - Points of interest on routes

**Key decisions:**
- All money stored in **pennies** (integer) to avoid floating point issues
- Roles: `guest`, `host`, `admin`
- UK-only focus initially

### Migration 002: RLS Policies
- Enabled Row Level Security on all tables
- Guests can view properties, create bookings/reviews
- Hosts can manage their own properties and booking approvals
- Admins have full access via role check

### Migration 003: User Profile Fields
- Added `avatar_url`, `bio`, `occupation`, `school`
- Added `favourite_song`, `fun_fact`, `dream_destination`
- Added `verified` boolean for user verification

### Migration 004: Property Amenities & Equine Facilities
- Created `property_amenities` table (1:1 with properties)
  - Kitchen amenities: wifi, heating, oven, fridge, dishwasher, etc.
  - Bathroom: shower, bathtub, hairdryer
  - Safety: smoke alarm, CO alarm, first aid
  - Family/Pet: cot, high_chair, pets_allowed
  
- Created `property_equine` table (1:1 with properties)
  - Capacity: max_horses, stable_count
  - Stabling: bedding types, forage, feed
  - Turnout: paddock size, fencing, shelter
  - Riding: arena (indoor/outdoor), surface types, jumps
  - Care: wash bay, tack room, quarantine stable
  - Access: bridleway access, trailer/lorry parking

- Added property fields: bedrooms, beds, bathrooms, check-in/out times
- Added pricing: per_horse_fee_pennies, cleaning_fee_pennies, min/max nights

### Migration 005: Guests & Horses on Bookings
- Added `guests` and `horses` columns to bookings table
- Tracks how many people and horses per booking

### Migration 006: Arena Fields & Verification
- Split arena fields: indoor/outdoor dimensions, surface types
- Added user verification: `email_verified`, `admin_verified`, `verified_at`
- Added property verification: `admin_verified`, `verified_at`

---

## 💬 Phase 2: Communication (Migrations 007-016)

### Migration 007: Favorites System
- Created `favorites` table (user_id, property_id)
- Users can save/unsave properties
- Added to property cards and search results

### Migration 008: Property Types
- Added `property_type` field to properties
- Types: cottage, farmhouse, stable_yard, field_only, etc.

### Migration 009: Stable Dimensions
- Added detailed stable dimension fields
- Width, length, height tracking

### Migration 010: Messaging & Q&A System
- **Messages table:** Private communication between users
  - sender_id, recipient_id, property_id (optional)
  - Subject, message body, read status
  - Response time tracking on users
  
- **Property Questions table:** Public Q&A on listings
  - Questions visible to all (when answered)
  - Only asker/host see unanswered questions
  - Host can answer and delete questions

- Functions: `get_unread_message_count()`, response time calculation

### Migrations 011-016: Moderation & Fixes
- **011:** Allow hosts to delete questions on their properties
- **012:** Message moderation system with flagged_messages table
  - Auto-flagging for inappropriate content
  - Admin review queue
- **013:** Message deletion (soft delete)
- **014:** Question moderation with flagged_questions table
- **015:** System messages and admin actions
  - Message types: user, system, admin_action
  - Admin can send warnings via system messages
- **016:** User feedback system + policy fixes

---

## ⭐ Phase 3: Reviews & Ratings (Migration 017)

### Migration 017: Reviews and Ratings System
- **Property Reviews table:**
  - Overall rating (1-5 stars, required)
  - Category ratings: cleanliness, accuracy, communication, location, value
  - Equestrian-specific: stable_quality, turnout_quality
  - Review text and host response
  - One review per booking per guest

- **User Reviews table:** (Mutual review system)
  - Hosts review guests after stays
  - Ratings: overall, communication, cleanliness, respect
  - "Would recommend" boolean

- **Automatic calculations:**
  - `average_rating` and `review_count` on properties table
  - `average_rating` and `review_count` on users table
  - Triggers update these automatically

---

## 💰 Phase 4: Pricing & Availability (Migration 018)

### Migration 018: Pricing and Availability
- Added pricing fields to properties
- Availability management enhancements
- Restrict listings to hosts only (role check on property creation)

---

## 🗺️ Phase 5: Routes System (Migrations 019-020)

### Migration 019: Complete Routes System
- **Routes table (enhanced):**
  - Owner tracking (user can own routes)
  - GeoJSON geometry storage for route paths
  - Terrain tags array
  - Difficulty: easy, medium, hard
  - Seasonal notes, surface type
  - Near property linking
  - Public/private visibility
  - Featured flag
  - Stats: avg_rating, review_count, photos_count, comments_count

- **Route photos:** User-uploaded photos with captions
- **Route waypoints:** POIs along routes (viewpoint, water, hazard, pub, gate, etc.)
- **Route comments:** Discussion threads with nested replies
- **Route comment flags:** Moderation system
- **Route reviews:** Star ratings + written reviews

- Auto-updating triggers for counts and ratings

### Migration 020: Route Enhancements & Foreign Key Fixes
- Fixed FK relationships between routes and users
- Enhanced route enhancements

---

## 📋 Phase 6: Booking Improvements (Migrations 021-028)

### Migration 021: Review Time Limits
- Reviews can only be edited within 7 days
- Reviews can only be submitted after checkout

### Migration 022: Booking Constraints & Conflict Prevention
- Prevent double-booking of same dates
- Overlap detection for availability blocks and bookings

### Migration 023: User Horses System
- **user_horses table:**
  - Basic: name, photo, breed, DOB, age, gender, color/markings
  - Physical: height (hands), weight (kg)
  - Health: dietary requirements, medical conditions, medications, vaccination date
  - Behavior: temperament, notes, turnout preferences
  - Experience: level, disciplines array
  - Emergency: vet contact, farrier contact
  - Quick facts array

- **booking_horses junction table:**
  - Links horses to bookings
  - Special notes per booking

- Hosts can view horses for their bookings
- Privacy controls for horse information

### Migration 024: Horse Photos Storage
- Storage bucket for horse photos
- Photo upload and management

### Migration 025: Horse Privacy
- Privacy controls for horse health information
- Visibility settings

### Migration 026: Property Management Features
- Enhanced property management for hosts
- Additional fields and controls

### Migration 027: Profile About Me Fields
- Extended user profile fields
- About me sections

### Migration 028: Booking Cancellations
- Added `cancellation_reason`, `cancelled_at`, `refund_amount_pennies`
- Added `review_reminder_sent` timestamp

---

## 📧 Phase 7: Emails & Notifications (Migration 029)

### Migration 029: Welcome Email Tracking
- Track when welcome emails are sent
- Prevent duplicate sends

### Email System Implementation
**Templates created (React Email):**
1. `booking-confirmation.tsx` - Guest booking confirmation
2. `booking-request-host.tsx` - Host receives booking request
3. `booking-cancelled-guest.tsx` - Guest cancellation notification
4. `booking-cancelled-host.tsx` - Host cancellation notification
5. `review-reminder.tsx` - Post-stay review reminder
6. `welcome-email.tsx` - New user welcome
7. `new-message.tsx` - Message notification

**Email service:** Resend integration

---

## 📷 Phase 8: Route Photos & Performance (Migrations 030-031)

### Migration 030: Route User Photos
- Users can upload photos to routes
- Photo moderation and approval

### Migration 031: Performance Indexes
- Added database indexes for common queries
- Improved search and listing performance

---

## ✅ Phase 9: Verification System (Migration 035)

### Migration 035: Verification System
- **user_verifications table:**
  - Types: identity, phone, email
  - Status: pending, processing, verified, failed, expired
  - Methods: stripe_identity, manual, auto
  - Stripe verification session tracking

- **emergency_contacts table:**
  - User emergency contacts with relationship
  - Primary contact flag

- **property_verifications table:**
  - Types: address, photos, facilities, in_person
  - Admin review workflow
  - Proof photos storage

- User verification fields: identity_verified, phone_verified, email_verified
- Property verification fields: address_verified, photos_verified

---

## 📰 Phase 10: News & Blog (Migration 036)

### Migration 036: News Blog System
- **news_posts table:**
  - Title, slug (auto-generated), excerpt, content
  - Cover image, author
  - Categories: announcement, feature, update, community, tips, event
  - Status: draft, published, archived
  - Views count, featured flag, tags array
  - SEO description

- Auto-publish timestamp on status change
- Admin-only management

---

## 🛤️ Phase 11: Public Paths & Routes Rework (Migration 037)

### Migration 037: Public Paths and Route Rework
- Enhanced routes system
- Public path integration
- Route data improvements

---

## 📸 Phase 12: Facility Photos & Verification (Migration 038)

### Migration 038: Facility Photos and Verification
- Photo verification system for facilities
- Admin approval workflow

---

## 🏠 Phase 13: Property Types & Referrals (Migrations 039-045)

### Migration 039: Expanded Property Types
- Additional property type options
- More granular categorization

### Migration 040: Referral System
- **referral_codes table:**
  - Code types: user_referral, promo, influencer, partner
  - Benefits: guest_fee_discount, host_fee_waiver, fixed_credit
  - Usage limits and validity dates
  - Referrer rewards

- **referral_redemptions table:**
  - Tracks code usage
  - Benefit tracking and expiry

- **referrer_rewards table:**
  - Rewards earned by referrers
  - Status: pending, credited, expired

- **user_credits table:**
  - Credit balance system
  - Types: referral_bonus, promo_credit, refund, compensation

- Function: `generate_user_referral_code()`
- Function: `calculate_referral_discount()`

### Migration 041: Badge System
- User achievement badges
- Automatic badge awarding

### Migrations 042-045: RLS Fixes & Badge Triggers
- Fixed referral RLS policies
- Added missing badge triggers
- Referral settings
- User stats RLS fixes

---

## 🐴 Phase 14: Booking Horse Fixes (Migration 046)

### Migration 046: Fix Booking Max Horses
- Fixed max horses calculation for bookings
- Property equine data as authoritative source

---

## 📤 Phase 15: Sharing & Tracking (Migration 047)

### Migration 047: Property Shares Tracking
- **property_shares table:**
  - Track shares by platform (facebook, twitter, email, etc.)
  - User attribution (optional)
  - Share counts on properties

---

## 💵 Phase 16: Advanced Pricing & Damage Claims (Migration 048)

### Migration 048: Advanced Pricing and Damage Claims
- **Split cleaning fees:**
  - house_cleaning_fee_pennies
  - stable_cleaning_fee_pennies

- **Extra guest fees:**
  - extra_guest_fee_pennies
  - base_guests_included

- **Discount settings:**
  - allow_discount_stacking
  - max_discount_cap
  - first_time_rider_discount

- **last_minute_discounts table:**
  - Up to 3 tiered rules per property
  - Days before check-in threshold
  - Discount percentage

- **length_of_stay_discounts table:**
  - Min nights to qualify
  - Discount percentage

- **seasonal_discounts table:**
  - Date range based
  - Percentage or price override

- **property_damage_claims table:**
  - Types: damage, excessive_cleaning, both
  - Status workflow: pending → guest_accepted/disputed → under_review → approved/rejected → paid
  - 48-hour claim window after checkout
  - Evidence URLs (photos)
  - Admin review

- **saved_payment_methods table:**
  - For off-session damage charges
  - Card details for display

- Function: `calculate_best_discount()`

---

## 💳 Phase 17: Payments, Cancellations & Refunds (Migration 049)

### Migration 049: Payments, Cancellations & Refunds
- **Enhanced bookings table:**
  - payment_status: pending, deposit_paid, fully_paid, refunded, etc.
  - payout_status: pending, held, released, cancelled, clawed_back
  - Split payment tracking: deposit/balance amounts and dates
  - Resolution window tracking (48 hours post check-in)
  - Cancellation tracking with refund info

- **booking_issues table:**
  - Post check-in issue reporting
  - Types: misrepresentation, cleanliness, safety, access_denied, etc.
  - Resolution workflow

- **cancellation_policy_rules table:**
  - Three policies: flexible, standard, strict
  - Rule definitions in JSON

- **scheduled_payouts table:**
  - Host payout scheduling
  - Status tracking

- **scheduled_balance_payments table:**
  - Split payment balance collection
  - For bookings >60 days out

- Functions:
  - `calculate_refund_amount()`
  - `is_within_resolution_window()`
  - `needs_split_payment()`

---

## 🛡️ Phase 18: Moderation System (Migration 050)

### Migration 050: Comprehensive Moderation System
- **User trust scores:**
  - trust_score (0-100)
  - trust_level: new, standard, trusted, verified, moderator
  - Behavior tracking: warnings, accurate/false reports

- **content_reports table:**
  - User-submitted reports
  - Content types: review, message, property, route, comment, photo, profile
  - Report reasons: spam, harassment, hate_speech, off_platform_payment, etc.
  - Status workflow with admin review

- **flagged_content table:**
  - Auto-moderation results
  - Risk scores
  - Matched patterns

- **moderation_queue view:**
  - Unified admin view
  - Priority sorting

- **user_warnings table:**
  - Educational warnings
  - Severity levels
  - Acknowledgement tracking

- **enforcement_actions table:**
  - Warning to permanent ban range
  - Temporary/permanent actions
  - Lift tracking

- **blocked_patterns table:**
  - Auto-detection patterns
  - Types: exact, contains, regex, phone, email, url
  - Categories: off_platform_payment, contact_info, profanity, etc.

- **report_cooldowns table:**
  - Rate limiting for reports

- Functions:
  - `calculate_trust_level()`
  - `update_user_trust_score()`
  - `can_user_report()`

---

## 🔐 Security Features Implemented

### Input Validation & Sanitization (`lib/sanitize.ts`)
- `stripHtml()` - Remove HTML tags
- `escapeHtml()` - Escape special characters
- `sanitizeText()` - Clean for storage
- `sanitizeMultilineText()` - Preserve line breaks safely
- `sanitizeUrl()` - Only allow safe protocols
- `sanitizeName()` - Clean usernames
- `sanitizeEmail()` - Normalize email
- `containsScriptInjection()` - XSS detection

### File Validation (`lib/file-validation.ts`)
- MIME type validation
- File extension validation
- Size limits (10MB images, 5MB avatars)
- Sanitized filenames

### Rate Limiting (`lib/rate-limit.ts`)
- Per-endpoint rate limits
- Auth: 10 requests / 15 minutes
- Password reset: 3 / hour
- General API: 100 / minute
- Booking: 20 / minute
- Messages: 30 / minute
- Upload: 50 / hour
- Search: 60 / minute

### Content Moderation (`lib/moderation.ts` & `lib/moderation-enhanced.ts`)
- Profanity detection
- Off-platform payment detection
- Contact info detection (phone, email)
- Leetspeak detection
- Auto-blocking and flagging

---

## 📁 Key Library Files

| File | Purpose |
|------|---------|
| `lib/fees.ts` | Fee calculations (9.5% guest, 2.5% host) - **AUTHORITATIVE** |
| `lib/fees.test.ts` | Fee calculation tests |
| `lib/stripe.ts` | Stripe client initialization |
| `lib/sanitize.ts` | Input sanitization |
| `lib/rate-limit.ts` | API rate limiting |
| `lib/moderation.ts` | Content moderation |
| `lib/file-validation.ts` | Upload validation |
| `lib/geocode.ts` | Location geocoding |
| `lib/cache.ts` | Caching utilities |
| `lib/types.ts` | TypeScript types |

---

## 🎨 UI Components

### Core Components
- `components/booking-form.tsx` - Booking flow
- `components/search-bar.tsx` - Property search
- `components/search-filters.tsx` - Advanced filters
- `components/property-card.tsx` - Property listing cards
- `components/image-gallery.tsx` - Photo galleries
- `components/header.tsx` / `components/footer.tsx`

### Feature Components
- `components/reviews/*` - Review system (8 components)
- `components/routes/*` - Routes system (13 components)
- `components/messaging/*` - Messaging (3 components)
- `components/host/*` - Host management (12 components)
- `components/admin/*` - Admin dashboard (11 components)
- `components/profile/*` - User profiles (11 components)
- `components/booking/*` - Booking components (4 components)
- `components/damage-claims/*` - Claims system (3 components)

### UI Library (`components/ui/`)
- 33 shadcn/ui components
- Buttons, inputs, dialogs, cards, tables, etc.

---

## 📧 Email Templates

| Template | Trigger |
|----------|---------|
| Booking Confirmation | Host accepts booking |
| Booking Request | Guest submits request |
| Cancellation (Guest) | Guest cancels |
| Cancellation (Host) | Host declines |
| Review Reminder | 24h after checkout (cron) |
| Welcome Email | User signup |
| Message Notification | New message received |

---

## 🔧 API Endpoints (112 routes)

### Booking (`/api/booking/`)
- `request/` - Create booking request
- `accept/` - Host accepts
- `decline/` - Host declines
- `cancel/` - Guest cancels
- `payment/` - Payment processing
- `issues/` - Post check-in issues

### Host (`/api/host/`)
- Property management
- Stripe Connect onboarding
- Earnings and payouts

### Reviews (`/api/reviews/`)
- Property reviews
- User reviews
- Guest/host submission

### Routes (`/api/routes/`)
- Route CRUD
- Photos, waypoints, comments
- Reviews

### Admin (`/api/admin/`)
- User management
- Moderation queue
- Analytics
- Actions (ban, softban, etc.)

### Messages (`/api/messages/`)
- Send messages
- Conversations
- Mark read

---

## 📊 Current Fee Structure

**Confirmed as of 2026-01-16:**
- **Guest Fee:** 9.5% of base price (capped at £150)
- **Host Fee:** 2.5% of base price
- **VAT:** 20% on service fees only

**Source of truth:** `lib/fees.ts`

---

## 📝 Documentation Files

- `README.md` - Setup and overview
- `PROJECT_SUMMARY.md` - Feature summary
- `FEATURE_IMPLEMENTATION_STATUS.md` - Progress tracking
- `SETUP_INSTRUCTIONS.md` - Detailed setup
- `docs/EMAIL_NOTIFICATIONS_COMPLETE.md` - Email system
- `docs/VERIFICATION_SYSTEM_PLAN.md` - Verification roadmap
- `docs/ROUTES_SYSTEM_V2.md` - Routes documentation
- Various summary and guide files

---

## ⚠️ Known Issues / Technical Debt

1. **README.md outdated** - Shows old fee rates (12.5% instead of 9.5%)
2. **PROJECT_SUMMARY.md outdated** - Shows old fee rates
3. **Search API** - Client-side filtering could be moved to SQL at scale
4. **Some APIs** - Could use more "WHY" comments

---

## 📅 Changelog System Established

**Date:** 2026-01-16  
**Location:** `/changelogs/`  
**Rule:** Rule 13 added to `.cursor/rules/custom-rule.mdc`

From this point forward, all changes will be documented in dated changelog files.

---

*This historical summary was reconstructed from codebase analysis on 2026-01-16.*
*Future changes will have real-time changelogs.*

