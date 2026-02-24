# UI/UX Design Rules — Padoq (Bridlestay)

This document is the authoritative reference for all UI and UX decisions. Every agent, developer, or contributor building frontend features **must** follow these rules. The goal is a product that feels intuitive, premium, and purpose-built for the equestrian community.

---

## The 10 Core Principles

### 1. Clarity

**The user should never have to think about what something does.**

- Every element must have an obvious purpose. If it needs a tooltip to explain itself, reconsider the design.
- Labels should use plain language — "Post Warning" not "Submit Hazard Report".
- Icons must always be paired with text labels on actions. Icon-only buttons are acceptable only for universally understood symbols (close X, back arrow, menu hamburger) and only when space is genuinely constrained.
- States must be visually distinct: empty, loading, populated, error, disabled, success. Never let a user wonder "did that work?"
- Avoid jargon. The audience is horse riders, not developers. "Ride this route" not "Record a completion".

**Implementation rules:**
- Buttons must have descriptive text, not just icons
- Empty states must have helpful messaging and a clear call-to-action
- Loading states must show skeleton/shimmer or spinner — never a blank screen
- Error messages must explain what went wrong AND what to do next

---

### 2. Consistency

**Same patterns, same behavior, everywhere.**

- Once a pattern is established (e.g., how a dialog works, how a list filters, how a card expands), every similar interaction must follow the same pattern.
- Spacing, typography, and color usage must be consistent across all pages and components.
- Interactive elements must look and behave identically in every context — a "Cleared?" button in the drawer should work the same as one on the map.
- Navigation patterns must be predictable: if a back button exists in one view mode, it must exist in all view modes.

**Implementation rules:**
- Use the existing shadcn/ui component library — never build custom versions of components that already exist (Button, Badge, Dialog, Select, etc.)
- Follow the existing Tailwind scale: `text-xs`, `text-sm`, `text-base` — don't use arbitrary font sizes
- Padding/margin must follow the Tailwind spacing scale (multiples of 0.25rem)
- Color usage: use the established semantic colors (green = success/go, amber = warning/caution, red = danger/hazard, blue = info/instruction, purple = POI/special)
- If a pattern exists elsewhere in the codebase, match it exactly

---

### 3. Feedback

**The system must always respond to user actions. Silence is failure.**

- Every click, tap, or submission must produce visible feedback within 200ms.
- Toast notifications for async operations (save, submit, delete).
- Button states must change immediately on click (loading spinner, disabled state).
- Optimistic updates where safe — update the UI immediately, roll back on error.
- Hover states on all interactive elements (desktop). Active/pressed states on all tappable elements (mobile).

**Implementation rules:**
- All form submissions must disable the button and show "Submitting..." / "Saving..." text
- All async operations must show a toast on success and on failure
- Use `toast.success()` for successful actions, `toast.error()` for failures, `toast()` for informational
- State changes (like voting, resolving, toggling) should update the local UI immediately before the API call completes
- Never leave the user wondering — if something is loading, show a loading state

---

### 4. Efficiency

**Minimise the steps between intention and completion.**

- Primary actions must be prominent and reachable — never buried in menus.
- Forms should only ask for what is necessary. Optional fields should be clearly marked or hidden behind "Add more details" expansions.
- The most common action on any screen should be the easiest to perform.
- Reduce decision fatigue: sensible defaults for everything. Pre-select the most common option.
- On mobile, critical actions must be reachable with one thumb — bottom of screen, not top.

**Implementation rules:**
- Dialogs should have a single primary action button, visually prominent (solid color)
- Secondary/cancel actions should be visually subdued (outline or ghost variant)
- Forms: required fields only by default; optional fields clearly labelled
- Default values should be set for all selectors and options (e.g., tag defaults to "note", difficulty defaults to "moderate")
- Multi-step flows should show progress and allow going back without losing data
- On mobile, primary CTAs should be full-width at the bottom of the screen

---

### 5. Forgiveness

**Users make mistakes. The system must make recovery easy.**

- Destructive actions (delete, cancel booking) must require confirmation.
- Non-destructive actions should be undoable where possible.
- Forms should preserve input on error — never clear a form because validation failed.
- Navigation should never cause data loss without warning.
- The user should always have a way out: close, cancel, back, skip.

**Implementation rules:**
- Delete actions require a confirmation dialog with the item name: "Delete waypoint 'River Crossing'?"
- Form validation should be inline (field-level), not just on submit
- Dialog close (X button or backdrop click) should not submit — only cancel
- Multi-step flows must allow navigating back to previous steps without losing entered data
- Always provide a "Cancel" or "Skip" option alongside submit buttons

---

### 6. Accessibility

**Design for all users, not just ideal conditions.**

- Color must never be the sole indicator of meaning — always pair with text, icons, or shape.
- Touch targets must be at least 44x44px on mobile.
- Text must meet WCAG AA contrast ratios (4.5:1 for body text, 3:1 for large text).
- Interactive elements must be keyboard-navigable and screen-reader compatible.
- Design for poor network conditions and small screens.

**Implementation rules:**
- All images must have meaningful `alt` text
- All form inputs must have visible `<Label>` elements
- Use semantic HTML: `<button>` for actions, `<a>` for navigation, `<h1>`-`<h6>` for headings
- Badge/tag colors must include a text label — never rely on color alone (e.g., the amber "Caution" badge has the word "Caution", not just an amber dot)
- Minimum button height: `h-8` (32px) on desktop, `h-10` (40px) on mobile
- Map popups must be clickable — not just hover-only (hover doesn't exist on touch devices)

---

### 7. Hierarchy

**Guide the user's eye. The most important thing should be the most visible.**

- Every screen needs a clear visual hierarchy: one primary heading, supporting context, then content.
- Actions have a priority order: primary (solid button), secondary (outline), tertiary (ghost/text link).
- Information density should match importance: critical info (warnings, hazards) gets prominent visual treatment; metadata (coordinates, grid refs) is subdued.
- Use whitespace deliberately — it creates breathing room and separates sections.
- Cards and sections should have clear boundaries and grouping.

**Implementation rules:**
- One primary CTA per screen/dialog. Multiple equal-weight buttons create decision paralysis.
- Section headings use `font-semibold text-sm` or `font-bold text-base` — scaled to importance
- Muted/secondary text uses `text-muted-foreground` or `text-gray-500`
- Status indicators (badges, warning cards) use color + icon + text together for maximum scanability
- In drawers/panels: header (sticky) → content (scrollable) → actions (sticky bottom on mobile)
- White space between sections: minimum `space-y-4` for related groups, `space-y-6` or a `<Separator>` between distinct sections

---

### 8. Simplicity

**Remove everything that doesn't earn its place.**

- Every element must justify its existence. If removing it doesn't hurt the experience, remove it.
- Prefer progressive disclosure: show essential info first, details on demand (expand, click-through, dialog).
- Avoid visual clutter: too many badges, icons, colors, or borders competing for attention.
- One concept per screen or section. Don't mix hazards and waypoints in the same visual group.
- Settings and configuration should have sensible defaults and only surface options that users actually need.

**Implementation rules:**
- Cards should show 2-3 key pieces of info in collapsed state; full details on expand
- Avoid nesting dialogs within dialogs — use step flows or separate screens instead
- Don't show technical data (UUIDs, raw coordinates, internal status codes) to end users
- Limit badge count per element: maximum 2-3 badges per card/item before it becomes noise
- Default tag for waypoints is "note" — which is hidden (no badge) because it's the default. Only show badges for non-default states.
- Remove options that don't need to be options: if something has a single correct value, hardcode it (e.g., 30-day warning duration)

---

### 9. Responsiveness

**Every screen must work on every device. Mobile is the primary target.**

- The app is used outdoors, on horseback, in fields — mobile is the primary use case, not an afterthought.
- Touch targets must be appropriately sized (min 44px).
- Drawers, panels, and dialogs must work within the mobile viewport — no horizontal scrolling, no overflows.
- Fixed/sticky elements must not overlap or obscure each other (z-index discipline).
- Test every feature on a narrow viewport (375px width minimum).

**Implementation rules:**
- Mobile-first Tailwind classes: base styles for mobile, `md:` prefix for desktop overrides
- Drawer content must be scrollable (`ScrollArea` or `overflow-y-auto`), headers and footers sticky
- Fixed-position elements must have explicit z-index ordering and must not overlap:
  - Base content: z-0 to z-10
  - Floating panels/drawers: z-20 to z-30
  - Overlays/modals: z-40
  - Navigation headers: z-50
  - Critical floating UI (back buttons, alerts): z-[60]
- Map popups and tooltips must work on touch (click, not just hover)
- Text truncation with `truncate` or `line-clamp-2` for long content in constrained spaces
- Full-width buttons on mobile, inline buttons on desktop

---

### 10. Delight

**Add moments of polish that make the product feel premium — without compromising usability.**

- Smooth transitions on state changes (expand/collapse, show/hide).
- Subtle animations that guide attention (fade-in for new content, slide-in for drawers).
- Celebration moments at completion points (the review "Thank you" screen).
- Consistent, warm tone in copy — this is a community platform for horse lovers.
- Attention to the small things: proper pluralisation ("1 hazard" vs "2 hazards"), friendly empty states, helpful placeholder text.

**Implementation rules:**
- Use `transition-colors`, `transition-all`, or `animate-in` for state changes — never jarring instant swaps
- Duration: `duration-200` for micro-interactions (hover, focus), `duration-300` for layout changes (expand, drawer)
- Empty states should include an icon, a message, and a CTA: `<MapPin icon>` "No waypoints yet." `[Add Waypoint]`
- Pluralise correctly: `${count} warning${count !== 1 ? "s" : ""}`
- Toast messages should be human-friendly: "Warning posted! Other riders will see this alert." not "POST /api/hazards succeeded"
- Use emojis sparingly and only in celebratory/community contexts (review thank-you 🎉, ride completion 🐴) — never in error states or technical contexts

---

## Design System Quick Reference

### Colors (Semantic)

| Purpose | Background | Text | Border | Example |
|---------|-----------|------|--------|---------|
| Success / Go | `bg-green-50` | `text-green-700` | `border-green-200` | Voted, Completed |
| Warning / Caution | `bg-amber-50` | `text-amber-700` | `border-amber-300` | Warnings, Caution tags |
| Danger / Hazard | `bg-red-50` | `text-red-700` | `border-red-300` | Hazards, Delete |
| Info / Instruction | `bg-blue-50` | `text-blue-700` | `border-blue-200` | Instruction tags, Info |
| Special / POI | `bg-purple-50` | `text-purple-700` | `border-purple-200` | POI tags |
| Neutral / Default | `bg-gray-50` | `text-gray-700` | `border-gray-200` | Note tags, Metadata |

### Typography Scale

| Element | Class | Usage |
|---------|-------|-------|
| Page title | `text-xl font-bold` | Main headings in drawers/pages |
| Section heading | `text-base font-semibold` or `text-sm font-semibold` | Card headers, section titles |
| Body text | `text-sm` | Descriptions, content |
| Caption/metadata | `text-xs text-muted-foreground` | Timestamps, coordinates, counts |
| Tiny label | `text-[10px]` or `text-[11px]` | Inline badges, mini-labels |

### Spacing

| Context | Class | Usage |
|---------|-------|-------|
| Between sections | `space-y-6` | Major content sections |
| Between related items | `space-y-3` or `space-y-4` | Items within a section |
| Between tightly grouped items | `space-y-2` | List items, form fields |
| Card padding | `p-3` or `p-4` | Card/panel internal spacing |
| Inline gaps | `gap-2` or `gap-3` | Between inline elements |

### Button Hierarchy

| Priority | Variant | Usage |
|----------|---------|-------|
| Primary action | Default (solid) | Submit, Save, Confirm |
| Secondary action | `variant="outline"` | Back, Cancel, Alternative |
| Tertiary action | `variant="ghost"` | Skip, Dismiss, Minor |
| Danger | `variant="destructive"` | Delete, Remove |

---

## Mobile-Specific Rules

1. **Primary actions at the bottom** — thumbs reach the bottom of the screen, not the top
2. **Sheets instead of dialogs on mobile** — full-width bottom sheets feel more native than centered modals
3. **Swipe-to-dismiss** where possible for drawers and panels
4. **Large touch targets** — min 44px, prefer 48px for primary actions
5. **No hover-dependent interactions** — everything must have a click/tap equivalent
6. **Reduced information density** — show less per screen, make it scannable
7. **Fixed headers and footers** — scroll the middle, keep navigation anchored

---

## Checklist: Before Shipping Any UI

Use this checklist before considering any frontend work complete:

- [ ] Does every interactive element have visible hover, active, and disabled states?
- [ ] Does every async action show loading, success, and error feedback?
- [ ] Is there a way to go back / cancel / close from every screen?
- [ ] Does it work on a 375px-wide mobile viewport without overflow?
- [ ] Are touch targets at least 44px?
- [ ] Do fixed elements have correct z-index and not overlap other fixed elements?
- [ ] Is the empty state handled with a message and CTA?
- [ ] Are error states handled gracefully (not blank screens or console errors)?
- [ ] Does the visual hierarchy guide the eye to the primary action?
- [ ] Is text readable (sufficient contrast, appropriate size)?
- [ ] Are popups/tooltips accessible on both hover (desktop) and tap (mobile)?
- [ ] Have you tested with real-length content (long names, long descriptions)?

---

## Inspiration References

See `/Agent Guide (Please Read)/UI Design Guide/Images for Inspiration/` for visual reference:

- **UI (1)**: Clean layer controls with toggle switches — simple, scannable settings
- **UI (2)**: Airbnb review flow — single question per step, prominent rating, optional tags, generous whitespace
- **UI (3)**: Airbnb onboarding dialog — icon + heading + description pattern, single CTA, progressive disclosure
- **UI (4)**: Cavago booking confirmation — warm confirmation modal, activity summary card, dual action buttons
- **UI (5)**: Dashboard analytics — clean data presentation, card-based layout, consistent chart styling
- **UI (6)**: Cavago mobile auth/onboarding — warm yellow accent, one task per screen, large touch targets, clear back navigation

The common thread: **generous whitespace, one task per screen, clear hierarchy, warm but professional tone**.
