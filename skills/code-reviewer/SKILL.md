---
name: code-reviewer
description: Use after writing or modifying any code, before presenting it as complete. Reviews the diff for simplification opportunities, duplicated logic, missing edge cases, type safety, security issues, and convention violations. Invoke explicitly with phrases like "review this", "audit", "simplify", "check for issues", or run automatically after every implementation task before final delivery. Triggers on review, audit, simplify, code quality, refactor, cleanup, check this, look at this, any issues, find problems, security check.
---

# Code Reviewer

Acts as a senior engineer doing a structured review pass over code before it ships. Runs after implementation, never replaces it. Catches the issues a first draft typically misses.

## When to invoke

- After completing any implementation task (auto, before final response)
- When user asks to "review", "audit", "check", or "simplify"
- Before opening a PR description
- When a previous response feels rushed or skipped checks

## Core Workflow

1. **List changed files** — `git diff --name-only` (or work from the response context)
2. **Read each changed file fully** — Not just the diff. Context matters for "is this duplicated?" type checks
3. **Run the 6 checks below in order** — Note findings as you go
4. **Fix what you find** — Don't just report. Apply the simplification and present the corrected code
5. **Summarize** — List issues found, fixes applied, and anything that's intentional and shouldn't change

## The 6 review checks

### Check 1 — Simplification & duplication
- Functions longer than 30 lines: can they be split, or is the length essential?
- Logic that appears 2+ times: extract to a utility
- Nested conditionals 3+ levels deep: invert with early returns, or extract a helper
- Boolean parameters: split into two functions or use a discriminated union
- "Util" functions that wrap a single one-liner: inline them
- Imports that aren't used: remove

### Check 2 — Type safety (TypeScript)
- Any `any` type: replace with concrete types, generics, or `unknown` + narrow
- Non-null assertions (`!`): verify there's a prior check that proves non-null
- `as` type casts: only allowed for branded type constructors, post-Zod narrowing, or DOM narrowing
- Missing explicit return types on exported functions
- Function parameters without types
- `@ts-ignore` or `@ts-expect-error` without explanation comment
- Optional flags that should be discriminated unions (`{ loading?, data?, error? }` → `{ status: 'loading' } | { status: 'success', data } | { status: 'error', error }`)

### Check 3 — Error handling
- `try/catch` that swallows errors silently (no log, no rethrow, no fallback)
- Promises without `await` or `.catch()`
- Async operations without timeout where network is involved
- User-facing error messages in English when the app is Thai
- Generic 500 errors that should be specific (404, 403, 422, 429)
- Missing validation on external input (form, query, URL param, file)

### Check 4 — Security
- Secrets in client code (any `process.env.X` without `NEXT_PUBLIC_` prefix that reaches a Client Component)
- Unvalidated input flowing into Prisma queries (especially in raw queries or `findMany` where clauses)
- Missing auth check before destructive operations
- Missing authorization check (user can access their own data but check confirms ownership)
- File upload without size/type validation
- SQL or NoSQL injection vectors (template-string queries, user input in `orderBy` field names)
- XSS via `dangerouslySetInnerHTML` with unsanitized content
- Missing CSRF protection on state-changing endpoints (Server Actions handle this; raw Route Handlers may not)
- Logging that includes passwords, tokens, or PII

### Check 5 — Performance
- Sequential awaits that could be `Promise.all`
- Database queries inside loops (N+1) — batch with `findMany({ where: { id: { in: [...] } } })`
- Missing `select` on Prisma queries — fetching whole rows when only 2 fields needed
- Heavy components without `Suspense` boundary
- Client Components doing work that belongs in a Server Component
- Missing `next/image` for content images
- Re-renders caused by inline object/array props or function definitions

### Check 6 — Conventions (project-specific from CLAUDE.md)
- File naming matches convention (`kebab-case.ts`, `PascalCase.tsx` for components)
- Variable naming (`camelCase` for functions/vars, `PascalCase` for components/types, `UPPER_SNAKE` for constants)
- UI text in Thai
- Code comments in English
- Conventional commit message ready (`feat:`, `fix:`, `refactor:`, etc.)
- New env vars documented in `.env.example` and CLAUDE.md
- New API endpoints documented in `docs/api-spec.md`

## MUST DO

- Fix issues you find — don't just list them
- Re-read the file after editing to confirm the fix didn't introduce new issues
- Run `tsc --noEmit` after fixes if available
- Note what was reviewed and skipped (e.g., "did not review generated Prisma client code")

## MUST NOT DO

- Do not change behavior. Refactor only. If you spot a bug, surface it separately and ask before fixing
- Do not rewrite from scratch. Smaller incremental fixes preserve intent
- Do not enforce style preferences not in `CLAUDE.md` (e.g., don't switch from named to default exports based on taste)
- Do not skip the security check, even for "internal" code
- Do not approve code with `any` types unless there's a comment explaining why

## Example

### Before review

```ts
export const getUserFiles = async (userId: any) => {
  const res = await fetch(`/api/users/${userId}/files`);
  const data = await res.json();
  return data;
};

export const getUserProjects = async (userId: any) => {
  const res = await fetch(`/api/users/${userId}/projects`);
  const data = await res.json();
  return data;
};
```

### After review

Issues found:
- `any` type on `userId` (check 2)
- Duplicated fetch logic (check 1)
- No error handling — failed responses return `undefined` or throw (check 3)
- No type on return value (check 2)

Fixed:

```ts
import type { UserId } from '@/types/brand';

async function fetchUserResource<T>(userId: UserId, resource: string): Promise<T> {
  const res = await fetch(`/api/users/${userId}/${resource}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${resource}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const getUserFiles = (userId: UserId): Promise<FileMetadata[]> =>
  fetchUserResource<FileMetadata[]>(userId, 'files');

export const getUserProjects = (userId: UserId): Promise<Project[]> =>
  fetchUserResource<Project[]>(userId, 'projects');
```

## Review report template

```
## Code Review

**Files reviewed:** 3
- app/api/files/route.ts
- services/file-service.ts
- app/files/page.tsx

**Issues found and fixed:**
- [check 2] Replaced `any` with `UserId` branded type — 2 places
- [check 1] Extracted duplicated fetch wrapper into `fetchUserResource`
- [check 4] Added auth check before file deletion endpoint
- [check 5] Replaced `await` loop with `Promise.all` in file batch processing

**Issues flagged for review (not auto-fixed):**
- file-service.ts line 47: TODO comment from previous author suggests adding caching — leaving as-is, not in scope

**Skipped:**
- prisma/migrations/* — generated files
- node_modules/* — third-party

**Convention check:** all conventions in CLAUDE.md respected
**tsc --noEmit:** 0 errors
```

## Reference

For full review pattern documentation see:
- Anthropic's official `simplify` skill
- Project's `CLAUDE.md` for project-specific conventions

Skip the project conventions section if there's no `CLAUDE.md` to read.
