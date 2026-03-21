---
name: polish
description: UI refinement pass — compares a page/component against the Padoq design language and fixes visual consistency
argument-hint: "[page or component path]"
---

# /polish — UI Refinement Pass

Read the specified page or component, compare it against the Padoq design language stored in memory, and fix any visual inconsistencies.

## Process

1. **Read the design language memory** — Load `design_language.md` from memory. This is the source of truth for how Padoq should look.
2. **Read the target component** — Examine every Tailwind class, every piece of JSX.
3. **Compare against the design language** — Check:

### Typography
- Are headings using `font-serif` (Playfair Display)?
- Are sizes following the scale? (H1: `text-4xl md:text-7xl`, H2: `text-2xl md:text-3xl`, etc.)
- Is muted text using `text-muted-foreground`?
- Is metadata using `text-xs`?

### Spacing
- Are sections using `py-10 md:py-16` (not random values)?
- Are cards using `p-4` to `p-6`?
- Are gaps using `gap-4/6/8` consistently?
- Is the container using `container mx-auto px-4`?

### Cards & Surfaces
- Are cards using `rounded-lg border bg-card shadow-sm`?
- Do hover states use `hover:shadow-lg transition-shadow`?
- Are images in cards using proper height constraints?

### Colors
- Is the primary green from CSS variables (not hardcoded hex)?
- Are section backgrounds using the correct pattern? (beige: `bg-secondary/30`, warning: `bg-amber-50`)
- Are badges using the established color patterns?

### Mobile
- Do responsive breakpoints follow `md:` and `lg:` patterns?
- Are touch targets large enough (min 44x44px)?
- Does text scale properly (`text-2xl md:text-4xl`)?

### Anti-patterns (The AI-Built Look)
- Generic centered cards with no personality?
- Stark white backgrounds where beige/cream should be?
- Missing visual hierarchy (everything same weight)?
- No hover/transition states?
- Icons used decoratively without meaning?

4. **Fix issues** — Apply corrections using Edit tool. Minimal changes — only fix what's wrong.
5. **Build check** — Run `npm run build`
6. **Changelog + commit + push** — Standard post-change workflow

## Important
- Don't redesign — refine. Preserve existing functionality and layout intent.
- Focus on consistency with the rest of the app, not hypothetical improvements.
- If a page looks deliberately different (e.g., routes map is full-screen), respect that intent.

## Target: $ARGUMENTS

Polish the above page/component. If no target is specified, ask what to polish.
