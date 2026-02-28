---
description: 
alwaysApply: true
---

# CLAUDE.md — Padoq Project Context

This file provides context for Claude Code (Anthropic's CLI coding agent).
It describes the project, tech stack, conventions, and hard rules.

---

## What is Padoq?

Padoq (formerly Bridlestay) is a **UK-only equestrian stays marketplace** — a production web platform where:

- **Hosts** list horse-friendly accommodation (stables, paddocks, arenas)
- **Guests** search, book, and pay for stays with their horses
- **Admins** manage moderation, verification, analytics, and support

This is a **real-money, safety-adjacent product**. Financial correctness, security, and user trust are non-negotiable.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14.2.21 |
| Language | TypeScript (strict) | 5.7.2 |
| UI | React | 18.3.1 |
| Components | shadcn/ui (Radix UI primitives) | — |
| Styling | Tailwind CSS | 3.4.15 |
| Database & Auth | Supabase (PostgreSQL + RLS + Auth) | 2.45.4 |
| Payments | Stripe (Connect Standard, manual capture) | 17.7.0 |
| Email | Resend + React Email | 4.8.0 |
| Maps | Mapbox GL JS | 3.18.1 |
| Forms | react-hook-form + zod | 7.53.2 / 3.23.8 |
| Data fetching | TanStack React Query | 5.62.2 |
| Charts | Recharts | 3.3.0 |
| Icons | lucide-react | 0.454.0 |
| Testing | Playwright (E2E) | 1.49.0 |
| Linting | ESLint (next/core-web-vitals) | 8.57.1 |
| Formatting | Prettier | 3.3.3 |
| Deployment | Vercel | — |

---

## Directory Structure

```
Bridlestay/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── api/                # ~65+ REST API routes
│   │   ├── admin/          # Admin operations
│   │   ├── auth/           # Auth (MFA, user management)
│   │   ├── booking/        # Booking CRUD, accept/decline, cancel, payment
│   │   ├── host/           # Host operations (Connect, listings, earnings)
│   │   ├── messages/       # Messaging system
│   │   ├── routes/         # Riding routes CRUD
│   │   ├── reviews/        # Reviews CRUD
│   │   ├── webhooks/       # Stripe webhooks
│   │   └── ...             # Many more resource endpoints
│   ├── admin/              # Admin dashboard pages
│   ├── auth/               # Auth pages (sign-in, sign-up, reset, MFA)
│   ├── host/               # Host dashboard pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Homepage
│   └── globals.css         # Global styles
├── components/             # React components (~144 .tsx files)
│   ├── ui/                 # shadcn/ui base components (~34)
│   ├── admin/              # Admin components
│   ├── booking/            # Booking components
│   ├── host/               # Host components
│   ├── routes/             # Route components (~32)
│   ├── reviews/            # Review components
│   └── ...                 # More domain components
├── lib/                    # Shared utilities
│   ├── supabase/           # Supabase clients (client.ts, server.ts, service.ts)
│   │   └── database.types.ts  # Generated Supabase types
│   ├── email/              # Resend client + React Email templates
│   ├── routes/             # Route utilities (KML, GPX, thumbnails)
│   ├── moderation/         # Text/image screening
│   ├── hooks/              # Custom hooks (mapbox, infinite scroll)
│   ├── validations/        # Zod schemas
│   ├── fees.ts             # Fee calculations (AUTHORITATIVE source)
│   ├── types.ts            # Shared TypeScript types
│   └── utils.ts            # General utilities (cn function)
├── supabase/
│   ├── migrations/         # 65+ SQL migrations
│   └── seed.sql            # Demo/seed data
├── hooks/                  # Global hooks (use-toast.ts)
├── scripts/                # Utility scripts (data import, geocoding)
├── tests/                  # Playwright E2E tests
├── changelogs/             # Mandatory changelog files (YYYY-MM-DD.md)
├── docs/                   # Feature documentation
├── public/                 # Static assets (logo, KML files)
├── middleware.ts           # HTTPS enforcement
├── next.config.mjs         # Next.js config (security headers, image domains)
├── tailwind.config.ts      # Tailwind config
├── tsconfig.json           # TypeScript config (strict, @/* path alias)
├── .eslintrc.json          # ESLint config
├── .prettierrc             # Prettier config
└── vercel.json             # Vercel config (cron jobs)
```

---

## Key Architectural Patterns

### Supabase Clients

Three Supabase client patterns — use the correct one:

- `lib/supabase/client.ts` — **Browser client** (client components)
- `lib/supabase/server.ts` — **Server client** (server components, API routes)
- `lib/supabase/service.ts` — **Service role client** (admin operations, bypasses RLS)

### Authentication & Roles

- Supabase Auth (email/password, magic links, optional MFA)
- Three roles: `guest`, `host`, `admin`
- Row Level Security (RLS) enforced on all tables
- Middleware enforces HTTPS in production

### Payment Flow (Critical)

1. Guest selects dates → PaymentIntent created with **manual capture**
2. Payment is **held** (not charged) until host accepts
3. Host accepts → payment **captured** immediately
4. Webhook `payment_intent.succeeded` → system creates Transfer to host
5. All amounts in **integer minor units (pence)** — NEVER floating point
6. Stripe Connect Standard for host payouts

### Fee Structure (from `lib/fees.ts`)

- Guest fee: 9.5% of base price
- Host fee: 2.5% of base price
- VAT: 20% on service fees only (guest fee + host fee)
- All calculations use integers — `lib/fees.ts` is the authoritative source

---

## Code Conventions

### Formatting (`.prettierrc`)

- Semicolons: yes
- Trailing commas: es5
- Quotes: double
- Print width: 80
- Tab width: 2
- Tabs: no

### TypeScript (`tsconfig.json`)

- Strict mode enabled
- Path alias: `@/*` maps to project root
- Target: ES2017
- Module resolution: bundler

### Linting (`.eslintrc.json`)

- Extends: `next/core-web-vitals`, `next/typescript`
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-unused-vars`: warn (ignores `_` prefixed args)

### Naming

- Components: PascalCase (`PropertyCard.tsx`)
- Utilities/hooks: camelCase (`use-toast.ts`, `fees.ts`)
- API routes: kebab-case directories (`app/api/damage-claims/`)
- Database: snake_case (PostgreSQL convention)

---

## Hard Rules (Non-Negotiable)

1. **No invented business logic** — Do not invent pricing, fees, refund rules, or roles. Ask if unclear.
2. **Money = integers** — All monetary values in pence. Never use floats for money.
3. **One small change at a time** — No batched features. No snuck-in refactors.
4. **Full feature delivery** — Every feature must include UI, validation, error states, and an end-to-end user path.
5. **Security first** — Validate inputs, enforce least-privilege, never expose secrets or log PII.
6. **Ask when uncertain** — If anything is ambiguous, stop and ask. Do not guess.
7. **Additive schema changes only** — Never delete data or fields without explicit approval.
8. **Changelog is mandatory** — Every code change must be logged in `changelogs/YYYY-MM-DD.md`.

---

## Changelog Format

Location: `changelogs/YYYY-MM-DD.md`

Each entry must include:
- Session summary (1-2 sentences)
- Files created, modified, or deleted
- What changed and why
- Risk notes (if applicable)
- Verification steps
- SQL migrations to run (if any)

If multiple sessions on the same day, append with a time header.

---

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run Playwright E2E tests
npm run test:ui      # Run Playwright with UI
```

---

## Environment Variables

Required (in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

---

## Important Files

| File | Purpose |
|------|---------|
| `lib/fees.ts` | Authoritative fee calculations — do not duplicate logic |
| `lib/supabase/database.types.ts` | Generated Supabase types — do not edit manually |
| `lib/types.ts` | Shared TypeScript types |
| `middleware.ts` | HTTPS enforcement |
| `supabase/migrations/` | Database migrations (additive only) |
| `changelogs/` | Mandatory change log (update every session) |

---

## Post-Change Quality Checks (Mandatory)

After every implementation, before presenting the summary to the user, perform these checks:

### 1. Diff Review
- Review the full diff of all changes made in this session
- Check for bugs, logic errors, typos, and unintended side effects
- Verify no debug code (console.log, TODO comments) was left in
- Confirm no security vulnerabilities were introduced (SQL injection, XSS, exposed secrets)

### 2. Functionality Preservation
- Verify no existing functionality or logic was accidentally removed
- If code was deleted, confirm it was intentional and requested
- Check that refactors preserve original behaviour

### 3. Documentation Alignment
- Confirm changes are consistent with CLAUDE.md rules
- If a UI component was changed, verify it follows the Padoq design language (green accents, shadcn/ui, Airbnb-inspired)
- Ensure API changes follow existing patterns (error handling, response format, auth checks)

### 4. Test Alignment
- If tests exist for modified code, verify they still pass and are not invalidated by the changes
- Check that no test was turned into a placeholder or had assertions bypassed
- Report if test coverage was reduced by the changes

### 5. Task Completion Verification
- Cross-check all items marked as completed against the actual code changes
- Report any tasks marked done that are not actually finished

---

## Post-Change Workflow (Mandatory)

After completing work, always do the following in order:

1. **Build check** — Run `npm run build` and fix any errors
2. **Full summary** — Provide a clear summary of all changes: what was done, why, files modified, and any risks
3. **Changelog** — Create or update `changelogs/YYYY-MM-DD.md` with the correct date
4. **Git commit & push** — Commit with a descriptive message and push to remote. Use conventional commit style:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for restructuring without behaviour change
   - `docs:` for documentation changes
   - `style:` for formatting/UI-only changes
5. **Report concerns** — Flag any risks, recommendations, or things to watch out for

---

## Custom Commands

| Command | Purpose |
|---------|---------|
| `/discuss` | Enter strategic discussion mode for planning and architecture decisions |
| `/uxamine` | Deep UI/UX examination of a component, page, or flow |

Command definitions are in `.claude/commands/`.

---

## What NOT to Do

- Do not reorganise or move files without approval
- Do not introduce background jobs without approval
- Do not modify payment/fee logic without explicit instruction
- Do not use `any` type (warn-level lint rule — avoid it)
- Do not skip the changelog
- Do not commit `.env.local` or secrets
