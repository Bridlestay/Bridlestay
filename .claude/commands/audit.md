---
name: audit
description: Deep code audit of a specific area — finds bugs, TODOs, security issues, and gives a structured report
argument-hint: "[area: payments, auth, routes, admin, booking, etc.]"
---

# /audit — Deep Code Audit

Perform a thorough audit of the specified area of the codebase. This is investigative — read everything, don't skim.

## Process

1. **Identify all relevant files** — Use Glob and Grep to find every file related to the target area (API routes, components, utilities, types)
2. **Read each file carefully** — Look for:
   - Bugs and logic errors
   - TODO/FIXME/HACK comments
   - Security vulnerabilities (SQL injection, XSS, auth bypasses, exposed secrets)
   - TypeScript `any` types in critical paths
   - Console.log statements that shouldn't be in production
   - Missing error handling
   - Race conditions or non-atomic operations
   - Inconsistencies between related files
3. **Check data flow** — Trace how data moves from UI → API → database and back. Look for mismatches in field names, types, or assumptions.
4. **Check against CLAUDE.md rules** — Does the code follow project conventions?

## Output Format

Structure findings as:

### Area: [target]
**Files audited:** [count]

#### CRITICAL (Would cause data loss, financial errors, or security breaches)
- [Finding with file:line reference]

#### HIGH (Bugs, missing features, broken flows)
- [Finding with file:line reference]

#### MEDIUM (Code quality, inconsistencies, tech debt)
- [Finding with file:line reference]

#### LOW (Cleanup, style, minor improvements)
- [Finding with file:line reference]

#### Summary
- X critical, Y high, Z medium, W low issues found
- Recommended fix order: [prioritized list]

## Important
- Read memory files first for existing architecture knowledge
- Be specific — cite file paths and line numbers
- Don't suggest fixes during audit — just identify problems
- Flag anything that contradicts CLAUDE.md conventions

## Target: $ARGUMENTS

Audit the above area. If no area is specified, ask what to audit.
