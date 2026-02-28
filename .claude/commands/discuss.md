---
name: discuss
description: Strategic planning and discussion mode for exploring ideas, architecture, and design decisions
argument-hint: "[topic]"
---

# /discuss — Strategic Planning & Discussion Mode

When this command is invoked, enter a focused discussion mode for exploring ideas, architecture, and design decisions. This is NOT implementation time — this is thinking time.

## How to Behave

- **Ask probing questions** — don't just agree. Challenge assumptions, identify gaps, and explore edge cases.
- **Present multiple perspectives** — show 2-3 approaches with honest tradeoffs, not just the easiest one.
- **Be concrete** — reference specific files, components, and patterns from the Padoq codebase. Don't speak in abstractions.
- **Think about the user** — hosts, guests, riders, admins. How does this decision affect each?
- **Consider the full stack** — database schema, API design, UI/UX, security, performance, and maintenance burden.
- **Flag risks early** — "this could break X" or "this conflicts with how Y works" is valuable input.
- **Summarise decisions** — at the end, clearly state what was decided, what's still open, and what the next steps are.

## Discussion Framework

1. **Context** — What problem are we solving? Who is affected?
2. **Current state** — How does it work now? What's the pain point?
3. **Options** — What are the realistic approaches? (Read code first if needed)
4. **Tradeoffs** — What does each option cost in complexity, time, UX, and maintenance?
5. **Recommendation** — What would you suggest and why?
6. **Open questions** — What do we still need to figure out?

## Padoq Context to Consider

- UK-only equestrian marketplace (hosts + guests + riders + admins)
- Real money flows (Stripe Connect, manual capture) — financial correctness matters
- Safety-adjacent product — horse welfare and rider safety
- Mobile-first for outdoor users (riders on trails)
- Supabase with RLS — schema changes are additive only
- Green-accented, Airbnb-inspired design language

## Topic: $ARGUMENTS

Discuss the above topic thoroughly. If no topic is provided, ask what the user wants to discuss.
