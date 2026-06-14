# Database Schema (v2)

Database: PostgreSQL (Neon, prod + dev)
ORM: Prisma

> ⚠️ **`prisma/schema.prisma` is the single source of truth.** This document explains groupings, naming history, and non-obvious decisions — it does not duplicate the full schema. Always verify exact field types/defaults/relations against `prisma/schema.prisma`. (A previous version of this doc drifted significantly from the real schema — see migration baseline `20260614120000_baseline` for the recovery.)

## Overview

Two-layer architecture means two data domains:

1. **Civic Layer data**: Pre-processed government budget data — **cache-only on the read path** (decided, see `analyzer-spec.md` § Data storage strategy): `data/budget-XXXX.json` is the source of truth and is lazily loaded into an in-memory tree cache (`lib/civic-cache.ts`) per fiscal year. **All** civic reads — `/explore`, `/search`, `/api/civic/export/*`, drill-down, compare — serve from this cache. Postgres (`BudgetLineItem`) is a write-side ETL staging table, never read by serving routes.
2. **Business Layer data**: User accounts, uploaded files, parsed financial data, subscriptions, alerts, analytics. Stored in SQL.

For Civic Layer JSON structure, see `analyzer-spec.md`.

---

## Civic Layer storage

> ⚠️ Updated 2026-06-14 — earlier drafts of this doc described a "dual-store" target with `BudgetMinistry`/`BudgetDepartment`/`BudgetProject` Postgres tables serving `/search` and `/export`. Those tables were never built. The actual, implemented architecture is cache-only: `BudgetLineItem` is a flat ETL-staging table, and every civic read (including search/export/filter/pagination) is served from the in-memory cache built from `data/budget-XXXX.json`. Do not add Postgres reads to civic serving routes.

### Source of truth
- Location: `data/budget-{year}.json`, committed to repo — written by the ETL step on each admin upload

### In-memory tree cache (the only civic read path)
- Lazily loaded per fiscal year directly from `data/budget-{year}.json` (`JSON.parse`) on first request, via `lib/civic-cache.ts` — no Postgres round trip
- Serves **everything**: `/explore` treemap/sunburst, drill-down breadcrumb, year-over-year compare, red-flag aggregation, AND `/api/civic/search` / `/api/civic/export/*` (filter/sort/pagination run in-memory over the cached array)
- Small (≤ a few MB/year, ~4 years = single-digit MB total) — in-memory is appropriate at this scale

---

## Civic Layer SQL table — BudgetLineItem (write-side ETL staging, Postgres)

Flat, 1-row-per-line-item mirror of the parsed PDF/Excel budget documents (per the project's Data Dict). On admin upload, raw rows are bulk-inserted here; the ETL step then reads them back (`findMany({ where: { fiscalYear } })`) and aggregates them into the `CivicBudgetYear` JSON tree written to `data/budget-XXXX.json`. Roll-up mapping: `ministry` → ministry node, `budgetaryUnit` → department node, `output`/`project` (mutually exclusive — XOR) → project node, `categoryLv1-6` → per-project expenditure-category breakdown. Rows are removed via `deleteMany({ where: { fiscalYear } })` when a version is replaced/deleted. **Not queried by any serving route** — durable raw-data audit trail + ETL source only.

| Column          | Type     | Notes                                                                 |
|-----------------|----------|-----------------------------------------------------------------------|
| id              | String   | CUID, primary key                                                     |
| refDoc          | String   | Path to source Excel file (traceability/verification)                |
| refPageNo       | Int      | Page number in source document                                       |
| ministry        | String   | กระทรวง — Data Dict marks this `bool` but sample data is text (e.g. "กระทรวงวัฒนธรรม"); stored as String |
| strategy        | String?  | แผนยุทธศาสตร์                                                          |
| motherPlan      | String?  | แผนแม่บท                                                               |
| crossFunc       | Boolean  | Row belongs to an integrated plan (ชื่อขึ้นต้นด้วย "แผนงานบูรณาการ")    |
| budgetaryUnit   | String   | หน่วยรับงบประมาณ — มักเป็นกรม/หน่วยงานเทียบเท่ากรม                       |
| budgetPlan      | String   | แผนงานตาม พ.ร.บ.วิธีการงบประมาณฯ                                       |
| output          | String?  | ผลผลิต — XOR กับ `project`                                             |
| project         | String?  | โครงการ — XOR กับ `output`                                             |
| categoryLv1–Lv6 | String?  | หมวดงบรายจ่าย ลำดับชั้น 1–6 (รูปแบบ x.y.z ตามเอกสาร PDF)                |
| itemDescription | String?  | ชื่อรายการ — บาง row ไม่มี                                             |
| fiscalYear      | Int      | ปีงบประมาณ (ค.ศ.)                                                      |
| amount          | Decimal  | จำนวนเงินงบประมาณ — `@db.Decimal(15,2)`, Thai national budget rows can reach tens of billions |
| obliged         | Boolean  | งบผูกพัน — TRUE เมื่อ line item เดียวกันมีหลาย row คนละ FISCAL_YEAR       |
| createdAt       | DateTime |                                                                       |

**Indexes:** `(fiscalYear)` — the only column ever filtered on (`deleteMany`/`findMany` by `fiscalYear` during upload/delete)

---

## Auth & accounts

### User
Core account record. `role` gates admin routes; `lineNotifyToken` is a user-supplied LINE Notify personal access token used by the alerts system.

| Column          | Type      | Notes                                  |
|-----------------|-----------|-----------------------------------------|
| id              | String    | CUID, primary key                      |
| email           | String    | Unique                                 |
| name            | String    |                                        |
| passwordHash    | String?   | Null if OAuth-only                     |
| emailVerified   | DateTime? | Null until verified                    |
| googleId        | String?   | Unique if set (Google OAuth, Phase 1)  |
| role            | `UserRole`| MEMBER, ADMIN                          |
| avatarUrl       | String?   |                                        |
| organization    | String?   | Optional company/agency name           |
| banned          | Boolean   | Default false                          |
| lineNotifyToken | String?   | User-supplied LINE Notify token        |
| createdAt       | DateTime  |                                        |
| updatedAt       | DateTime  |                                        |

**Index:** `role`

**Relations** (1-to-many unless noted): `Subscription` (1:1), `File`, `Transaction`, `Alert`, `CategoryRule`, `AuthSession`, `Budget`, `SavedSearch`, `ProjectRating`, `PaymentRecord`, `MonthlyFinancialSummary`, `DiagnosticInsight`, `ForecastSnapshot`, `Recommendation`, `AdminLog` (as admin), `Workspace` (as owner, `"WorkspaceOwner"`), `WorkspaceMember` (as member, `"WorkspaceMemberships"`), `WorkspaceFile` (as sharer, `"WorkspaceShares"`), `ProjectComment` (`"ProjectComments"`), `ApiKey` (`"UserApiKeys"`)

### AuthSession
Active session tokens (alternative to stateless JWT).

| Column    | Type     | Notes                          |
|-----------|----------|--------------------------------|
| id        | String   | CUID, primary key              |
| userId    | String   | FK → User.id, cascade delete   |
| tokenHash | String   | Unique                         |
| userAgent | String?  |                                |
| ipAddress | String?  |                                |
| expiresAt | DateTime |                                |
| createdAt | DateTime |                                |

**Index:** `userId`

### PasswordReset
Forgot-password tokens.

| Column     | Type      | Notes                       |
|------------|-----------|-----------------------------|
| id         | String    | CUID, primary key           |
| userId     | String    | User.id — **no Prisma `@relation`** (see note below) |
| tokenHash  | String    | Unique                      |
| expiresAt  | DateTime  | 1 hour from creation        |
| usedAt     | DateTime? | Null if unused              |
| createdAt  | DateTime  |                             |

> **Note**: `userId` is a plain string column, not a Prisma foreign key — there is no cascade delete and no traversable relation to `User`. Tracked separately as a potential schema fix (add `@relation(fields: [userId], references: [id], onDelete: Cascade)`).

---

## Billing

### Subscription
One per user (1:1).

| Column                  | Type                  | Notes                          |
|-------------------------|-----------------------|---------------------------------|
| id                      | String                | CUID, primary key              |
| userId                  | String                | FK → User.id, unique, cascade  |
| plan                    | `SubscriptionPlan`    | FREE, PRO, TEAM                |
| status                  | `SubscriptionStatus`  | ACTIVE, CANCELLED, EXPIRED, TRIAL, PAST_DUE |
| billingCycle            | `BillingCycle`?       | MONTHLY, YEARLY                |
| currentPeriodStart      | DateTime?             |                                |
| currentPeriodEnd        | DateTime?             | Null for FREE plan             |
| cancelAtPeriodEnd       | Boolean               | Default false                  |
| trialEndsAt             | DateTime?             |                                |
| stripeCustomerId        | String?               | Unique (Phase 1 — not used in Phase 0) |
| stripeSubscriptionId    | String?               | Unique (Phase 1)               |
| stripeCheckoutSessionId | String?               | Phase 1                        |
| isManuallyGranted       | Boolean               | Default false — **Phase 0 Pro-grant mechanism** (no real payment flow yet, see roadmap.md) |
| createdAt               | DateTime              |                                |
| updatedAt               | DateTime              |                                |

**Relation:** `PaymentRecord[]`

### PaymentRecord
Payment/billing history. `amount` is in the smallest currency unit (satang) to avoid float rounding.

| Column          | Type          | Notes                                    |
|-----------------|---------------|--------------------------------------------|
| id              | String        | CUID, primary key                          |
| userId          | String        | FK → User.id, cascade                      |
| subscriptionId  | String?       | FK → Subscription.id (optional)            |
| amount          | Int           | Smallest currency unit (satang/cents)      |
| currency        | String        | Default `"thb"`                            |
| status          | String        | `"paid"` \| `"failed"` \| `"refunded"`     |
| description     | String?       |                                            |
| stripeInvoiceId | String?       | Unique                                     |
| paidAt          | DateTime?     |                                            |
| createdAt       | DateTime      |                                            |

**Index:** `userId`

---

## Business Layer — Files & transactions

### File
Uploaded SME financial file.

| Column           | Type               | Notes                                       |
|------------------|--------------------|-----------------------------------------------|
| id               | String             | CUID, primary key                          |
| userId           | String             | FK → User.id, cascade                      |
| filename         | String             | Original filename                          |
| fileSize         | Int                | Bytes                                      |
| fileType         | String             | "xlsx", "csv", "pdf"                       |
| sourceFormat     | `FileSourceFormat` | EXCEL_TEMPLATE, BANK_SCB, BANK_KBANK, BANK_BBL, PEAK, FLOWACCOUNT, CUSTOM |
| status           | `FileStatus`       | UPLOADING, PROCESSING, DONE, ERROR         |
| errorMessage     | String?            | If status = ERROR                          |
| storageKey       | String             | S3/R2 key or local path                    |
| fileHash         | String?            | SHA-256 of raw bytes — detects duplicate uploads before re-parsing |
| periodStart      | DateTime?          | Earliest transaction date                  |
| periodEnd        | DateTime?          | Latest transaction date                    |
| transactionCount | Int?               |                                            |
| totalIncome      | Decimal?           | `@db.Decimal(15,2)`                        |
| totalExpense     | Decimal?           | `@db.Decimal(15,2)`                        |
| uploadedAt       | DateTime           |                                            |
| processedAt      | DateTime?          |                                            |

**Indexes:** `userId`, `status`, `(userId, fileHash)`

**Relations:** `Transaction[]`, `Alert[]`, `WorkspaceFile[]` (Team plan sharing — see Phase 2 below)

### Transaction
Individual financial transaction from a parsed file.

| Column          | Type              | Notes                                  |
|-----------------|-------------------|-------------------------------------------|
| id              | String            | CUID, primary key                      |
| fileId          | String            | FK → File.id, cascade                  |
| userId          | String            | FK → User.id, cascade (denorm for query) |
| date            | DateTime          |                                        |
| description     | String            |                                        |
| category        | String            | e.g., "บุคลากร", "สาธารณูปโภค"          |
| amount          | Decimal           | `@db.Decimal(15,2)` — positive = income, negative = expense |
| transactionType | `TransactionType` | INCOME, EXPENSE                        |
| rowHash         | String?           | Deterministic hash for exact-duplicate detection across re-uploads |
| softKey         | String?           | Softer hash (no amount/category) for "same tx, different amount" detection |
| autoCategorized | Boolean           | Default true                           |
| userOverrode    | Boolean           | Default false                          |
| leakFlag        | `LeakFlag`        | NONE, SPIKE, DUPLICATE, OUTLIER, CREEP  |
| leakSeverity    | `Severity`?       | CRITICAL, WARNING, INFO                |
| leakReason      | String?           | Human-readable explanation              |
| metadata        | Json?             | `@db.JsonB` — extra context, queryable  |
| rawValues       | Json?             | `@db.JsonB` — pre-normalization raw row data (Phase 2 ML training input); NULL for rows imported before this column existed; never query in hot paths |

**Indexes:** `fileId`, `(userId, date)`, `category`, `leakFlag`, `(userId, rowHash)`, `(userId, softKey)`

**Relation:** `Alert[]`

### CategoryRule
User-defined category mapping rules (learns from manual overrides).

| Column        | Type     | Notes                              |
|---------------|----------|--------------------------------------|
| id            | String   | CUID, primary key                  |
| userId        | String   | FK → User.id, cascade              |
| keyword       | String   | Match against description          |
| category      | String   | Mapped category                    |
| priority      | Int      | Default 0 — higher wins on conflict |
| usageCount    | Int      | Default 0 — times this rule fired  |
| createdAt     | DateTime |                                    |

**Index:** `(userId, keyword)`

### Budget
Optional user-set budget per category, optionally scoped to a specific month.

| Column    | Type      | Notes                                                |
|-----------|-----------|---------------------------------------------------------|
| id        | String    | CUID, primary key                                    |
| userId    | String    | FK → User.id, cascade                                |
| category  | String    |                                                      |
| amount    | Decimal   | `@db.Decimal(15,2)`                                  |
| month     | String?   | "YYYY-MM" — null = standing budget applying to all months |
| createdAt | DateTime  |                                                      |
| updatedAt | DateTime  |                                                      |

**Unique:** `(userId, category, month)` · **Index:** `userId`

---

## Data Analytics Module (Phase 1/2)

Four-tier analytics framework — full rationale, data flow, and API design in `analytics-module-spec.md`. All tables here are **derived data**: safe to delete and recompute from `Transaction`.

### MonthlyFinancialSummary (Tier 1 — Descriptive)
Pre-aggregated monthly totals per category, computed batch (post-upload + nightly cron) instead of aggregating live on every dashboard load.

| Column       | Type     | Notes              |
|--------------|----------|--------------------|
| id           | String   | CUID, primary key  |
| userId       | String   | FK → User.id, cascade |
| month        | String   | "2026-06"          |
| category     | String   |                    |
| totalIncome  | Decimal  | `@db.Decimal(15,2)` |
| totalExpense | Decimal  | `@db.Decimal(15,2)` |
| txCount      | Int      |                    |
| computedAt   | DateTime |                    |

**Unique:** `(userId, month, category)` · **Index:** `(userId, month)`

### DiagnosticInsight (Tier 2 — Diagnostic)
Month/category-level anomaly explanations (root-cause narrative, not just a row-level flag).

| Column       | Type            | Notes                                            |
|--------------|-----------------|--------------------------------------------------|
| id           | String          | CUID, primary key                               |
| userId       | String          | FK → User.id, cascade                           |
| month        | String          |                                                  |
| category     | String          |                                                  |
| insightType  | `InsightType`   | category_spike, new_vendor_surge, seasonal_drop |
| summary      | String          | Thai-language explanation shown to the user     |
| relatedTxIds | Json            | `@db.JsonB` — array of `Transaction.id` root causes |
| createdAt    | DateTime        |                                                  |

**Index:** `(userId, month)`

### ForecastSnapshot (Tier 3 — Predictive)
Forecast result **with the inputs used**, so the UI can disclose "วิธีคิด" (method) per the project's anti-black-box rule. `method` must always match what's disclosed in the UI.

| Column           | Type              | Notes                                              |
|------------------|-------------------|------------------------------------------------------|
| id               | String            | CUID, primary key                                 |
| userId           | String            | FK → User.id, cascade                             |
| forecastMonth    | String            |                                                    |
| method           | `ForecastMethod`  | Default `WMA_SEASONAL` (only value currently)     |
| predictedNet     | Decimal           | `@db.Decimal(15,2)`                               |
| confidenceLow    | Decimal           | `@db.Decimal(15,2)`                               |
| confidenceHigh   | Decimal           | `@db.Decimal(15,2)`                               |
| cashRunwayMonths | Decimal?          | `@db.Decimal(6,2)`                                |
| inputWindow      | Json              | `@db.JsonB` — trailing months + weights + seasonal indices (disclosure) |
| whatIf           | Json?             | `@db.JsonB` — e.g. `{ "revenueChangePct": -10 }`  |
| generatedAt      | DateTime          |                                                    |

**Index:** `(userId, forecastMonth)`

### Recommendation (Tier 4 — Prescriptive)
Rule-engine output (if-then rules, not an optimizer/ML) the user can apply or dismiss.

| Column    | Type                       | Notes                                  |
|-----------|----------------------------|------------------------------------------|
| id        | String                     | CUID, primary key                     |
| userId    | String                     | FK → User.id, cascade                 |
| basedOn   | `RecommendationBasedOn`    | forecast, leak, diagnostic            |
| basedOnId | String                     | ID of the source record                |
| action    | String                     | Thai-language suggested action         |
| priority  | `RecommendationPriority`   | high, medium, low                      |
| status    | `RecommendationStatus`     | Default PENDING — PENDING, DISMISSED, APPLIED |
| createdAt | DateTime                   |                                        |

**Index:** `(userId, status)`

---

## Civic participation

### ProjectRating
Public "is this budget appropriate?" vote on a civic project. Either a logged-in user OR an anonymous IP hash, not both.

| Column    | Type                 | Notes                                  |
|-----------|----------------------|-------------------------------------------|
| id        | String               | CUID, primary key                      |
| projectId | String               | Civic budget project ID (from the JSON tree, not a Postgres FK) |
| userId    | String?              | FK → User.id, `onDelete: SetNull`      |
| vote      | `ProjectRatingVote`  | too_high, appropriate, too_low         |
| ipHash    | String?              | For anonymous votes                    |
| createdAt | DateTime             |                                        |

**Unique:** `(projectId, userId)`, `(projectId, ipHash)` · **Index:** `projectId`

### SavedSearch
Saved Civic Layer search/filter combinations (logged-in or anonymous via cookie).

| Column      | Type     | Notes                                              |
|-------------|----------|-------------------------------------------------------|
| id          | String   | CUID, primary key                                  |
| userId      | String?  | FK → User.id, cascade (null = anonymous)           |
| label       | String   |                                                    |
| filters     | Json     | `@db.JsonB` — serialized `SearchFilters`, queryable |
| resultCount | Int?     |                                                    |
| createdAt   | DateTime |                                                    |

**Index:** `userId`

---

## Alerts

### Alert
Generated alert from the rules engine (leak detection, budget overrun, low cash runway, etc.).

| Column        | Type        | Notes                                    |
|---------------|-------------|---------------------------------------------|
| id            | String      | CUID, primary key                       |
| userId        | String      | FK → User.id, cascade                   |
| fileId        | String?     | FK → File.id (optional)                 |
| transactionId | String?     | FK → Transaction.id (optional)          |
| type          | `AlertType` | LOW_RUNWAY, OVER_BUDGET, NEW_LEAK, DUPLICATE_PAYMENT, SUBSCRIPTION_EXPIRING |
| severity      | `Severity`  | CRITICAL, WARNING, INFO                  |
| title         | String      |                                          |
| message       | String      |                                          |
| context       | Json?       | `@db.JsonB` — additional structured data |
| read          | Boolean     | Default false                            |
| dismissed     | Boolean     | Default false                            |
| createdAt     | DateTime    |                                          |
| readAt        | DateTime?   |                                          |

**Indexes:** `(userId, read)`, `createdAt`

> Note: there is no `AlertSettings` table — per-user notification preferences (LINE on/off, frequency, thresholds) are not yet modeled; `User.lineNotifyToken` is the only related field today.

---

## Civic data admin tracking

### CivicDataVersion
Tracks each admin upload of civic budget data, including replace/delete history (append-only audit trail).

| Column            | Type                | Notes                                |
|-------------------|---------------------|----------------------------------------|
| id                | String              | CUID, primary key                    |
| fiscalYear        | String              | e.g. "2568"                          |
| version           | Int                 | Increments per upload for this fiscal year |
| uploadedBy        | String              | User.id (admin)                      |
| filename          | String              | Source file name                     |
| sourceFormat      | `CivicSourceFormat`| Default `xlsx` — xlsx, csv, html      |
| status            | `CivicDataStatus`  | Default `PROCESSING` — PROCESSING, ACTIVE, REPLACED, FAILED, DELETED |
| replacesVersionId | String?             | Self-relation (`"VersionHistory"`) — version this one replaces |
| errorLog          | String?             | Thai-friendly parse/validation error (when status = FAILED) |
| ministryCount     | Int                 |                                      |
| projectCount      | Int                 |                                      |
| redFlagCount      | Int                 |                                      |
| isActive          | Boolean             | Default true — only one active per fiscal year |
| uploadedAt        | DateTime            |                                      |
| notes             | String?             | Admin notes about this version       |

**Unique:** `(fiscalYear, version)` — prevents two concurrent uploads from both writing the same version (combined with a `prisma.$transaction` that reads `max(version)` and writes atomically)
**Indexes:** `(fiscalYear, isActive)`, `(fiscalYear, status)`, `status`

---

## Admin & audit

### AdminLog
Append-only admin action log. Uses a real FK to `User` (`onDelete: SetNull`) so the relation is traversable but the log survives admin account deletion.

| Column    | Type           | Notes                                                    |
|-----------|----------------|--------------------------------------------------------------|
| id        | String         | CUID, primary key                                        |
| adminId   | String?        | FK → User.id, `onDelete: SetNull` — null if admin account deleted |
| action    | `AdminAction`  | CIVIC_UPLOAD, CIVIC_DELETE, CIVIC_NOTES_EDIT              |
| targetId  | String?        | FK to affected record (e.g. `CivicDataVersion.id`)       |
| detail    | Json?          | `@db.JsonB` — fiscal year, filename, row counts, etc.     |
| ipHash    | String?        | First 16 hex chars of SHA-256(client IP)                  |
| createdAt | DateTime       |                                                            |

**Indexes:** `adminId`, `(action, createdAt)`

---

## Phase 2 — Team Workspace

Shared workspace for the Team plan: one owner, up to 5 seats.

### Workspace

| Column      | Type     | Notes                              |
|-------------|----------|--------------------------------------|
| id          | String   | CUID, primary key                  |
| name        | String   |                                    |
| slug        | String   | Unique — URL-safe identifier, e.g. "my-company" |
| description | String?  |                                    |
| ownerId     | String   | FK → User.id (`"WorkspaceOwner"`)  |
| createdAt   | DateTime |                                    |
| updatedAt   | DateTime |                                    |

**Indexes:** `ownerId`, `slug` · **Relations:** `WorkspaceMember[]`, `WorkspaceFile[]`

### WorkspaceMember
Includes the owner themselves at `OWNER` role. `userId` is null for pending email invites.

| Column      | Type                     | Notes                                  |
|-------------|--------------------------|-------------------------------------------|
| id          | String                   | CUID, primary key                      |
| workspaceId | String                   | FK → Workspace.id, cascade             |
| userId      | String?                  | FK → User.id (`"WorkspaceMemberships"`) — null until invite accepted |
| email       | String                   | Invite target if `userId` is null      |
| role        | `WorkspaceMemberRole`    | Default MEMBER — OWNER, ADMIN, MEMBER  |
| status      | `WorkspaceMemberStatus`  | Default INVITED — ACTIVE, INVITED, SUSPENDED |
| inviteToken | String?                  | Unique                                 |
| invitedAt   | DateTime                 |                                        |
| joinedAt    | DateTime?                |                                        |
| updatedAt   | DateTime                 |                                        |

**Unique:** `(workspaceId, email)` · **Indexes:** `workspaceId`, `userId`, `inviteToken`

### WorkspaceFile
A file shared into a workspace — the file remains owned by the uploading user.

| Column      | Type     | Notes                                  |
|-------------|----------|--------------------------------------------|
| id          | String   | CUID, primary key                      |
| workspaceId | String   | FK → Workspace.id, cascade              |
| fileId      | String   | FK → File.id                            |
| sharedById  | String   | FK → User.id (`"WorkspaceShares"`)      |
| sharedAt    | DateTime |                                        |

**Unique:** `(workspaceId, fileId)` · **Index:** `workspaceId`

---

## Phase 2 — Civic Comments

### ProjectComment
Public comment on a civic budget project. `projectId` references a civic JSON-tree project ID, not a Postgres FK.

| Column      | Type            | Notes                                          |
|-------------|-----------------|--------------------------------------------------|
| id          | String          | CUID, primary key                              |
| projectId   | String          | Civic budget project ID (from the JSON tree)   |
| userId      | String?         | FK → User.id (`"ProjectComments"`) — null for guests |
| guestName   | String?         | Display name for guest comments                |
| body        | String          | `@db.Text`                                     |
| status      | `CommentStatus` | Default `PENDING_REVIEW` — VISIBLE, PENDING_REVIEW, REJECTED |
| moderatedBy | String?         | Admin `User.id` who approved/rejected          |
| moderatedAt | DateTime?       |                                                |
| createdAt   | DateTime        |                                                |
| updatedAt   | DateTime        |                                                |

**Indexes:** `(projectId, status)`, `userId`, `status`

---

## Phase 2 — API Developer Access

### ApiKey
Personal API key for developer/integration access. `keyHash` stores a SHA-256 hex digest of the full key — the plaintext is shown once at creation and never stored. `keyPrefix` (first 8 chars) is for display only.

| Column     | Type      | Notes                                       |
|------------|-----------|-----------------------------------------------|
| id         | String    | CUID, primary key                          |
| userId     | String    | FK → User.id (`"UserApiKeys"`), cascade    |
| name       | String    | e.g. "My Integration", "Zapier"            |
| keyPrefix  | String    | First 8 chars, for display                 |
| keyHash    | String    | Unique — SHA-256 hex of the full key       |
| scopes     | String[]  | e.g. `["read:files", "read:reports"]`      |
| lastUsedAt | DateTime? |                                            |
| expiresAt  | DateTime? |                                            |
| revoked    | Boolean   | Default false                              |
| createdAt  | DateTime  |                                            |

**Indexes:** `userId`, `keyHash`

---

## Phase 2 — Fiscal Intelligence

### FiscalYearSummary
Thai national macro-fiscal summary per fiscal year (ปีงบประมาณ). Seeded from `data/fiscal-summary.json` — **not** a live API call. Source: สศค./กรมบัญชีกลาง/สบน./สำนักงบประมาณ. Full context in `fiscal-intelligence-spec.md`.

| Column           | Type      | Notes                                            |
|------------------|-----------|------------------------------------------------------|
| id               | String    | CUID, primary key                               |
| fiscalYear       | String    | Unique — e.g. "2568"                            |
| totalRevenue     | Decimal   | `@db.Decimal(15,2)` — รายได้รัฐบาล (ล้านบาท)     |
| totalExpenditure | Decimal   | `@db.Decimal(15,2)` — วงเงินงบประมาณ (ล้านบาท)   |
| balance          | Decimal   | `@db.Decimal(15,2)` — totalRevenue − totalExpenditure |
| publicDebt       | Decimal   | `@db.Decimal(15,2)` — หนี้สาธารณะคงค้าง           |
| gdpEstimate      | Decimal?  | `@db.Decimal(15,2)`                             |
| debtToGdpPct     | Decimal?  | `@db.Decimal(6,2)`                              |
| source           | String    | Default `"สำนักงานเศรษฐกิจการคลัง (สศค.)"`        |
| sourceNotes      | String?   |                                                  |
| publishedAt      | DateTime? |                                                  |
| createdAt        | DateTime  |                                                  |
| updatedAt        | DateTime  |                                                  |

**Index:** `fiscalYear`

---

## Enums

22 enums total, defined in `prisma/schema.prisma`:

| Enum                     | Values                                                              |
|--------------------------|----------------------------------------------------------------------|
| `UserRole`               | MEMBER, ADMIN                                                       |
| `SubscriptionPlan`       | FREE, PRO, TEAM                                                     |
| `SubscriptionStatus`     | ACTIVE, CANCELLED, EXPIRED, TRIAL, PAST_DUE                         |
| `BillingCycle`           | MONTHLY, YEARLY                                                     |
| `FileSourceFormat`       | EXCEL_TEMPLATE, BANK_SCB, BANK_KBANK, BANK_BBL, PEAK, FLOWACCOUNT, CUSTOM |
| `FileStatus`             | UPLOADING, PROCESSING, DONE, ERROR                                  |
| `TransactionType`        | INCOME, EXPENSE                                                     |
| `LeakFlag`               | NONE, SPIKE, DUPLICATE, OUTLIER, CREEP                              |
| `Severity`               | CRITICAL, WARNING, INFO                                             |
| `AlertType`              | LOW_RUNWAY, OVER_BUDGET, NEW_LEAK, DUPLICATE_PAYMENT, SUBSCRIPTION_EXPIRING |
| `InsightType`            | category_spike, new_vendor_surge, seasonal_drop                    |
| `ForecastMethod`         | WMA_SEASONAL                                                        |
| `RecommendationBasedOn`  | forecast, leak, diagnostic                                          |
| `RecommendationPriority` | high, medium, low                                                   |
| `RecommendationStatus`   | PENDING, DISMISSED, APPLIED                                         |
| `ProjectRatingVote`      | too_high, appropriate, too_low                                      |
| `CivicDataStatus`        | PROCESSING, ACTIVE, REPLACED, FAILED, DELETED                       |
| `CivicSourceFormat`      | xlsx, csv, html                                                     |
| `AdminAction`            | CIVIC_UPLOAD, CIVIC_DELETE, CIVIC_NOTES_EDIT                        |
| `WorkspaceMemberRole`    | OWNER, ADMIN, MEMBER                                                |
| `WorkspaceMemberStatus`  | ACTIVE, INVITED, SUSPENDED                                          |
| `CommentStatus`          | VISIBLE, PENDING_REVIEW, REJECTED                                   |

---

## Relationships

```
User (1) ── (1) Subscription
User (1) ──< (n) AuthSession
User (1) ──< (n) PaymentRecord
User (1) ──< (n) File
User (1) ──< (n) Transaction (denorm)
User (1) ──< (n) CategoryRule
User (1) ──< (n) Budget
User (1) ──< (n) Alert
User (1) ──< (n) SavedSearch (userId optional)
User (1) ──< (n) ProjectRating (userId optional, onDelete SetNull)
User (1) ──< (n) MonthlyFinancialSummary
User (1) ──< (n) DiagnosticInsight
User (1) ──< (n) ForecastSnapshot
User (1) ──< (n) Recommendation
User (1) ──< (n) AdminLog (as admin, onDelete SetNull)
User (1) ──< (n) Workspace (as owner)
User (1) ──< (n) WorkspaceMember (as member, userId optional)
User (1) ──< (n) WorkspaceFile (as sharer)
User (1) ──< (n) ProjectComment (userId optional)
User (1) ──< (n) ApiKey

Subscription (1) ──< (n) PaymentRecord (optional)

File (1) ──< (n) Transaction (cascade delete)
File (1) ──< (n) Alert (optional)
File (1) ──< (n) WorkspaceFile

Transaction (1) ──< (n) Alert (optional)

Workspace (1) ──< (n) WorkspaceMember (cascade delete)
Workspace (1) ──< (n) WorkspaceFile (cascade delete)

CivicDataVersion (1) ──< (n) CivicDataVersion (self-relation "VersionHistory" — replacesVersion / replacedBy)

PasswordReset.userId — plain string, NO Prisma relation to User (see Auth & accounts § PasswordReset)
```

---

## Free plan limits (enforced at API level)

| Resource         | Free Limit | Pro Limit  | Team Limit          |
|------------------|------------|------------|---------------------|
| File uploads/mo  | 3          | Unlimited  | Unlimited           |
| File size        | 10 MB      | 50 MB      | 50 MB               |
| Forecast access  | No         | Yes        | Yes                 |
| Leak detection   | No         | Yes        | Yes                 |
| Compare files    | No         | Yes        | Yes                 |
| PDF export       | No         | Yes        | Yes                 |
| Alerts           | No         | Email      | Email + LINE        |
| Workspace seats  | 1          | 1          | 5                   |
| Data retention   | 6 months   | Unlimited  | Unlimited           |

---

## Migration strategy

Current live schema = single baseline migration `20260614120000_baseline` (covers all 25 tables / 22 enums above) + `20260614130000_civic_lineitem_index_cleanup`. The phases below describe **feature rollout order** (API/UI), not DB migration order — all tables already exist in the baseline.

### Phase 0 (MVP) — matches trimmed scope in `CLAUDE.md`
- `User`, email/password auth only (Google OAuth fields unused until Phase 1)
- `Subscription` with `isManuallyGranted` flag (no Stripe integration yet)
- `File`, `Transaction` with `leakFlag`/`leakSeverity`/`leakReason` populated by the **Outlier rule only**
- `BudgetLineItem` (Postgres ETL staging) + in-memory cache from `data/budget-XXXX.json` (cache-only read path — see above) with Rules 1 & 2 red flags only
- `CivicDataVersion` for admin upload tracking

### Phase 1
- Google OAuth fields on `User`
- Remaining leak detection rules (Spike, Duplicate, Creep) on `Transaction`
- `Alert`
- Stripe fields on `Subscription` + `PaymentRecord`
- `CategoryRule` learning system
- `MonthlyFinancialSummary` / `DiagnosticInsight` (Analytics Tier 1/2) and `ForecastSnapshot` (Tier 3) — see `analytics-module-spec.md` Phase A/B

### Phase 2
- `Workspace`, `WorkspaceMember`, `WorkspaceFile` for Team plan
- `Budget` targets
- `ProjectComment` (civic comments)
- `ApiKey` (developer API access)
- `FiscalYearSummary` (macro fiscal data — see `fiscal-intelligence-spec.md`)
- `Recommendation` (Analytics Tier 4 — see `analytics-module-spec.md` Phase C)
- `AdminLog` for admin audit trail

---

## Performance notes

- **Civic Layer**: Cache-only (see above) — all reads (tree, search, export, filter, pagination) come from the in-memory cache built from `data/budget-XXXX.json`. Postgres `BudgetLineItem` is write-side ETL staging only; never query it from a serving route.
- **Business Layer**: Index on `(userId, date)` for `Transaction` is critical — most queries filter by user + date range.
- **Analytics**: Tier 1-3 tables (`MonthlyFinancialSummary`, `DiagnosticInsight`, `ForecastSnapshot`) are pre-computed batch (post-upload + nightly cron), not aggregated live — see `analytics-module-spec.md`.
- **JSONB fields** (`Transaction.metadata`/`rawValues`, `DiagnosticInsight.relatedTxIds`, `ForecastSnapshot.inputWindow`/`whatIf`, `Alert.context`, `AdminLog.detail`, `SavedSearch.filters`) are queryable via Prisma's JSON filtering but are not indexed — avoid filtering on them in hot paths.
- **Forecast**: Computed on demand via the Python parser microservice, persisted to `ForecastSnapshot` — not recomputed on every dashboard load.
- **Leak detection**: Computed once when file is processed, results stored on `Transaction.leakFlag`. Recompute if user adds more transactions.
