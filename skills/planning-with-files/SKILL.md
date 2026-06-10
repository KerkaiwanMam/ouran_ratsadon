---
name: planning-with-files
description: Use at the start of any complex multi-step task that involves more than 3 tool calls, multiple files, or work that could span beyond the current context window. Writes a persistent task plan to disk so progress survives context resets. Invoke when user says "plan", "implement feature X", "build", "refactor", "migrate", or when a request requires research before coding. Triggers on plan, planning, implement, build feature, refactor, migrate, scaffold, set up, ship, deliver, multi-step, complex task, big change, large refactor.
---

# Planning with Files

For complex tasks, the context window is volatile RAM and the file system is persistent disk. Important state — the plan, key findings, progress — must be on disk, not held only in context. This skill enforces a disciplined planning workflow that survives context resets, agent retries, and long multi-step work.

## When to invoke

- Any task that will likely take more than 5 tool calls
- Any task that involves multiple files being created or changed
- Any task where the user describes a feature, refactor, or migration in more than one sentence
- Anywhere "research first, then code" applies (looking up library docs, exploring an unfamiliar codebase)

## When NOT to invoke

- Single-file edits ("rename this variable", "fix this typo")
- Conversational questions ("what does this code do?")
- Trivial scaffolding (one file, well-known pattern)

## The 3 planning files

Created in the project root or `.plans/` directory.

### `task_plan.md` — the plan

Structured plan with phases, success criteria, and decision log.

```markdown
# Task: <one-line goal>

**Started:** 2025-05-11
**Status:** in progress | blocked | done

## Success criteria
- [ ] Criterion 1 — specific, observable
- [ ] Criterion 2
- [ ] Criterion 3

## Out of scope
- Thing X (not doing because Y)

## Phases

### Phase 1 — <name>
- [ ] Step 1.1
- [ ] Step 1.2

### Phase 2 — <name>
- [ ] Step 2.1
- [ ] Step 2.2

## Decision log
- 2025-05-11: chose Server Actions over REST API because forms are rendered server-side
- 2025-05-11: deferred PDF export to phase 2 — not in P0 scope
```

### `findings.md` — research notes

Anything learned during research that future steps depend on. Add to this file *immediately* when discovered, not at the end.

```markdown
# Findings

## Library: pdfplumber
- Version 0.10.x supports Thai text extraction with `extra_attrs=["fontname"]`
- Tables with merged cells require `find_tables(table_settings={...})`
- Source: https://github.com/jsvine/pdfplumber

## Existing code
- `prisma/schema.prisma` already has `File` model; only need to add `leakDetectionRanAt` field
- Auth helper at `lib/auth.ts` returns `{ user, session } | null`

## Sample data
- `/data/budget-2568.json` has 4,821 projects across 20 ministries
- Schema validated against `BudgetData` Zod schema — passes
```

### `progress.md` — what's done

Append-only log of completed actions. Each entry is timestamped and concise.

```markdown
# Progress

- 2025-05-11 10:00 — Created task_plan.md, identified 3 phases
- 2025-05-11 10:15 — Read prisma/schema.prisma, found existing File model
- 2025-05-11 10:30 — Phase 1.1 done: added leakDetectionRanAt migration
- 2025-05-11 10:45 — Phase 1.2 done: regenerated Prisma client
- 2025-05-11 11:00 — Phase 2.1 in progress: implementing leak-detection-service.ts
```

## The 5 rules

### Rule 1 — Plan before doing
For any complex task, create `task_plan.md` first. Even if it takes 60 seconds. The act of structuring the plan reveals missing information and forces clarification before time is wasted.

### Rule 2 — The 2-action rule
After every 2 search / view / browse operations, write what you learned to `findings.md` immediately. Do not hold information only in context. Context will be lost; the file will not.

### Rule 3 — Re-read before deciding
Before any non-trivial decision (which API to use, how to structure a function, whether to refactor first), re-read `task_plan.md`. The goal must be in your attention window, not just in your context window from 50 messages ago.

### Rule 4 — Update after acting
After completing each step, immediately:
1. Mark the checkbox in `task_plan.md` as done (`- [x]`)
2. Append a line to `progress.md` with timestamp + concise description
Skip this and the next agent run (or the same run after context compression) will not know what was done.

### Rule 5 — Surface blockers explicitly
When stuck, write the blocker in `task_plan.md` under a "## Blockers" section. State what's blocking, what you've tried, and what input is needed. Then surface to the user. Do not silently struggle.

## Lifecycle

```
START
  ↓
Create task_plan.md (rule 1)
  ↓
Research phase
  ↓ (every 2 search/view ops)
Append to findings.md (rule 2)
  ↓
Implementation phase
  ↓ (before each significant decision)
Re-read task_plan.md (rule 3)
  ↓ (after each completed step)
Update task_plan.md + progress.md (rule 4)
  ↓
Stuck? → surface in task_plan.md → ask user (rule 5)
  ↓ (when all checkboxes done)
Final review: do success criteria match what was built?
  ↓
Update status to "done"
END
```

## Example: starting a feature

User: "Add cash flow forecasting to the SME dashboard"

First response should create the plan, not jump to code:

```markdown
# Task: Add cash flow forecasting to SME dashboard

**Started:** 2025-05-11
**Status:** in progress

## Success criteria
- [ ] User uploads file with 6+ months of data → forecast page available
- [ ] Forecast uses WMA (not ML); disclaimer visible to user
- [ ] What-if slider re-calculates cash runway in <500ms
- [ ] Forecast restricted to Pro plan; Free plan sees upgrade prompt
- [ ] tsc --noEmit passes; manual test of happy path + error case

## Out of scope
- ML-based forecasting (phase 2)
- LINE notification when runway < 3 months (phase 2)
- Multi-currency support (not in P0)

## Phases

### Phase 1 — Service layer
- [ ] Implement WMA + seasonal index in `services/forecast-service.ts`
- [ ] Define `ForecastResponse` Zod schema in `lib/schemas/forecast.ts`
- [ ] Write unit test for WMA calculation with known input

### Phase 2 — API
- [ ] Add GET `/api/report/:fileId/forecast` Route Handler
- [ ] Add plan gate: 403 for Free users
- [ ] Add Zod validation for query params (months, revenueChange)

### Phase 3 — UI
- [ ] Create `/report/[id]/forecast` page (Server Component)
- [ ] Build `<ForecastChart>` Client Component with what-if slider
- [ ] Add disclaimer text
- [ ] Wire to API with SWR

### Phase 4 — Polish
- [ ] Add loading.tsx and error.tsx
- [ ] Update docs/api-spec.md
- [ ] Conventional commit: `feat(forecast): add cash flow projection [Pro]`
```

Then begin Phase 1.

## File locations

- Single project: place at project root (`task_plan.md`, `findings.md`, `progress.md`)
- Multiple parallel tasks: place in `.plans/<task-slug>/`
- Add `.plans/` to `.gitignore` if plans should not be committed (they are working notes)
- For tasks that span multiple sessions, commit them — they help recover context

## Anti-patterns

- **Reading the plan once and ignoring it** — defeats rule 3
- **Updating progress at the end of the session** — defeats rule 4
- **Vague success criteria ("make it work")** — measurable observable criteria only
- **20-step plans** — break into sub-tasks with their own plans
- **No "out of scope" list** — scope creep is the #1 killer of multi-step tasks
- **Plans that describe what to code instead of what to verify** — `[ ] Add useState hook` is not a goal; `[ ] User can filter results without page reload` is

## Reference

Inspired by Manus AI's persistent planning pattern. See `OthmanAdi/planning-with-files` on GitHub for the original specification.
