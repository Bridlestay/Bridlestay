# BridleStay

A UK-only equestrian stays marketplace built with Next.js 14, Supabase, and Stripe Connect.

## Features

- 🏡 **Property Listings**: Host equestrian-friendly properties with detailed facilities
- 🐴 **Horse-Friendly Search**: Find stays by location, dates, and horse capacity
- 💰 **Secure Payments**: Stripe integration with host payouts via Connect
- 📅 **Booking Management**: Request-to-book flow with host approval
- ⭐ **Review System**: Post-checkout reviews with host replies
- 🗺️ **Riding Routes**: Curated trails with points of interest
- 🔒 **Row Level Security**: Supabase RLS for data protection

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (Postgres + Auth + Storage + RLS)
- **Payments**: Stripe (Standard Connect + PaymentIntents)
- **Email**: Resend (transactional emails)
- **Maps**: Mapbox GL JS (optional)
- **Testing**: Playwright (E2E)

## Business Logic

### Fee Structure

- **Guest Fee**: 12.5% of base price (capped at £150)
- **Host Fee**: 2.5% of base price
- **VAT**: 20% applied to service fees only

All amounts stored in pennies to avoid floating-point issues.

### Example Calculation

For a £200 booking:
- Base: £200.00
- Guest fee: £25.00 (12.5%)
- VAT on guest fee: £5.00 (20%)
- **Guest pays**: £230.00
- Host fee: £5.00 (2.5%)
- VAT on host fee: £1.00 (20%)
- **Host receives**: £194.00

### Booking Flow

1. Guest searches and selects dates
2. System creates PaymentIntent with **manual capture**
3. Guest enters payment details (payment held, not charged)
4. Host reviews and accepts/declines
5. On accept: Payment captured immediately (TODO: delayed capture on check-in)
6. Payout to host via Stripe Transfer
7. After checkout: Guest can leave review

## Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Stripe account (test mode)
- Resend account (optional, for emails)

### Environment Variables

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Resend (optional)
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Mapbox (optional)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...

# Plausible (optional)
PLAUSIBLE_DOMAIN=bridlestay.app
```

### Database Setup

1. Create a Supabase project
2. Run migrations in order:

```bash
# In Supabase SQL Editor
# Run: supabase/migrations/001_initial_schema.sql
# Then: supabase/migrations/002_rls_policies.sql
# Finally: supabase/seed.sql (optional demo data)
```

3. Create storage bucket for `property_photos` with public access

### Stripe Setup

1. Create a Stripe account (use test mode)
2. Enable Stripe Connect (Standard)
3. Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
4. Subscribe to events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
5. Copy webhook secret to `.env.local`

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Stripe CLI (for local webhook testing)

```bash
# Install Stripe CLI
# Then forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Use the webhook secret from CLI output in .env.local
```

## Project Structure

```
.
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── booking/       # Booking request, accept, decline
│   │   ├── host/          # Stripe Connect onboarding
│   │   ├── reviews/       # Review creation
│   │   ├── search/        # Property search
│   │   └── webhooks/      # Stripe webhooks
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Role-based dashboards
│   ├── property/[id]/     # Property detail page
│   ├── routes/            # Riding routes page
│   ├── search/            # Search results
│   └── host/              # Host onboarding
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   └── dashboard/         # Dashboard components
├── lib/                   # Utilities
│   ├── fees.ts            # Fee calculations
│   ├── stripe.ts          # Stripe client
│   ├── supabase/          # Supabase clients & types
│   └── utils.ts           # Helper functions
├── supabase/              # Database
│   ├── migrations/        # SQL migrations
│   └── seed.sql           # Demo data
└── tests/                 # Playwright E2E tests
```

## Testing

### Unit Tests (Fee Calculations)

```bash
# Fee calculation tests are included in lib/fees.test.ts
# To run, you'd need to set up Jest (currently placeholder)
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers
npx playwright install

# Run tests
npm test

# Run with UI
npm run test:ui
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Environment Variables (Production)

Ensure all `.env.local` variables are set in your deployment platform.

Update `NEXT_PUBLIC_APP_URL` to your production domain.

### Webhook Configuration

After deployment, update your Stripe webhook endpoint to:
```
https://your-domain.com/api/webhooks/stripe
```

## Database Schema

### Core Tables

- `users` - User profiles (extends Supabase auth)
- `host_profiles` - Host-specific data (Stripe Connect ID, payout status)
- `properties` - Property listings
- `property_facilities` - Facility details (stables, paddocks, etc.)
- `property_photos` - Property images
- `availability_blocks` - Date ranges (blocked or booked)
- `bookings` - Booking records with fee breakdown
- `reviews` - Guest reviews (1-5 stars)
- `host_replies` - Host responses to reviews
- `routes` - Curated riding routes
- `route_pins` - Points of interest on routes

### RLS Policies

- **Guests**: Read properties, photos, routes; CRUD own bookings/reviews
- **Hosts**: CRUD own properties; read/update bookings for their properties
- **Admins**: Full access to all tables

## Stripe Integration

### Connect Standard

Hosts onboard via Stripe Connect Standard:
1. Click "Connect Stripe Account" in dashboard
2. Complete Stripe onboarding (KYC, bank details)
3. System saves `stripe_connect_id` to `host_profiles`
4. Webhook updates `payout_enabled` when account is verified

### Payment Flow

1. Guest requests booking → `PaymentIntent` created (manual capture)
2. Host accepts → `PaymentIntent` captured
3. Webhook receives `payment_intent.succeeded`
4. System creates `Transfer` to host's Connect account
5. Host receives payout (base - host fee - VAT)

### Refund Policy (TODO)

Flexible/Moderate/Strict refund policies to be implemented in v2.

## TODOs / Future Enhancements

- [ ] **Delayed Capture**: Capture payment on check-in date (requires cron/queue)
- [ ] **iCal Sync**: Import/export availability via iCal feeds
- [ ] **Messaging**: In-app messaging between guests and hosts
- [ ] **Mapbox Route Editor**: Allow admins to create routes visually
- [ ] **Multi-currency**: Support multiple currencies (currently GBP only)
- [ ] **Multi-country**: Expand beyond UK
- [ ] **Dispute Handling**: Automated dispute management via Stripe
- [ ] **Cancellation Policies**: Implement flexible/moderate/strict policies
- [ ] **Email Notifications**: Transactional emails via Resend
- [ ] **Mobile App**: React Native companion app

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact support@bridlestay.app

---

Built with ❤️ for the equestrian community



#   D e p l o y m e n t   t r i g g e r  
 