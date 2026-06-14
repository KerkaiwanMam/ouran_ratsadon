# Priority matrix / roadmap

> ส่วนขยายจาก CLAUDE.md — แหล่งอ้างอิงหลักสำหรับ scope ต่อ phase (sync แล้วกับ business-logic-v2.md และ database-schema.md ณ 2026-06-08)

## Phase 0 — Portfolio MVP (Month 1) — focus here

Phase 0 is split into two two-week sub-phases so the most important deliverable (Civic Layer, "the impressive part for recruiters") gets full focus and a working demo exists at the midpoint — instead of both layers being half-built at the end of the month. **Do not start Business Layer work until Civic Layer P0a is demo-ready.**

### 0a — Civic Layer (Weeks 1-2, ship first, this is the priority)
- Pre-process 1 fiscal year of data manually (2568 only — a second year is a Phase 0 stretch goal, not a requirement)
- `/explore` page with Treemap view + year selector + drill-down to ministry
- `/search` page with filter panel + result table + active filter tags
- `/project/[id]` detail page with 5-year history
- Red flag detection (Rules 1 & 2 only — with the fallback handling defined in `analyzer-spec.md`)
- CSV download
- Share URL + basic OG image

### 0b — Business Layer minimal slice (Weeks 3-4, deliberately thin)
- Auth: **email/password only** for Phase 0 (Google OAuth moved to Phase 1 — it adds OAuth app setup, callback handling, and account-linking edge cases that aren't core to the demo)
- File upload (Excel template only)
- Auto-categorization (keyword matching)
- Dashboard: cash flow + category breakdown only (no Budget vs Actual — that needs a budget-setting feature not yet designed)
- Basic leak detection: **Outlier rule only** (Monthly Spike requires 3 months of trailing data most demo users won't have — ship it in Phase 1 alongside the other rules once there's real usage data to validate against)
- CSV export
- "Pro" features are **manually granted** via an admin-set `isManuallyGranted` flag on `Subscription` — there is no checkout flow, no plan-gating UI beyond a simple role check. This unblocks demoing Pro-only screens without building payment infrastructure.

### Out of scope for Phase 0 (moved to Phase 1 unless noted)
- Google OAuth (→ Phase 1)
- Monthly Spike leak rule, Recurring Cost Creep, Duplicate Payment (→ Phase 1, alongside full leak-rule validation)
- Sunburst view, Map view, year-over-year comparison
- Bank statement parsing, accounting export parsing
- Forecast, what-if, alerts
- PDF export
- Team workspace
- Payment integration (manual `isManuallyGranted` flag stands in — see 0b)
- Budget vs Actual comparison

## Phase 1 — Beta (Month 2-3)
- Google OAuth (moved from Phase 0)
- Remaining leak detection rules: Monthly Spike, Duplicate Payment, Recurring Cost Creep (moved from Phase 0 — validate against real usage data first)
- Budget vs Actual comparison
- Sunburst + Map views in Civic Layer
- All 4 red flag rules
- Embed widget for Civic Layer
- Saved searches & comparison view in `/search` (deep-linkable filter states) — see `feature-specs.md`
- Civic participation: project rating + comments on `/project/[id]` (phase 1 = rating only; comments/moderation queue may slip to Phase 2 depending on moderation tooling readiness) — see `feature-specs.md`
- Cash flow forecasting (Pro) + Diagnostic Analytics ("ทำไมตัวเลขถึงเปลี่ยน" drill-down) — see `analytics-module-spec.md` Tier 1-3 (Phase A/B)
- What-if scenarios
- Alerts (email only)
- PDF export
- Payment integration (Stripe/Omise)
- 14-day free trial

## Phase 2 — Growth (Month 4-6)
- LINE notification
- Team workspace + comments
- Bank statement formats (SCB, KBANK, BBL)
- Accounting export formats (PEAK, FlowAccount)
- API access for developers
- Admin civic data upload UI
- Full admin panel
- Vendor/counterparty pattern detection (Pro) — fuzzy-grouped vendor profiles + cross-links to flagged transactions, see `feature-specs.md`
- Civic participation comment moderation (if deferred from Phase 1)
- Prescriptive Analytics: rule-engine recommendations (Tier 4) — "Next-best-action" suggestions derived from forecast + diagnostic output, see `analytics-module-spec.md` Phase C
- **Fiscal Intelligence** (new Civic Layer area — requires new data sourcing, see `fiscal-intelligence-spec.md` for full scope/order):
  - Macro Fiscal Overview page (`/fiscal-overview`): national revenue/expenditure/balance/public debt trend, TradingView-inspired interactive chart (recommend `lightweight-charts`) — build this part first, clearest data source
  - Recipient-level red flags (extends existing `RedFlag` system to the contractor/recipient level — concentration, repeat-flagged recipients)
  - Recipient profiles (`/recipient/[id]`) + listed-company financial snapshots for government contractors — flagged as stretch/lower-priority due to cross-dataset joins (e-GP procurement data ↔ budget data ↔ SET filings) that aren't trivial to assemble

---

## Status snapshot (2026-06-08)

**Phase 0 is complete.** `apps/web`, `apps/parser`, `prisma/schema.prisma`, and `data/` are scaffolded; both Civic Layer 0a (`/explore`, `/search`, `/project/[id]`, red flags Rules 1-2, share/OG, CSV download) and Business Layer 0b (auth, Excel upload + dedup, dashboard, Outlier leak rule, CSV export, manual Pro grants) are built — exceeding the documented Phase 0 scope in places (34 pages already exist across all route groups). README, sample data, and the Excel template are in place. See `dev-roadmap-2026-06-08.md` for the original gap analysis (superseded; its "no code scaffolded" framing no longer applies).

The last remaining Phase 0 gap — CSV export on `/search` (`GET /api/civic/export/csv`, per `api-spec.md` line 248) — has been implemented and wired into the page's results toolbar.

**Phase 1 is complete (2026-06-09).** All Phase 1 items verified built: Google OAuth, all leak rules (Monthly Spike, Duplicate Payment, Recurring Cost Creep), Budget vs Actual, Sunburst + upgraded Map view (real province data), all 4 red flag rules, embed widgets, saved searches UI + comparison view (`/compare`), project rating (RatingWidget wired on project page), 4-tier analytics (Descriptive/Diagnostic/Predictive/Prescriptive), what-if scenarios, email alerts (Resend), PDF export, Stripe + 14-day trial. Additionally: MinistryTreemap upgraded to 3-level drill-down with project list panel, `/ministry/[id]` detail page.

Phase 2 work starts now per the list above.

**Phase 2 complete (2026-06-09).** All Phase 2 items built:

- **Macro Fiscal Intelligence**: `data/fiscal-summary.json` (2558–2568, 11 years), `FiscalYearSummary` Prisma model, `GET /api/civic/fiscal`, `/fiscal-overview` page (Recharts ComposedChart, stat strip, debt/GDP bar, data table), fiscal context bar on `/explore` (SWR-fetched amber banner)
- **Bank statement parsing**: `apps/parser/parsers/bank_statement_parser.py` (SCB, KBANK, BBL; BE/AD date, Thai dash, channel inference), `POST /parse/bank-statement` endpoint, upload UI tabs wired with two-stage parser→API flow
- **Accounting export parsing**: `apps/parser/parsers/accounting_export_parser.py` (PEAK, FlowAccount; header autodetect, column aliases, BE/AD date), `POST /parse/accounting-export` endpoint, upload UI tabs (PEAK, FlowAccount) added
- **Team workspace**: `Workspace`, `WorkspaceMember`, `WorkspaceFile` Prisma models, `GET/POST /api/workspace`, `GET/POST /api/workspace/[id]/members`, workspace invite email (Resend), `/workspace` dashboard page, `POST /api/workspace/join` + `/workspace/join` accept page
- **Civic comment threads**: `ProjectComment` Prisma model, `GET/POST /api/civic/comments` (rate-limited 3/min, auto-approve logged-in, guest→PENDING_REVIEW), `CommentThread` client component (paginated, char counter, guest name, avatar), wired on `/project/[id]`
- **Admin comment moderation**: `/admin/comments` page (filter tabs, approve/reject buttons), `GET /api/admin/comments`, `PATCH /api/admin/comments/[id]`
- **Auth helpers**: `lib/auth-helpers.ts` (`requireAuth`, `requireAdmin`, `getOptionalAuth`, `getOptionalAuthFromCookies`) — wired into all new API routes; `lib/prisma.ts` re-export shim; `lib/tokens.ts` (`generateToken`)
- **LINE Notify**: `lib/line-notify.ts` (fire-and-forget, `sendLineNotify` + `sendAlertLineNotify`), `lineNotifyToken` on User schema, wired into `lib/alert-triggers.ts` (parallel to email), LINE Notify UI section added to `/settings/notifications`, `GET/PATCH /api/settings/notifications`, `POST /api/settings/notifications/test-line`
- **API developer access**: `ApiKey` Prisma model (keyHash SHA-256, keyPrefix display, scopes array, revoked flag), `GET/POST /api/developer/keys`, `DELETE /api/developer/keys/[id]`, `/settings/developer` page (create form, scope checkboxes, plaintext reveal once, revoke)

**Update (2026-06-08, later):** The 4-tier analytics module (`analytics-module-spec.md`) is now built end-to-end:
- Tier 1 Descriptive — `MonthlyFinancialSummary` rollups (`lib/analytics/summary.ts`, `GET /api/business/analytics/summary`), recomputed on every upload
- Tier 2 Diagnostic — z-score based `DiagnosticInsight` generation (`lib/analytics/diagnose.ts`, `GET /api/business/analytics/diagnose`), also recomputed on upload
- Tier 3 Predictive — `lib/analytics/predict.ts` wraps the existing `lib/forecaster.ts` WMA + Seasonal Index engine (no reimplementation, no AI/ML — disclosure preserved verbatim) and persists `ForecastSnapshot` rows via `GET/POST /api/business/analytics/forecast`
- Tier 4 Prescriptive — simple if-then `Recommendation` rule engine (`lib/analytics/recommend.ts`, `GET/POST /api/business/analytics/recommendations` + `PATCH .../[id]` for apply/dismiss)
- UI — new `/analytics` page (`app/(dashboard)/analytics/page.tsx`) showing all four tiers, linked from the sidebar and protected by middleware

Also corrected an earlier inaccurate status report: Google OAuth, Cash Flow Forecasting (WMA+Seasonal), What-if scenarios, PDF export, and Stripe payment integration **already existed** in the codebase prior to this session — they were mistakenly listed as "not yet built" in an earlier audit.

**Security Audit + API Documentation (2026-06-10).**

Full security audit completed; 6 fixes applied and pushed to Neon via `prisma db push`:

- **Fix #1 — Rate Limiter Position** (`apps/web/middleware.ts`): IP-based rate limiting moved to Step 1 in Edge middleware, before JWT decode and any DB I/O. Uses in-process `Map<string, RateBucket>` in Edge runtime. Tiers: `/api/files/upload` → 5/min, `/api/auth` → 10/min, all other `/api/*` → 60/min. Prevents DDoS from consuming DB connections.
- **Fix #2 — CSV Injection + XLSX Macro Detection** (`apps/web/lib/file-sanitizer.ts`, NEW): `sanitizeStringField()` prepends `'` to formula-trigger chars (`=`, `+`, `-`, `@`, `\t`, `\r`). `containsMacros(buffer)` scans XLSX ZIP bytes for `xl/vbaProject.bin` without full extraction (O(1)). Applied in `apps/web/app/api/files/upload/route.ts`.
- **Fix #3 — Pre-upload Header Validation** (`apps/web/app/api/files/upload/route.ts`): `Content-Length` header and extension whitelist checked before `file.arrayBuffer()` is called — rejects oversized uploads and invalid extensions without reading the body into memory.
- **Fix #4 — Orphan File Cleanup Cron** (`apps/web/lib/orphan-cleaner.ts`, NEW + `apps/web/app/api/internal/cleanup-orphans/route.ts`, NEW): Cron-triggered endpoint (protected by `x-cron-secret`) marks PROCESSING orphans (>1 hr) and UPLOADING orphans (>30 min) as ERROR. TODO stub for R2 object deletion when presigned URL flow is live. Recommended Vercel schedule: `*/30 * * * *`.
- **Fix #5 — Version Race Condition** (`prisma/schema.prisma`, `apps/web/app/api/admin/civic-data/upload/route.ts`): `@@unique([fiscalYear, version])` added to `CivicDataVersion` as hard backstop. Version calculation (`getNextVersionInTx`) wrapped in `prisma.$transaction` so concurrent uploads for the same fiscal year cannot both read the same max version and collide.
- **Fix #6 — rawValues Preservation for Phase 2 ML** (`prisma/schema.prisma`): `rawValues Json? @db.JsonB` added to `Transaction` model. Stores pre-normalization row per source format (EXCEL_TEMPLATE, BANK_SCB, PEAK, etc.) so Phase 2 ML retraining can read original values without re-parsing old files. Pre-migration rows have NULL.

Additionally: full Next.js API reference (`docs/nextjs-api.html`) — standalone HTML with sidebar nav, accordion cards, 47 routes across Civic, Auth, Business, Admin, and Internal layers. FastAPI Swagger UI tag grouping fixed (`openapi_tags` + `tags` on all endpoints).

**Architecture documentation updated.** 3-tab interactive diagram covers: (1) API Gateway & Security Layer with rate-limit-first middleware stack; (2) File Storage & Presigned URL target flow with all validation steps; (3) Future data pipeline with 4-tier analytics and rawValues ML preservation callout.

**Phase 3 — Conversational AI assistant (2026-06-14).** The user-facing top of the 3-layer "AI-on-Top" model (`budget-intelligence-frontend` skill) is built, Pro-gated:

- **Governed-context assembler** (`apps/web/lib/assistant/context.ts`) — pulls only aggregates (`getDescriptiveSummary` + `getDiagnosticInsights` + `getLatestForecastSnapshot` + `getRecommendations`) into a compact bundle. **No raw `Transaction` rows ever reach the reply engine** (PDPA + anti-hallucination boundary).
- **`POST /api/business/chat`** (`apps/web/app/api/business/chat/route.ts`) — Node runtime, Pro gate identical to `/api/business/vendors`. Replies are produced by a **zero-cost rule-based engine** (`apps/web/lib/assistant/rules.ts`): keyword-matched Thai intents (top categories, anomalies, forecast, cash runway, recommendations, month comparison, summary) rendered as templates from the governed context, with citations turned into drill-down hrefs (`/transactions?category=&month=` or `/analytics`). No external API, no token cost, no API key. Forecast disclosure (WMA+Seasonal, not AI/ML) is baked into the template text.
- **`/assistant` page** (`apps/web/app/(dashboard)/assistant/page.tsx`) — Thai chat UI, client-held history, citation chips, suggested starter questions, Pro-upsell gate. Entry points: Sidebar "ผู้ช่วย AI" (PRO) + dashboard narrative card "ถาม AI เพิ่มเติม".
- **Rate limit**: dedicated `chat` tier (15/min per IP) retained in `middleware.ts` above the generic `/api/` tier, preserving rate-limiting-first. `/assistant` added to `PROTECTED_PREFIXES` + matcher.
- **2026-06-14 (later, same day) — switched off Anthropic API**: the initial build used `@anthropic-ai/sdk` (`ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`, pay-per-token, no free tier). Replaced with the rule-based engine above to keep the feature free; `@anthropic-ai/sdk` uninstalled, env placeholders removed, dead "unconfigured" (503) UI gate removed.

Deferred: a free-tier LLM (e.g. Google Gemini free tier) for free-form Q&A beyond the fixed intents — would slot in as an optional upgrade on top of the rule-based fallback. Also deferred: streaming responses, conversation persistence (`ChatMessage` model — history is client-held for now).
