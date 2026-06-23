# ouran_ratsadon — Budget Intelligence Platform

## About this project

A two-layer web platform: a public Civic Layer for exploring Thai government budgets (no login, free) inspired by WeVis and USASpending.gov, and a paid Business Layer for SME expense analysis. Built as a portfolio project demonstrating full-stack development skills.

**Primary language**: Thai (UI), English (code)
**Architecture**: Two distinct layers sharing infrastructure but serving different users
**Revenue model**: Civic Layer = free (marketing funnel), Business Layer = Freemium + Pro ฿299/mo + Team ฿799/mo

> 📚 **This file is the compact index.** Detailed specs live in `docs/` — read the relevant doc before working on that area (saves tokens vs. reading everything). See "Detail docs index" at the bottom.

## Tech stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Charts**: Recharts (bar, pie, line) + D3.js (treemap, sunburst) + Leaflet (map view)
- **Backend**: node.js API Routes + Python microservice (FastAPI) for PDF/Excel parsing
- **PDF parsing**: pdfplumber (Python)
- **Excel parsing**: openpyxl + pandas (Python)
- **Database**: SQLite (dev) / PostgreSQL (prod) + Prisma ORM
- **Cache**: In-memory tree cache for Civic Layer (lazy-loaded per fiscal year from `apps/web/data/budget-XXXX.json` — see `docs/analyzer-spec.md` for the storage strategy; this is the only civic read path, do not add Postgres reads)
- **Deploy**: Vercel (frontend) + Railway/Render (Python service)

## Project structure

```
ouran_ratsadon/
├── CLAUDE.md
├── README.md
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   │   ├── (public)/             # Landing, About, Pricing, Contact
│   │   │   ├── (civic)/              # Public budget explorer (no auth)
│   │   │   ├── (auth)/               # Login, Register, Forgot Password
│   │   │   ├── (business)/           # SME dashboard (requires auth)
│   │   │   └── (admin)/              # Admin panel
│   │   ├── components/               # ui/ civic/ business/ charts/ layout/ shared/
│   │   ├── hooks/ lib/ types/ utils/
│   │   └── data/                     # Civic read path (process.cwd()/data): budget-XXXX.json, fiscal-summary.json — single source of truth
│   └── parser/                       # Python FastAPI microservice
│       ├── main.py
│       ├── parsers/                  # pdf, excel, bank_statement, accounting_export
│       ├── analyzers/                # leak_detector, forecaster, categorizer
│       ├── models/ utils/
├── prisma/schema.prisma
├── skills/                           # nextjs-developer, typescript-pro, nodejs-api-developer,
│                                     # fullstack-architect, code-reviewer, planning-with-files
│   └── graphify/SKILL.md             # /graphify — codebase → knowledge graph (community detection, HTML viz, JSON)
├── docs/                             # see "Detail docs index" below
└── sample-data/                      # Sample SME files for testing
```

> Full route list (every page, every layer): `docs/routes-and-pages.md`

## Platform layers and user roles

**Civic Layer** (public, no login, free): pre-processed Thai government budget data, treemap/sunburst/map visualizations, advanced search, project detail pages, year-over-year comparison, embed widgets, open data download. Purpose: build brand, SEO traffic, funnel users to Business Layer.

**Business Layer** (login required, paid): user uploads own financial data (Excel template, bank statements, accounting exports), cash flow dashboard, leak detection, cash flow forecasting (WMA + seasonal). Purpose: revenue from SME subscriptions.

### User roles
- **Guest**: Unauthenticated, full Civic Layer access
- **Member (Free)**: 3 file uploads/month, basic charts, CSV export
- **Member (Pro)** ฿299/mo: unlimited uploads, leak detection, forecasting, what-if, alerts, PDF export
- **Member (Team)** ฿799/mo: Pro + 5 seats + shared dashboards + comments + RBAC
- **Admin**: manages users, subscriptions, logs, Civic Layer dataset uploads

## Civic Layer data storage strategy (decided — do not mix patterns)

Civic data is **cache-only on the read path**: `apps/web/data/budget-XXXX.json` is the source of truth and is loaded into an in-memory tree cache (`lib/civic-cache.ts`) on first access per fiscal year. **All civic JSON lives in one directory — `apps/web/data/`** (`budget-XXXX.json` per year + `fiscal-summary.json`), resolved at runtime as `process.cwd()/data`. There is no repo-root `data/` dir; do not re-introduce one or read via `../../data` (breaks the Vercel serverless bundle, which only includes the `apps/web` subtree). **All civic reads** — `/explore`, `/search`, `/api/civic/export/*`, project detail, drill-down, compare — read from this cache, never from Postgres. `BudgetLineItem` (Postgres) is a flat, write-side staging table populated during admin upload: the ETL step aggregates these rows into the `CivicBudgetYear` JSON tree (written to `apps/web/data/budget-XXXX.json`), and the table is otherwise only `deleteMany`'d by `fiscalYear` when a version is replaced/deleted. Do not add Postgres reads to civic serving routes. Full pipeline, workflow, and red-flag/leak/forecast rule details: `docs/analyzer-spec.md`.

## Priority matrix — Phase 0 focus (do not start Business Layer until Civic 0a is demo-ready)

**0a — Civic Layer (Weeks 1-2, ship first)**: `/explore` (Treemap + year selector + drill-down), `/search` (filters + table), `/project/[id]` (5-yr history), red flags Rules 1 & 2 only, CSV download, share/OG.

**0b — Business Layer thin slice (Weeks 3-4)**: email/password auth only (no Google OAuth yet), Excel-template upload only, auto-categorize, dashboard (cash flow + category breakdown only), leak detection = **Outlier rule only**, CSV export, Pro features via manual `isManuallyGranted` flag (no real payment flow).

Full phase breakdown (0/1/2, what's deferred and why): `docs/roadmap.md`

## Security implementation status (as of 2026-06-10 — do not regress)

These protections are live. Do not remove or reorder them:

- **Edge Rate Limiting** is Step 1 in `apps/web/middleware.ts` — runs before JWT decode and any DB query. Tiers: upload 5/min, auth 10/min, api 60/min. Any refactor of middleware must keep rate limiting first.
- **File sanitization** lives in `apps/web/lib/file-sanitizer.ts` — `sanitizeStringField()` (CSV injection) and `containsMacros()` (XLSX macro/VBA detection). Both are called in the upload route before DB insert. Do not remove these calls.
- **Pre-upload validation** (`Content-Length` + extension whitelist) runs before `file.arrayBuffer()` in the upload route — prevents memory exhaustion from large/invalid files.
- **Orphan cleanup cron** at `GET /api/internal/cleanup-orphans` (protected by `CRON_SECRET` env var). Recommended Vercel schedule `*/30 * * * *`. See `apps/web/lib/orphan-cleaner.ts`.
- **Version race condition** on `CivicDataVersion` is prevented by `@@unique([fiscalYear, version])` (schema backstop) + `prisma.$transaction` wrapping in the admin upload route.
- **`rawValues Json?`** on the `Transaction` model preserves pre-normalization row data for Phase 2 ML — do not strip this field during any future Transaction refactor.

## Coding conventions (summary — full list incl. Python: `docs/security.md`)

- TypeScript strict, no `any`. Functional components, one per file. PascalCase components / camelCase vars / kebab-case files.
- Tailwind + shadcn/ui only, no inline styles. Server Components for static Civic data, Client Components for interactive filters.
- Conventional commits (`feat:`, `fix:`, etc.), feature branches `feat/...` / `fix/...`.
- All UI text in Thai, code/variables in English. User-friendly Thai error messages.

## Important notes

- Portfolio project, not production SaaS — focus on clean code, good UX, and a polished Civic Layer demo (the part recruiters notice).
- Civic Layer is the public face — shareable, embeddable, SEO-friendly, `<meta og:image>` per project.
- PDF parsing is offline/team-only for Civic Layer (not a runtime concern); Business Layer Phase 0 only accepts the controlled Excel template.
- Forecasting is NOT AI/ML — always disclose it's a weighted moving average.
- Commit often with clear messages; cite data source on every Civic page (public domain data).
- README must include: hero screenshot of Civic Layer treemap, live demo link, tech stack, architecture diagram, two-layer concept explanation, lessons learned.

## Skills

- **graphify** (`skills/graphify/SKILL.md`) — turn any folder of code, docs, PDFs, or images into a queryable knowledge graph. Trigger: `/graphify`
  When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.
  Requires Python: `pip install graphifyy --break-system-packages`
  Example: `/graphify apps/web` → interactive HTML graph + Obsidian vault + GRAPH_REPORT.md in `apps/web/graphify-out/`

## Detail docs index

Read the relevant doc before working in that area — keeps context lean while still giving the full picture:

- `docs/project-brief.md` — business context, market analysis, pivot rationale, revenue model & unit economics
- `docs/business-logic-v2.md` — strategic feature breakdown, conversion funnel, v1→v2 comparison, validation checklist (Phase 0 scope here is synced with this file's Priority matrix)
- `docs/analyzer-spec.md` — Civic data pipeline, cache-only storage strategy detail, red flag rules (1-4 incl. fallbacks), leak detection rules, forecast formulas (WMA + seasonal + cash runway + what-if)
- `docs/database-schema.md` — full Prisma/SQL schema reference (all tables, enums, relations, indexes, migration phasing); `prisma/schema.prisma` is the source of truth, this doc explains groupings and decisions. JSON data shapes (BudgetData, SMEFinancialData) are in `docs/api-spec.md`
- `docs/api-spec.md` — every endpoint with request/response shapes (Civic, Auth, Business, Subscription, Admin, Parser microservice)
- `docs/routes-and-pages.md` — every page/route across all layers
- `docs/feature-specs.md` — detailed UI/behavior spec per feature (explorer, search, project detail, upload, dashboard, leak detection, forecasting, alerts)
- `docs/analytics-module-spec.md` — Business Layer 4-tier analytics blueprint (Descriptive/Diagnostic/Predictive/Prescriptive): architecture, schema, API design, phased plan — Predictive tier MUST stay WMA + Seasonal Index per the forecasting disclosure rule, never framed as ML
- `docs/fiscal-intelligence-spec.md` — Phase 2 Civic Layer expansion: macro fiscal overview (revenue/expenditure/balance/public debt), recipient/contractor red flags, company financial snapshots, TradingView-inspired interactive trend charts (`lightweight-charts`) — flags new data-sourcing dependencies and recommended build order
- `docs/design-system.md` — colors, spacing, typography, dark mode, Civic Layer component specifics (treemap, filter panel, breadcrumb, project detail layout)
- `docs/security.md` — input validation, file upload/injection defense, auth/authorization, rate limiting, secrets — plus full coding conventions
- `docs/sample-data.md` — Civic data sources, Excel template columns, sample SME file plan
- `docs/roadmap.md` — full Phase 0/1/2 breakdown with rationale for what's deferred and why
- `docs/dev-roadmap-2026-06-08.md` — original gap-analysis snapshot + dev table (status notes superseded by `roadmap.md`)
