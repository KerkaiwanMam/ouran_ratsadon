# Database Schema (v2)

Database: SQLite (development), PostgreSQL (production)
ORM: Prisma

## Overview

Two-layer architecture means two data domains:

1. **Civic Layer data**: Pre-processed government budget data — **dual-stored** (decided, see `analyzer-spec.md` § Data storage strategy): `data/budget-XXXX.json` is the source of truth, bulk-loaded into Postgres (`BudgetMinistry`/`BudgetDepartment`/`BudgetProject` — see below) AND used to rebuild an in-memory tree cache. Cache serves bounded tree reads (`/explore`, drill-down, compare); Postgres serves filtered/sorted/paginated reads (`/api/civic/search`, `/api/civic/export/*`).
2. **Business Layer data**: User accounts, uploaded files, parsed financial data, subscriptions, alerts. Stored in SQL.

This document focuses on the SQL schema. For Civic Layer JSON structure, see `database-schema.md` § Data schemas below and `analyzer-spec.md`.

---

## Civic Layer storage

> ⚠️ Updated 2026-06-08 to match the decided dual-storage strategy in `CLAUDE.md` / `analyzer-spec.md` — earlier drafts of this doc described an in-memory-only approach. Postgres is now part of the picture; do not revert to in-memory-only for search/export paths.

### Source of truth + bulk load
- Location: `data/budget-{year}.json`, committed to repo
- Bulk-inserted into Postgres tables `BudgetMinistry` / `BudgetDepartment` / `BudgetProject` on admin upload (see Core SQL tables below for shape — mirrors the Civic JSON tree with `fiscalYear`, `parentId`, `amount`, `previousAmount`, `changePct`, `flags`, `flagSeverity`, `province`, `budgetType`)
- Indexes: `(fiscalYear, ministryId)`, `(amount)`, `(flagSeverity)`, trigram/GIN on `name` for Thai text search

### In-memory tree cache (read-only mirror, NOT the source)
- Rebuilt from Postgres (not directly from JSON) at server start and after each admin upload, via `lib/civic-cache.ts`
- Used ONLY for bounded tree-shaped reads: `/explore` treemap/sunburst, drill-down breadcrumb, year-over-year compare, red-flag aggregation
- Small (≤ a few MB/year, ~4 years = single-digit MB total) — in-memory is appropriate here, but NOT for filtered/paginated search (that's what Postgres + indexes are for)

### Optional: CivicDataVersion (track admin uploads)
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

## Civic Layer SQL tables (dual-store target — Postgres)

### BudgetMinistry / BudgetDepartment / BudgetProject
One row per tree node, mirroring the Civic JSON. Minimum fields:

| Column         | Type      | Notes                                              |
|----------------|-----------|----------------------------------------------------|
| id             | String    | matches JSON `id` (e.g. "moe", "moe-001", "B68-...")|
| parentId       | String?   | null for ministries                                 |
| fiscalYear     | String    | e.g. "2568"                                        |
| name           | String    | trigram/GIN indexed for Thai search                |
| amount         | Decimal   |                                                     |
| previousAmount | Decimal?  | null for new projects                              |
| changePct      | Float?    |                                                     |
| budgetType     | String?   | operating/investment/etc (BudgetProject only)      |
| province       | String?   | (BudgetProject only)                               |
| flags          | Json      | array of flag codes, e.g. `["unusual_increase"]`   |
| flagSeverity   | String?   | critical/warning/null                              |
| isNewProject   | Boolean   | true when Rule 1 fallback applies                  |

**Indexes:** `(fiscalYear, ministryId)`, `(amount)`, `(flagSeverity)`, GIN/trigram on `name`

### BudgetLineItem (raw/staging — source of the dual-store tree)
Flat, 1-row-per-line-item mirror of the parsed PDF/Excel budget documents (per the project's Data Dict). This is the **raw layer**: an ETL/aggregation step rolls these rows up into `BudgetMinistry`/`BudgetDepartment`/`BudgetProject` above (which is what the Civic Layer actually serves). Roll-up mapping: `ministry` → BudgetMinistry node, `budgetaryUnit` → BudgetDepartment node, `output`/`project` (mutually exclusive — XOR) → BudgetProject node, `categoryLv1-6` → per-project expenditure-category breakdown.

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
| amount          | Float    | จำนวนเงินงบประมาณ — Data Dict ระบุ `str` แต่เก็บเป็นตัวเลขเพื่อคำนวณ/รวมยอด |
| obliged         | Boolean  | งบผูกพัน — TRUE เมื่อ line item เดียวกันมีหลาย row คนละ FISCAL_YEAR       |
| createdAt       | DateTime |                                                                       |

**Indexes:** `(fiscalYear, ministry)`, `(budgetaryUnit, fiscalYear)`, `(refDoc, refPageNo)`, `project`, `output`

### Optional: CivicDataVersion (track admin uploads)
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
- `BudgetMinistry`/`BudgetDepartment`/`BudgetProject` (Postgres bulk-load + cache, dual-store — see above) with Rules 1 & 2 red flags only

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

- **Civic Layer**: Dual-stored (see above) — tree reads from in-memory cache, search/export/filter from Postgres with indexes. Do not run filtered/paginated queries against the in-memory tree; do not use Postgres for hot-path tree reads.
- **Business Layer**: Index on `(userId, date)` for Transaction is critical — most queries filter by user + date range.
- **Forecast**: Computed on demand, not cached. If slow, cache result for 1 hour per `(fileId, params)`.
- **Leak detection**: Computed once when file is processed, results stored on `Transaction.leakFlag`. Recompute if user adds more transactions.
