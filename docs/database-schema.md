# Database Schema (v2)

Database: SQLite (development), PostgreSQL (production)
ORM: Prisma

## Overview

Two-layer architecture means two data domains:

1. **Civic Layer data**: Pre-processed government budget data — **cache-only on the read path** (decided, see `analyzer-spec.md` § Data storage strategy): `data/budget-XXXX.json` is the source of truth and is lazily loaded into an in-memory tree cache (`lib/civic-cache.ts`) per fiscal year. **All** civic reads — `/explore`, `/search`, `/api/civic/export/*`, drill-down, compare — serve from this cache. Postgres (`BudgetLineItem`) is a write-side ETL staging table, never read by serving routes.
2. **Business Layer data**: User accounts, uploaded files, parsed financial data, subscriptions, alerts. Stored in SQL.

This document focuses on the SQL schema. For Civic Layer JSON structure, see `database-schema.md` § Data schemas below and `analyzer-spec.md`.

---

## Civic Layer storage

> ⚠️ Updated 2026-06-14 — earlier drafts of this doc described a "dual-store" target with `BudgetMinistry`/`BudgetDepartment`/`BudgetProject` Postgres tables serving `/search` and `/export`. Those tables were never built. The actual, implemented architecture is cache-only: `BudgetLineItem` is a flat ETL-staging table, and every civic read (including search/export/filter/pagination) is served from the in-memory cache built from `data/budget-XXXX.json`. Do not add Postgres reads to civic serving routes.

### Source of truth
- Location: `data/budget-{year}.json`, committed to repo — written by the ETL step on each admin upload

### In-memory tree cache (the only civic read path)
- Lazily loaded per fiscal year directly from `data/budget-{year}.json` (`JSON.parse`) on first request, via `lib/civic-cache.ts` — no Postgres round trip
- Serves **everything**: `/explore` treemap/sunburst, drill-down breadcrumb, year-over-year compare, red-flag aggregation, AND `/api/civic/search` / `/api/civic/export/*` (filter/sort/pagination run in-memory over the cached array)
- Small (≤ a few MB/year, ~4 years = single-digit MB total) — in-memory is appropriate at this scale

### CivicDataVersion (tracks admin uploads)
| Column        | Type     | Notes                                |
|---------------|----------|--------------------------------------|
| id            | String   | CUID, primary key                    |
| fiscalYear    | String   | e.g. "2568"                          |
| version       | Int      | Increments per upload                |
| uploadedBy    | String   | FK → User.id (admin)                 |
| filename      | String   | Source file name                     |
| ministryCount | Int      |                                      |
| projectCount  | Int      |                                      |
| redFlagCount  | Int      |                                      |
| isActive      | Boolean  | Only one active per year             |
| uploadedAt    | DateTime |                                      |
| notes         | String?  | Admin notes about this version       |

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

## Core SQL tables

### User
Core user account.

| Column        | Type     | Notes                                  |
|---------------|----------|----------------------------------------|
| id            | String   | CUID, primary key                      |
| email         | String   | Unique, indexed                        |
| name          | String   |                                        |
| passwordHash  | String?  | Null if OAuth-only                     |
| emailVerified | DateTime?| Null until verified                    |
| googleId      | String?  | Unique if set (Google OAuth)           |
| role          | Role     | MEMBER, ADMIN                          |
| avatarUrl     | String?  |                                        |
| organization  | String?  | Optional company/agency name           |
| banned        | Boolean  | Default false                          |
| createdAt     | DateTime |                                        |
| updatedAt     | DateTime |                                        |

**Indexes:** `email`, `googleId`, `role`

### Subscription
Billing plan per user.

| Column            | Type               | Notes                          |
|-------------------|--------------------|--------------------------------|
| id                | String             | CUID, primary key              |
| userId            | String             | FK → User.id, unique           |
| plan              | Plan               | FREE, PRO, TEAM                |
| status            | SubscriptionStatus | ACTIVE, CANCELLED, EXPIRED, TRIAL |
| billingCycle      | BillingCycle?      | MONTHLY, YEARLY                |
| currentPeriodStart| DateTime?          |                                |
| currentPeriodEnd  | DateTime?          | Null for FREE plan             |
| cancelAtPeriodEnd | Boolean            | Default false                  |
| trialEndsAt       | DateTime?          |                                |
| stripeCustomerId  | String?            |                                |
| stripeSubscriptionId | String?         |                                |
| createdAt         | DateTime           |                                |
| updatedAt         | DateTime           |                                |

**Indexes:** `userId`, `stripeSubscriptionId`

### Payment
Payment history per subscription.

| Column          | Type           | Notes                       |
|-----------------|----------------|-----------------------------|
| id              | String         | CUID, primary key           |
| subscriptionId  | String         | FK → Subscription.id        |
| userId          | String         | FK → User.id (denorm)       |
| amount          | Int            | THB (no decimals)           |
| status          | PaymentStatus  | SUCCESS, FAILED, REFUNDED   |
| stripePaymentId | String?        |                             |
| invoiceUrl      | String?        |                             |
| paidAt          | DateTime       |                             |
| createdAt       | DateTime       |                             |

### Workspace (for Team plan)
Multi-user workspace.

| Column      | Type     | Notes                              |
|-------------|----------|------------------------------------|
| id          | String   | CUID, primary key                  |
| name        | String   |                                    |
| ownerId     | String   | FK → User.id                       |
| plan        | Plan     | TEAM only                          |
| seatLimit   | Int      | Default 5                          |
| createdAt   | DateTime |                                    |

### WorkspaceMember
Member of a workspace.

| Column      | Type            | Notes                          |
|-------------|-----------------|--------------------------------|
| id          | String          | CUID, primary key              |
| workspaceId | String          | FK → Workspace.id              |
| userId      | String          | FK → User.id                   |
| role        | WorkspaceRole   | OWNER, ADMIN, MEMBER, VIEWER   |
| invitedBy   | String          | FK → User.id                   |
| joinedAt    | DateTime        |                                |

**Unique:** `(workspaceId, userId)`

---

## Business Layer — File and analysis

### File
Uploaded SME financial file.

| Column         | Type        | Notes                                       |
|----------------|-------------|---------------------------------------------|
| id             | String      | CUID, primary key                           |
| userId         | String      | FK → User.id                                |
| workspaceId    | String?     | FK → Workspace.id (for Team plan)           |
| filename       | String      | Original filename                           |
| fileSize       | Int         | Bytes                                       |
| fileType       | String      | "xlsx", "csv", "pdf"                        |
| sourceFormat   | SourceFormat| EXCEL_TEMPLATE, BANK_SCB, BANK_KBANK, BANK_BBL, PEAK, FLOWACCOUNT |
| status         | FileStatus  | UPLOADING, PROCESSING, DONE, ERROR          |
| errorMessage   | String?     | If status = ERROR                           |
| storageKey     | String      | S3/R2 key or local path                     |
| periodStart    | DateTime?   | Earliest transaction date                   |
| periodEnd      | DateTime?   | Latest transaction date                     |
| transactionCount | Int?      |                                             |
| totalIncome    | Decimal?    |                                             |
| totalExpense   | Decimal?    |                                             |
| uploadedAt     | DateTime    |                                             |
| processedAt    | DateTime?   |                                             |

**Indexes:** `userId`, `workspaceId`, `status`

### Transaction
Individual financial transaction from a parsed file.

| Column         | Type        | Notes                                  |
|----------------|-------------|----------------------------------------|
| id             | String      | CUID, primary key                      |
| fileId         | String      | FK → File.id (cascade delete)          |
| userId         | String      | FK → User.id (denorm for query)        |
| date           | DateTime    |                                        |
| description    | String      |                                        |
| category       | String      | e.g., "บุคลากร", "สาธารณูปโภค"          |
| amount         | Decimal     | Positive for income, negative expense  |
| transactionType| TxType      | INCOME, EXPENSE                        |
| autoCategorized| Boolean     | True if from keyword matching          |
| userOverrode   | Boolean     | True if user manually changed category |
| leakFlag       | LeakFlag    | NONE, SPIKE, DUPLICATE, OUTLIER, CREEP |
| leakSeverity   | Severity?   | CRITICAL, WARNING                      |
| leakReason     | String?     | Human-readable explanation             |
| metadata       | Json?       | Raw row data + extra fields            |

**Indexes:** `fileId`, `userId`, `date`, `category`, `leakFlag`

### CategoryRule
User-defined category mapping rules (learns from manual overrides).

| Column        | Type     | Notes                              |
|---------------|----------|------------------------------------|
| id            | String   | CUID, primary key                  |
| userId        | String   | FK → User.id                       |
| keyword       | String   | Match against description          |
| category      | String   | Mapped category                    |
| priority      | Int      | Higher wins on conflict            |
| usageCount    | Int      | Times this rule fired              |
| createdAt     | DateTime |                                    |

**Indexes:** `userId`, `keyword`

### Budget
Optional user-set budget per category.

| Column      | Type     | Notes                            |
|-------------|----------|----------------------------------|
| id          | String   | CUID, primary key                |
| userId      | String   | FK → User.id                     |
| category    | String   |                                  |
| monthlyAmount | Decimal|                                  |
| createdAt   | DateTime |                                  |

**Unique:** `(userId, category)`

---

## Alerts and notifications

### Alert
Generated alert from rules engine.

| Column        | Type        | Notes                              |
|---------------|-------------|------------------------------------|
| id            | String      | CUID, primary key                  |
| userId        | String      | FK → User.id                       |
| fileId        | String?     | FK → File.id (if file-related)     |
| transactionId | String?     | FK → Transaction.id                |
| type          | AlertType   | LOW_RUNWAY, OVER_BUDGET, NEW_LEAK, DUPLICATE_PAYMENT |
| severity      | Severity    | CRITICAL, WARNING, INFO            |
| title         | String      |                                    |
| message       | String      |                                    |
| context       | Json?       | Additional structured data         |
| read          | Boolean     | Default false                      |
| dismissed     | Boolean     | Default false                      |
| createdAt     | DateTime    |                                    |
| readAt        | DateTime?   |                                    |

**Indexes:** `userId, read`, `createdAt`

### AlertSettings
Per-user notification preferences.

| Column                 | Type       | Notes                          |
|------------------------|------------|--------------------------------|
| id                     | String     | CUID, primary key              |
| userId                 | String     | FK → User.id, unique           |
| emailEnabled           | Boolean    | Default true                   |
| lineEnabled            | Boolean    | Default false                  |
| lineUserId             | String?    | LINE Notify token              |
| frequency              | Frequency  | REALTIME, DAILY, WEEKLY        |
| triggerLowRunwayMonths | Int        | Default 3                      |
| triggerOverBudget      | Boolean    | Default true                   |
| triggerNewLeak         | Boolean    | Default true                   |

---

## Audit and logs

### AuthSession
Active sessions (alternative to stateless JWT, if using session-based auth).

| Column     | Type     | Notes                          |
|------------|----------|--------------------------------|
| id         | String   | CUID, primary key              |
| userId     | String   | FK → User.id                   |
| tokenHash  | String   | Hashed token                   |
| userAgent  | String?  |                                |
| ipAddress  | String?  |                                |
| expiresAt  | DateTime |                                |
| createdAt  | DateTime |                                |

### AuditLog
Track sensitive actions.

| Column      | Type     | Notes                                |
|-------------|----------|--------------------------------------|
| id          | String   | CUID, primary key                    |
| userId      | String?  | Null for system actions              |
| action      | String   | e.g., "user.banned", "file.deleted"  |
| target      | String?  | Affected resource ID                 |
| metadata    | Json?    |                                      |
| ipAddress   | String?  |                                      |
| createdAt   | DateTime |                                      |

**Indexes:** `userId`, `action`, `createdAt`

### PasswordReset
Forgot password tokens.

| Column     | Type     | Notes                       |
|------------|----------|-----------------------------|
| id         | String   | CUID, primary key           |
| userId     | String   | FK → User.id                |
| tokenHash  | String   | Unique                      |
| expiresAt  | DateTime | 1 hour from creation        |
| usedAt     | DateTime?| Null if unused              |
| createdAt  | DateTime |                             |

---

## Enums

```prisma
enum Role {
  MEMBER
  ADMIN
}

enum Plan {
  FREE
  PRO
  TEAM
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  EXPIRED
  TRIAL
  PAST_DUE
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

enum PaymentStatus {
  SUCCESS
  FAILED
  REFUNDED
  PENDING
}

enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

enum FileStatus {
  UPLOADING
  PROCESSING
  DONE
  ERROR
}

enum SourceFormat {
  EXCEL_TEMPLATE
  BANK_SCB
  BANK_KBANK
  BANK_BBL
  PEAK
  FLOWACCOUNT
  CUSTOM
}

enum TxType {
  INCOME
  EXPENSE
}

enum LeakFlag {
  NONE
  SPIKE
  DUPLICATE
  OUTLIER
  CREEP
}

enum Severity {
  CRITICAL
  WARNING
  INFO
}

enum AlertType {
  LOW_RUNWAY
  OVER_BUDGET
  NEW_LEAK
  DUPLICATE_PAYMENT
  SUBSCRIPTION_EXPIRING
}

enum Frequency {
  REALTIME
  DAILY
  WEEKLY
}
```

---

## Relationships

```
User (1) ──< (n) File
User (1) ──< (n) Transaction (denorm)
User (1) ──< (n) Alert
User (1) ──< (n) Payment
User (1) ── (1) Subscription
User (1) ── (1) AlertSettings
User (1) ──< (n) CategoryRule
User (1) ──< (n) Budget
User (1) ──< (n) AuthSession
User (1) ──< (n) AuditLog

Workspace (1) ──< (n) WorkspaceMember
Workspace (1) ──< (n) File

File (1) ──< (n) Transaction (cascade delete)
File (1) ──< (n) Alert (optional)

Transaction (1) ──< (n) Alert (optional)

Subscription (1) ──< (n) Payment
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

## Prisma schema preview

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  passwordHash  String?
  emailVerified DateTime?
  googleId      String?   @unique
  role          Role      @default(MEMBER)
  avatarUrl     String?
  organization  String?
  banned        Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  subscription   Subscription?
  files          File[]
  transactions   Transaction[]
  alerts         Alert[]
  payments       Payment[]
  alertSettings  AlertSettings?
  categoryRules  CategoryRule[]
  budgets        Budget[]
  sessions       AuthSession[]
  auditLogs      AuditLog[]
  workspacesOwned Workspace[]    @relation("WorkspaceOwner")
  workspaceMemberships WorkspaceMember[]

  @@index([role])
}

model File {
  id                String       @id @default(cuid())
  userId            String
  workspaceId       String?
  filename          String
  fileSize          Int
  fileType          String
  sourceFormat      SourceFormat
  status            FileStatus   @default(UPLOADING)
  errorMessage      String?
  storageKey        String
  periodStart       DateTime?
  periodEnd         DateTime?
  transactionCount  Int?
  totalIncome       Decimal?     @db.Decimal(15, 2)
  totalExpense      Decimal?     @db.Decimal(15, 2)
  uploadedAt        DateTime     @default(now())
  processedAt       DateTime?

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace    Workspace?    @relation(fields: [workspaceId], references: [id])
  transactions Transaction[]
  alerts       Alert[]

  @@index([userId])
  @@index([workspaceId])
  @@index([status])
}

model Transaction {
  id              String     @id @default(cuid())
  fileId          String
  userId          String
  date            DateTime
  description     String
  category        String
  amount          Decimal    @db.Decimal(15, 2)
  transactionType TxType
  autoCategorized Boolean    @default(true)
  userOverrode    Boolean    @default(false)
  leakFlag        LeakFlag   @default(NONE)
  leakSeverity    Severity?
  leakReason      String?
  metadata        Json?

  file    File    @relation(fields: [fileId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  alerts  Alert[]

  @@index([fileId])
  @@index([userId, date])
  @@index([category])
  @@index([leakFlag])
}

// ... (Subscription, Workspace, Alert, etc.)
```

---

## Migration strategy

### Phase 0 (MVP)
Minimal tables to ship — matches the trimmed Phase 0 scope in `CLAUDE.md` (email/password auth only, Outlier leak rule only, manual `isManuallyGranted` flag instead of payment):
- `User` (without `googleId`, `emailVerified`, `avatarUrl`, `organization`, `banned` — Google OAuth is Phase 1)
- `Subscription` (FREE + PRO with `isManuallyGranted` flag; no Stripe fields, no TEAM — payment integration is Phase 1)
- `File` (without `workspaceId`, `errorMessage`)
- `Transaction` with `leakFlag`/`leakSeverity`/`leakReason` populated by the **Outlier rule only** (Spike/Duplicate/Creep are Phase 1)
- `BudgetLineItem` (Postgres ETL staging) + in-memory cache from `data/budget-XXXX.json` (cache-only read path — see above) with Rules 1 & 2 red flags only

### Phase 1
Add:
- Leak detection columns on `Transaction`
- `Alert` and `AlertSettings`
- `Payment` table
- `CategoryRule` learning system

### Phase 2
Add:
- `Workspace` and `WorkspaceMember` for Team plan
- `Budget` table
- `AuditLog`
- `CivicDataVersion` (track admin uploads)

---

## Performance notes

- **Civic Layer**: Cache-only (see above) — all reads (tree, search, export, filter, pagination) come from the in-memory cache built from `data/budget-XXXX.json`. Postgres `BudgetLineItem` is write-side ETL staging only; never query it from a serving route.
- **Business Layer**: Index on `(userId, date)` for Transaction is critical — most queries filter by user + date range.
- **Forecast**: Computed on demand, not cached. If slow, cache result for 1 hour per `(fileId, params)`.
- **Leak detection**: Computed once when file is processed, results stored on `Transaction.leakFlag`. Recompute if user adds more transactions.
