---
name: fix
description: Targeted bug investigation and fix — takes an error or bug description, finds root cause, implements fix, builds, commits, pushes
argument-hint: "[bug description or error message]"
---

# /fix — Targeted Bug Squash

Take a bug description or error message, investigate the root cause, implement the fix, and run the full post-change workflow.

## Process

1. **Understand the bug** — Parse the error message or description. Ask clarifying questions only if genuinely ambiguous.
2. **Investigate** — Use Grep, Glob, and Read to find the relevant code. Trace the data flow to identify the root cause. Check memory for known architecture patterns.
3. **Root cause analysis** — Before fixing, clearly state what's wrong and why. Don't fix symptoms — fix causes.
4. **Implement the fix** — Make the minimum change needed. Don't refactor surrounding code. Don't add features.
5. **Verify** — Run `npm run build` to confirm no regressions.
6. **Post-change workflow**:
   - Update `changelogs/YYYY-MM-DD.md` with fix details
   - Git commit with `fix:` prefix
   - Git push

## Rules
- One fix at a time — don't bundle unrelated changes
- If the fix touches payment/money code, double-check integer arithmetic
- If the fix touches auth/security code, verify RLS implications
- If the bug is in a file you haven't read, read it first
- Check memory for known patterns before making structural assumptions
- If the fix would be large (>100 lines changed), pause and explain the approach before implementing

## Bug: $ARGUMENTS

Investigate and fix the above. If no bug is specified, ask what to fix.
