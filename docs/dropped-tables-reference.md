# Dropped Tables Reference — Migration 082

These tables were dropped in migration 082 on 2026-03-21 because they are unused in app code. Their original schema definitions are preserved here for reference. If any need to be recreated, copy the relevant CREATE TABLE from the original migration files listed below.

## Deprecated Tables (replaced by newer tables)

### `reviews` — Original: `supabase/migrations/002_rls_policies.sql`
Replaced by `property_reviews` and `user_reviews` (migration 030+).
```sql
-- Original schema from migration 001:
-- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- property_id UUID REFERENCES properties(id)
-- booking_id UUID REFERENCES bookings(id)
-- guest_id UUID REFERENCES users(id)
-- rating INTEGER CHECK (rating >= 1 AND rating <= 5)
-- comment TEXT
-- created_at TIMESTAMPTZ DEFAULT now()
```

### `host_replies` — Original: `supabase/migrations/002_rls_policies.sql`
Replaced by `host_response` column on `property_reviews`.
```sql
-- Original schema from migration 001:
-- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- review_id UUID REFERENCES reviews(id)
-- host_id UUID REFERENCES users(id)
-- reply TEXT NOT NULL
-- created_at TIMESTAMPTZ DEFAULT now()
```

### `route_pins` — Original: `supabase/migrations/015_routes.sql`
Replaced by `route_waypoints` + `route_hazards` (migrations 059+).
```sql
-- Original schema from migration 015:
-- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- route_id UUID REFERENCES routes(id)
-- lat DOUBLE PRECISION NOT NULL
-- lng DOUBLE PRECISION NOT NULL
-- pin_type TEXT DEFAULT 'info'
-- title TEXT
-- description TEXT
-- created_by UUID REFERENCES users(id)
-- created_at TIMESTAMPTZ DEFAULT now()
```

## Unused Tables (never referenced in app code)

### `route_recordings` — Original: `supabase/migrations/015_routes.sql`
GPS recording storage — feature was never built in the frontend.

### `referrer_rewards` — Original: `supabase/migrations/039_referral_system.sql`
Referrer reward tracking — referral system uses `referral_codes` + `referral_redemptions` instead.

### `user_credits` — Original: `supabase/migrations/039_referral_system.sql`
User credit balance — never integrated with booking/payment flow.

### `saved_payment_methods` — Original: `supabase/migrations/041_saved_payment_methods.sql`
Saved card storage — Stripe handles this via Customer objects instead.

### `blocked_patterns` — Original: `supabase/migrations/050_moderation_system.sql`
Text pattern blocking for moderation — moderation uses inline checks instead.

### `report_cooldowns` — Original: `supabase/migrations/050_moderation_system.sql`
Rate limiting on reports — handled by `lib/rate-limit.ts` instead.

### `user_referral_rewards` — Original: `supabase/migrations/058_referral_rewards.sql`
Duplicate of `referrer_rewards` concept — never used.

## How to Restore

1. Find the original migration file listed above
2. Copy the CREATE TABLE statement
3. Create a new migration (next number in sequence)
4. Add appropriate RLS policies
