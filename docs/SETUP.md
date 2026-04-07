# BridleStay Setup Guide

This guide will walk you through setting up BridleStay locally.

## Prerequisites

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **npm** - Comes with Node.js
3. **Supabase Account** - [Sign up](https://supabase.com/)
4. **Stripe Account** - [Sign up](https://stripe.com/) (use test mode)
5. **Git** - For version control

## Step 1: Clone and Install

```bash
# Clone the repository (if using git)
git clone <your-repo-url>
cd BridleStay

# Install dependencies
npm install
```

## Step 2: Supabase Setup

### Create Project

1. Go to [https://app.supabase.com/](https://app.supabase.com/)
2. Click "New project"
3. Fill in project details
4. Wait for project to be created (2-3 minutes)

### Run Migrations

1. Go to SQL Editor in Supabase Dashboard
2. Create a new query
3. Copy contents of `supabase/migrations/001_initial_schema.sql`
4. Run the query
5. Repeat for `002_rls_policies.sql`
6. (Optional) Run `seed.sql` for demo routes data

### Create Storage Bucket

1. Go to Storage in Supabase Dashboard
2. Click "New bucket"
3. Name: `property_photos`
4. Public bucket: **Yes**
5. Create bucket

### Get API Keys

1. Go to Project Settings → API
2. Copy:
   - Project URL (looks like `https://xxx.supabase.co`)
   - `anon` public key
   - `service_role` key (keep this secret!)

## Step 3: Stripe Setup

### Create Account

1. Sign up at [https://stripe.com/](https://stripe.com/)
2. Switch to **Test mode** (toggle in top right)

### Enable Connect

1. Go to Connect → Settings
2. Enable Connect (if not already enabled)
3. Configure branding (optional)

### Get API Keys

1. Go to Developers → API keys
2. Copy:
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)

### Set up Webhooks (for local development)

#### Option A: Stripe CLI (Recommended)

```bash
# Install Stripe CLI
# Windows: Download from https://github.com/stripe/stripe-cli/releases
# Mac: brew install stripe/stripe-tap/stripe
# Linux: See https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook secret (starts with whsec_) shown in terminal
```

#### Option B: Dashboard Webhooks (for deployed sites)

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
5. Add endpoint
6. Copy webhook signing secret

## Step 4: Environment Variables

Create `.env.local` in project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Maps (REQUIRED for Routes)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# Optional: Resend (for emails)
RESEND_API_KEY=re_...

# Optional: Plausible (for analytics)
PLAUSIBLE_DOMAIN=cantra.app
```

## Step 5: Run the App

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

## Step 6: Create Test Accounts

### Create Host Account

1. Go to [http://localhost:3000/auth/sign-up](http://localhost:3000/auth/sign-up)
2. Fill in details
3. Select "Host properties"
4. Sign up
5. Check email for verification link

### Create Guest Account

1. Sign out
2. Go to sign up again
3. Select "Book stays"
4. Complete sign up

### Test Stripe Connect (Host)

1. Sign in as host
2. Go to Dashboard
3. Click "Connect Stripe Account"
4. Fill in test information:
   - Country: United Kingdom
   - Business type: Individual
   - Use test data (Stripe provides this in test mode)
5. Complete onboarding

## Step 7: Add a Test Property

1. Sign in as host
2. Note: Property creation UI needs to be implemented or use SQL directly

**Via SQL (Supabase SQL Editor):**

```sql
-- Get your host user ID first
SELECT id, name FROM users WHERE role = 'host';

-- Insert test property (replace YOUR_HOST_ID)
INSERT INTO properties (
  host_id,
  name,
  description,
  address_line,
  city,
  county,
  postcode,
  country,
  nightly_price_pennies,
  max_guests,
  max_horses
) VALUES (
  'YOUR_HOST_ID',
  'Cotswold Cottage & Stables',
  'Beautiful countryside cottage with private stables and paddock. Perfect for a relaxing getaway with your horses.',
  '123 Country Lane',
  'Bourton-on-the-Water',
  'Gloucestershire',
  'GL54 2AB',
  'UK',
  20000,  -- £200/night
  4,      -- 4 guests
  2       -- 2 horses
);

-- Add facilities
INSERT INTO property_facilities (
  property_id,
  has_stables,
  stable_count,
  has_paddock,
  paddock_size_acres,
  has_arena,
  trailer_parking,
  water_access,
  notes
) VALUES (
  (SELECT id FROM properties ORDER BY created_at DESC LIMIT 1),
  true,
  2,
  true,
  3.5,
  false,
  true,
  true,
  'Well-maintained facilities with regular maintenance'
);
```

## Step 8: Test Booking Flow

1. Sign out, sign in as guest
2. Search for properties
3. Select the test property
4. Choose dates
5. Request to book
6. Use Stripe test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
7. Submit booking

8. Sign out, sign in as host
9. View booking requests in dashboard
10. Accept booking
11. Payment should be captured automatically

## Troubleshooting

### "Database error" or RLS issues

- Make sure all migrations ran successfully
- Check Supabase logs in Dashboard → Database → Logs
- Verify RLS policies are enabled

### "Stripe error: No such payment_intent"

- Make sure webhook secret is correct
- If using Stripe CLI, ensure it's running
- Check webhook events in Stripe Dashboard → Developers → Webhooks

### "Module not found" errors

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### TypeScript errors

```bash
# Regenerate types
npm run build
```

## Next Steps

- Deploy to Vercel (see README.md)
- Set up production Stripe webhooks
- Configure email notifications with Resend
- Add Mapbox token for interactive maps
- Customize branding and copy

## Need Help?

Check the main README.md for more detailed documentation.



