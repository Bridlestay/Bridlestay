---
name: discuss
description: Strategic planning and discussion mode for exploring ideas, architecture, and design decisions
argument-hint: "[topic]"
---

# /discuss — Strategic Planning & Discussion Mode

When this command is invoked, enter a focused discussion mode for exploring ideas, architecture, and design decisions. This is NOT implementation time — this is thinking time.

## How to Behave

- **Use questionnaires for key decisions** — When exploring options, use the `AskUserQuestion` tool to present 2-4 concrete choices with clear descriptions of trade-offs, risks, and implications. This is more efficient and direct than open-ended questions.
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
5. **Present choices via questionnaire** — Use `AskUserQuestion` to present key decisions with 2-4 options, each with:
   - Clear, concise label (1-5 words)
   - Description of what this option means
   - Trade-offs, risks, or implications
   - Your recommendation (if applicable, mark as "Recommended")
6. **Recommendation** — After user selects, summarize what was decided and why
7. **Open questions** — What do we still need to figure out?

## When to Use Questionnaires

Use `AskUserQuestion` when:
- **Choosing between approaches** — "Which authentication method?", "What caching strategy?", "Where to place this feature?"
- **Deciding on architecture** — "State management approach?", "API design pattern?", "Database structure?"
- **Prioritizing concerns** — "What matters most: performance, simplicity, or flexibility?"
- **Selecting implementation details** — "How should this UI component behave?", "What error handling strategy?"

Each option should clearly explain:
- **What** — What is this approach?
- **Why** — When/why would you choose this?
- **Trade-offs** — What do you gain? What do you sacrifice?
- **Risks** — What could go wrong?

## Questionnaire Example

```
Question: "Which approach should we use for real-time route updates?"
Options:
1. "WebSockets" — Persistent connection, instant updates, but higher server load and complexity
2. "Server-Sent Events (SSE)" — Simpler than WebSockets, one-way updates, works with existing HTTP
3. "Polling (every 30s)" — Simplest implementation, no persistent connections, but delayed updates (Recommended for MVP)
4. "No real-time" — Users refresh manually, zero complexity, good enough for low-traffic routes
```

## Padoq Context to Consider

- UK-only equestrian marketplace (hosts + guests + riders + admins)
- Real money flows (Stripe Connect, manual capture) — financial correctness matters
- Safety-adjacent product — horse welfare and rider safety
- Mobile-first for outdoor users (riders on trails)
- Supabase with RLS — schema changes are additive only
- Green-accented, Airbnb-inspired design language

## Topic: $ARGUMENTS

Discuss the above topic thoroughly. If no topic is provided, ask what the user wants to discuss.
