---
name: ship
description: Post-change workflow — build, changelog, commit, push. Run after completing any code changes.
argument-hint: "[optional commit message override]"
---

# /ship — Build, Log, Commit, Push

Run the full post-change workflow mandated by CLAUDE.md. This should be the last thing run after any code changes.

## Process (Sequential)

1. **Build** — Run `npm run build`. If it fails, fix the errors and rebuild. Do not proceed until the build passes.

2. **Diff review** — Run `git diff` to review all changes. Check for:
   - Debug code left in (console.log, TODO comments from this session)
   - Unintended side effects
   - Security issues (exposed secrets, missing auth checks)

3. **Changelog** — Create or update `changelogs/YYYY-MM-DD.md` with today's date. Include:
   - Session summary (1-2 sentences)
   - Files created/modified/deleted
   - What changed and why
   - Risk notes (if applicable)
   - Verification steps
   - SQL migrations to run (if any)
   - If appending to an existing day's changelog, add a new `## Session N` header

4. **Commit** — Stage relevant files and commit with a conventional commit message:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for restructuring
   - `style:` for UI-only changes
   - `docs:` for documentation
   - If $ARGUMENTS is provided, use that as the commit message instead

5. **Push** — `git push` to remote

## Rules
- Never commit .env files or secrets
- Never use `git add -A` — add specific files
- Always use descriptive commit messages (1-2 sentences max)
- If there are no changes to commit, say so and stop
- Include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` in commit

## Override: $ARGUMENTS
