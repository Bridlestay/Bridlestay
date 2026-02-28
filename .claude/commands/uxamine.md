---
name: uxamine
description: Deep UI/UX examination and audit of a component, page, or user flow
argument-hint: "[component or page]"
---

# /uxamine — Deep UI/UX Examination Mode

When this command is invoked, perform a thorough UI/UX audit of the specified component, page, or flow. Read the actual code, don't guess. This is an investigative deep-dive, not a quick glance.

## How to Behave

- **Read the actual component code** — examine the JSX, styling, state, and interactions line by line.
- **Think like a user** — walk through the flow step by step. Where would someone get confused, frustrated, or lost?
- **Be critical but constructive** — identify real problems, not nitpicks. Suggest specific fixes.
- **Compare to our style** — does it match the Padoq design language? (See below)
- **Check mobile behaviour** — responsive classes, touch targets, scroll behaviour.
- **Look at error states** — what happens when things go wrong? Loading states? Empty states?

## Examination Checklist

### Visual Design
- [ ] Consistent with Padoq design language (green accents, clean cards, Airbnb-inspired)
- [ ] Proper visual hierarchy — most important info is most prominent
- [ ] Adequate spacing and breathing room (not cramped)
- [ ] Typography is readable and consistent (text sizes, weights, colours)
- [ ] Icons are meaningful, not decorative clutter
- [ ] Colour usage communicates meaning (green=positive, amber=warning, red=error)

### Interaction Design
- [ ] Primary actions are obvious and accessible
- [ ] Destructive actions have confirmation
- [ ] Loading states exist for async operations
- [ ] Error states are user-friendly (not raw error messages)
- [ ] Empty states guide the user (not just blank space)
- [ ] Touch targets are large enough for mobile (min 44x44px)
- [ ] Transitions/animations are subtle and purposeful

### Information Architecture
- [ ] Information is organised logically
- [ ] Most-used features are easiest to reach
- [ ] Labels and copy are clear and jargon-free
- [ ] Numbers and data are formatted consistently
- [ ] Dates use human-friendly formats

### Responsiveness
- [ ] Works on mobile viewports (320px-480px)
- [ ] Works on tablet viewports (768px-1024px)
- [ ] No horizontal scroll on mobile
- [ ] Text doesn't overflow containers
- [ ] Images scale appropriately

### Accessibility
- [ ] Semantic HTML elements used correctly
- [ ] Sufficient colour contrast
- [ ] Interactive elements are keyboard accessible
- [ ] Form inputs have visible labels
- [ ] Screen reader considerations (alt text, aria labels)

## Padoq Design Language

- **Colours**: Green-600 primary (#16a34a), slate grays for text, amber for warnings, red for errors
- **Components**: shadcn/ui (Radix primitives) — Badge, Button, Card, Dialog, etc.
- **Cards**: Rounded corners (rounded-lg/xl), subtle shadows, white backgrounds
- **Badges**: Pill-shaped, colour-coded by meaning
- **Typography**: System font stack, semibold for headings, text-sm/xs for metadata
- **Layout**: Mobile-first, drawer/sheet patterns for detail views, grids for stats
- **Tone**: Professional but warm. "I've ridden this route!" not "Mark as complete"
- **Icons**: lucide-react, used sparingly and meaningfully

## Target: $ARGUMENTS

Examine the above component/page/flow. If no target is provided, ask what to examine.

## Output Format

Structure your findings as:

1. **Overview** — what is this component/flow and what's its purpose?
2. **Strengths** — what's working well?
3. **Issues** — specific problems found, rated by severity (Critical / Major / Minor)
4. **Recommendations** — concrete suggestions with code references
5. **Score** — overall UX quality rating: Excellent / Good / Needs Work / Poor
