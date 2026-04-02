# Padoq

A UK-only equestrian stays marketplace built with Next.js 14, Supabase, and Stripe Connect.

## Features

- **Property Listings** — Host equestrian-friendly properties with detailed facilities
- **Horse-Friendly Search** — Find stays by location, dates, and horse capacity
- **Secure Payments** — Stripe Connect Standard with manual capture
- **Booking Management** — Request-to-book flow with host approval
- **Review System** — Post-checkout reviews with host replies
- **Riding Routes** — Curated trails with waypoints, elevation profiles, and turn-by-turn navigation
- **Row Level Security** — Supabase RLS on all tables

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database & Auth | Supabase (PostgreSQL + RLS + Auth) |
| Payments | Stripe (Connect Standard, manual capture) |
| Email | Resend + React Email |
| Maps | Mapbox GL JS |
| Testing | Playwright (E2E) |

## Setup

### Prerequisites

- Node.js 18+
- Supabase project
- Stripe account (test mode)
- Mapbox account

### Installation

```bash
npm install
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your keys. Required:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run Playwright E2E tests
```

## License

Proprietary — All rights reserved
