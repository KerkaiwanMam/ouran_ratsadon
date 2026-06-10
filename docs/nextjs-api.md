# ouran_ratsadon — Next.js API Reference

> **Base URL:** `http://localhost:3000` (dev) / `https://ouran.app` (prod)  
> **Auth:** JWT in `auth_token` httpOnly cookie **หรือ** `Authorization: Bearer <token>` header  
> **Content-Type:** `application/json` ยกเว้น endpoints ที่รับไฟล์ (multipart/form-data)

---

## Error Format (ทุก endpoint)

```json
{
  "error": "ERROR_CODE",
  "message": "ข้อความภาษาไทยสำหรับแสดง UI"
}
```

---

## 1. Authentication

### `POST /api/auth/register`

สมัครสมาชิกใหม่ (email/password) — ได้รับ 14-day Pro Trial อัตโนมัติ

**Body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | ✓ | RFC email format |
| `password` | string | ✓ | min 8 chars |
| `name` | string | ✓ | – |

**Response `201 Created`**

```json
{
  "user": {
    "id": "cuid",
    "email": "user@example.com",
    "name": "สมชาย",
    "role": "MEMBER",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

Sets `auth_token` cookie.

**Errors:** `400 INVALID_INPUT` · `400 INVALID_EMAIL` · `400 WEAK_PASSWORD` · `409 EMAIL_TAKEN`

---

### `POST /api/auth/login`

เข้าสู่ระบบด้วย email/password

**Body**

| Field | Type | Required |
|---|---|---|
| `email` | string | ✓ |
| `password` | string | ✓ |

**Response `200 OK`**

```json
{
  "user": {
    "id": "cuid",
    "email": "user@example.com",
    "name": "สมชาย",
    "role": "MEMBER",
    "avatarUrl": null,
    "organization": null,
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "subscription": {
    "plan": "PRO",
    "status": "TRIAL",
    "currentPeriodEnd": "2024-02-15T10:00:00Z",
    "cancelAtPeriodEnd": false
  }
}
```

Sets `auth_token` cookie.

**Errors:** `400 INVALID_INPUT` · `401 INVALID_CREDENTIALS` · `403 ACCOUNT_BANNED`

---

### `POST /api/auth/logout`

ออกจากระบบ — ล้าง cookie

**Response `200 OK`** `{ "success": true }`

---

### `GET /api/auth/me`

ดูข้อมูล user ปัจจุบัน (ต้องล็อกอิน)

**Response `200 OK`** — shape เดียวกับ `/api/auth/login`

**Errors:** `401 UNAUTHORIZED`

---

### `GET /api/auth/google`

เริ่ม Google OAuth flow — redirect ไปยัง accounts.google.com

**Response:** `302 Redirect` ไปยัง Google OAuth URL

**Errors:** `503 OAUTH_NOT_CONFIGURED` ถ้าไม่ได้ตั้ง `GOOGLE_CLIENT_ID`

---

### `GET /api/auth/google/callback`

OAuth callback จาก Google — แลก code เป็น token แล้ว redirect กลับแอป

---

## 2. Civic Layer

> ทุก endpoint ใน Civic Layer **ไม่ต้องล็อกอิน** (public)

---

### `GET /api/civic/years`

รายการปีงบประมาณที่มีข้อมูล

**Response `200 OK`**

```json
{
  "years": ["2567", "2568"],
  "current": "2568",
  "last_updated": "2024-10-01T08:00:00Z"
}
```

---

### `GET /api/civic/budget/[year]`

ข้อมูลสรุปงบประมาณรายปี พร้อมรายการกระทรวงทั้งหมด

**Path params:** `year` — ปีงบประมาณ BE เช่น `2568`

**Response `200 OK`**

```json
{
  "fiscalYear": "2568",
  "totalBudget": 3480000000000,
  "ministryCount": 20,
  "projectCount": 4200,
  "redFlagCount": 87,
  "ministries": [
    { "id": "M01", "name": "กระทรวงกลาโหม", "budget": 230000000000, "deptCount": 5 }
  ],
  "ministriesWithDepts": [...],
  "metadata": { "source": "สำนักงบประมาณ", "parsed_at": "2024-10-01T08:00:00Z" }
}
```

**Errors:** `404 NOT_FOUND`

---

### `GET /api/civic/search`

ค้นหาโครงการงบประมาณ — รองรับ filter + sort + pagination

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `year` | string | ปีล่าสุด | ปีงบประมาณ |
| `q` | string | – | ค้นหาชื่อโครงการ |
| `ministries[]` | string[] | – | กรองกระทรวง (multi-value) |
| `budgetTypes[]` | string[] | – | `operating`/`capital`/... |
| `minAmount` | number | – | งบขั้นต่ำ (บาท) |
| `maxAmount` | number | – | งบสูงสุด (บาท) |
| `sort` | string | `amount_desc` | `amount_desc`/`amount_asc`/`name_asc`/`change_desc` |
| `page` | number | `1` | |
| `limit` | number | `20` | สูงสุด 100 |

**Response `200 OK`**

```json
{
  "total": 1234,
  "page": 1,
  "limit": 20,
  "stats": {
    "totalAmount": 98000000000,
    "redFlagCount": 12,
    "avgIncreasePct": 4.2,
    "newProjectCount": 0,
    "categoryBreakdown": [
      { "budgetType": "operating", "amount": 60000000000, "percentage": 61.2 }
    ]
  },
  "results": [
    {
      "id": "proj-001",
      "name": "โครงการพัฒนาการศึกษา",
      "ministryName": "กระทรวงศึกษาธิการ",
      "amount": 1500000000,
      "changePct": 5.3,
      "province": "กรุงเทพมหานคร",
      "budgetType": "operating",
      "flags": [{ "rule": 1, "label": "งบเพิ่มขึ้นผิดปกติ", "severity": "WARNING" }]
    }
  ]
}
```

---

### `GET /api/civic/project/[id]`

รายละเอียดโครงการ พร้อม related projects

**Path params:** `id` — project ID (URL-encoded)  
**Query params:** `year` — ปีงบประมาณ (optional, default = ปีล่าสุด)

**Response `200 OK`**

```json
{
  "id": "proj-001",
  "name": "โครงการพัฒนาการศึกษา",
  "amount": 1500000000,
  "changePct": 5.3,
  "province": "กรุงเทพมหานคร",
  "budgetType": "operating",
  "flags": [...],
  "ministry": { "id": "M05", "name": "กระทรวงศึกษาธิการ" },
  "department": { "id": "D023", "name": "สพฐ." },
  "relatedProjects": [...],
  "source": { "name": "สำนักงบประมาณ", "section": "พ.ร.บ. งบประมาณรายจ่าย" }
}
```

**Errors:** `404 NOT_FOUND`

---

### `GET /api/civic/dept-projects`

โครงการใน department (lazy-load สำหรับ Treemap level 3)

**Query params**

| Param | Required | Description |
|---|---|---|
| `year` | ✓ | ปีงบประมาณ |
| `ministryId` | ✓ | ID ของกระทรวง |
| `deptId` | ✓ | ID ของกรม/หน่วยงาน |

**Response `200 OK`**

```json
{
  "deptId": "D023",
  "deptName": "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน",
  "totalBudget": 450000000000,
  "totalProjectCount": 380,
  "shownCount": 50,
  "projects": [...]
}
```

---

### `GET /api/civic/fiscal`

ข้อมูลการคลังมหภาค (รายได้/รายจ่าย/หนี้สาธารณะ) ทุกปี

**Response `200 OK`**

```json
{
  "source": "db",
  "data": [
    {
      "fiscalYear": "2560",
      "totalRevenue": 2450000000000,
      "totalExpenditure": 2733000000000,
      "balance": -283000000000,
      "publicDebt": 6200000000000,
      "gdpEstimate": 15450000000000,
      "debtToGdpPct": 40.1,
      "source": "สำนักงานเศรษฐกิจการคลัง (สศค.)",
      "sourceNotes": null
    }
  ]
}
```

---

### `GET /api/civic/project/[id]/rating`

คะแนนโหวตสาธารณะของโครงการ

**Response `200 OK`**

```json
{
  "projectId": "proj-001",
  "total": 42,
  "counts": {
    "too_high": 28,
    "appropriate": 10,
    "too_low": 4
  }
}
```

---

### `POST /api/civic/project/[id]/rating`

โหวตงบโครงการ (1 โหวต/user หรือ 1 โหวต/IP สำหรับ guest)

**Body** `{ "vote": "too_high" | "appropriate" | "too_low" }`

**Response `200 OK`** — เหมือน GET + `"myVote": "too_high"`

**Errors:** `400 INVALID_INPUT`

---

### `GET /api/civic/comments?projectId=X&page=1`

ความคิดเห็นของโครงการ (เฉพาะที่ approved)

**Response `200 OK`**

```json
{
  "total": 15,
  "page": 1,
  "limit": 20,
  "hasMore": false,
  "comments": [
    {
      "id": "cuid",
      "body": "โครงการนี้ควรเพิ่มงบ...",
      "createdAt": "2024-03-01T10:00:00Z",
      "authorName": "สมหมาย",
      "authorAvatar": null,
      "isGuest": true
    }
  ]
}
```

---

### `POST /api/civic/comments`

โพสต์ความคิดเห็น — Rate limit: 3 ครั้ง/นาที/IP

**Body**

| Field | Type | Required | Note |
|---|---|---|---|
| `projectId` | string | ✓ | |
| `body` | string | ✓ | 5–1000 ตัวอักษร |
| `guestName` | string | ✓ ถ้าไม่ล็อกอิน | ชื่อ guest |

**Response `201 Created`**

```json
{
  "comment": {
    "id": "cuid",
    "status": "PENDING_REVIEW",
    "message": "ความคิดเห็นของคุณอยู่ระหว่างการตรวจสอบ..."
  }
}
```

> ผู้ที่ล็อกอินแล้ว → `VISIBLE` อัตโนมัติ; guest → `PENDING_REVIEW`

**Errors:** `400 BAD_REQUEST` · `429 RATE_LIMIT`

---

### `GET /api/civic/saved-searches` 🔒

รายการ saved searches ของ user (ต้องล็อกอิน)

**Response `200 OK`** `{ "searches": [...] }`

---

### `POST /api/civic/saved-searches` 🔒

บันทึก search filter ปัจจุบัน

**Body** `{ "label": "ชื่อที่บันทึก", "filters": {...}, "resultCount": 42 }`

**Response `201 Created`** `{ "search": {...} }`

**Errors:** `400 INVALID_INPUT` · `429 LIMIT_EXCEEDED` (สูงสุด 20 รายการ)

---

### `DELETE /api/civic/saved-searches?id=xxx` 🔒

ลบ saved search

**Response `200 OK`** `{ "ok": true }`

---

## 3. Export

### `GET /api/civic/export/csv`

ดาวน์โหลด search results เป็น CSV (UTF-8 BOM, เปิดได้ใน Excel)

Query params เดียวกับ `/api/civic/search` (ยกเว้น `page`/`limit` — export ครบทุก row)

**Response:** `text/csv` file download  
**Filename:** `search-results-{year}.csv`

---

### `GET /api/civic/export/json?year=2568`

ดาวน์โหลด full budget dataset ของปีที่ระบุ เป็น JSON

**Response:** `application/json` file download  
**Filename:** `budget-{year}.json`  
**Cache:** 1 hour

**Errors:** `400 BAD_REQUEST` · `404 NOT_FOUND`

---

## 4. Business Layer — Files

> 🔒 ทุก endpoint ต้องล็อกอิน

### `GET /api/files`

รายการไฟล์ที่ user อัปโหลดทั้งหมด

**Response `200 OK`**

```json
{
  "total": 3,
  "files": [
    {
      "id": "cuid",
      "filename": "Q1-2024.xlsx",
      "fileSize": 48320,
      "fileType": "xlsx",
      "sourceFormat": "EXCEL_TEMPLATE",
      "status": "DONE",
      "errorMessage": null,
      "periodStart": "2024-01-01T00:00:00Z",
      "periodEnd": "2024-03-31T00:00:00Z",
      "transactionCount": 48,
      "totalIncome": 450000,
      "totalExpense": 280000,
      "uploadedAt": "2024-04-01T10:00:00Z",
      "processedAt": "2024-04-01T10:01:00Z",
      "leakCount": 2
    }
  ]
}
```

---

### `POST /api/files/upload`

อัปโหลดไฟล์การเงิน — parse + auto-categorize + leak detection

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | ✓ | ไฟล์ Excel/CSV |
| `source_format` | string | – | `EXCEL_TEMPLATE` (default) · `BANK_STATEMENT_SCB` · `ACCOUNTING_PEAK` ฯลฯ |
| `force` | string | – | `"true"` = อนุญาตอัปโหลดซ้ำ |

**File size limit:** Free = 10 MB, Pro/Team = 50 MB

**Response `201 Created`**

```json
{
  "file": {
    "id": "cuid",
    "filename": "Q1-2024.xlsx",
    "status": "DONE",
    "transactionCount": 48,
    "uploadedAt": "2024-04-01T10:00:00Z"
  },
  "dedup": {
    "imported": 45,
    "skippedExactDuplicates": 3,
    "flaggedChanged": 0
  }
}
```

**Errors:** `401 UNAUTHORIZED` · `429 QUOTA_EXCEEDED` (Free: 3 ไฟล์/เดือน) · `409 DUPLICATE_FILE` · `413 FILE_TOO_LARGE` · `422 PARSE_ERROR`

> **`409 DUPLICATE_FILE`** response มี `existingFile` object พร้อมรายละเอียด — UI ควรถามยืนยันก่อน re-upload ด้วย `force=true`

---

## 5. Business Layer — Dashboard & Analytics

### `GET /api/business/dashboard` 🔒

ข้อมูลแดชบอร์ด: สรุปรายรับ-รายจ่าย + รายการล่าสุด

**Response `200 OK`**

```json
{
  "hasData": true,
  "summary": {
    "totalIncome": 450000,
    "totalExpense": 280000,
    "netCashFlow": 170000,
    "period": "2024-03",
    "categories": [
      {
        "name": "บุคลากร",
        "amount": 60000,
        "percentage": 21.4,
        "trendPct": 5.2,
        "isNew": false,
        "budgetAmount": 65000
      }
    ]
  },
  "transactions": [
    {
      "id": "cuid",
      "description": "เงินเดือนพนักงาน",
      "category": "บุคลากร",
      "amount": -60000,
      "transactionType": "EXPENSE",
      "date": "2024-03-31",
      "leakFlag": "NONE",
      "leakSeverity": null,
      "leakReason": null
    }
  ]
}
```

---

### `GET /api/business/leaks` 🔒 Pro

รายการธุรกรรมที่ตรวจพบความผิดปกติ (Pro/Team only)

**Query params**

| Param | Description |
|---|---|
| `flag` | `MONTHLY_SPIKE` / `DUPLICATE_PAYMENT` / `OUTLIER` / `RECURRING_CREEP` / `DUPLICATE` |
| `fileId` | กรองตาม file |
| `page` | หน้า (default 1, ขนาด 20) |

**Response `200 OK`**

```json
{
  "total": 15,
  "page": 1,
  "pageSize": 20,
  "pages": 1,
  "flagCounts": {
    "OUTLIER": 8,
    "MONTHLY_SPIKE": 5,
    "DUPLICATE_PAYMENT": 2
  },
  "items": [
    {
      "id": "cuid",
      "date": "2024-03-15",
      "description": "ค่าโฆษณา Facebook Ads (แคมเปญพิเศษ)",
      "amount": -65000,
      "transactionType": "EXPENSE",
      "category": "การตลาด",
      "leakFlag": "MONTHLY_SPIKE",
      "leakSeverity": "CRITICAL",
      "leakReason": "ค่าใช้จ่ายหมวดนี้สูงกว่าค่าเฉลี่ย 3 เดือนก่อนหน้า 3.2x",
      "file": { "id": "cuid", "filename": "Q1-2024.xlsx" }
    }
  ]
}
```

**Errors:** `403 PLAN_REQUIRED`

---

### `GET /api/business/forecast?horizon=6&currentCash=100000` 🔒 Pro

พยากรณ์กระแสเงินสด WMA + Seasonal Index (ไม่ใช่ AI/ML)

**Query params**

| Param | Default | Range |
|---|---|---|
| `horizon` | `6` | 3–12 เดือน |
| `currentCash` | `0` | ยอดเงินคงเหลือปัจจุบัน |

**Response `200 OK`**

```json
{
  "sufficiency": "sufficient",
  "monthsOfData": 6,
  "historical": [
    { "month": "2023-10", "income": 450000, "expense": 280000, "net": 170000 }
  ],
  "forecast": [
    { "month": "2024-04", "income": 462000, "expense": 285000, "net": 177000 }
  ],
  "runway": 14,
  "disclaimer": "การพยากรณ์ใช้ Weighted Moving Average + Seasonal Index — ไม่ใช่ AI"
}
```

> **`sufficiency`**: `"sufficient"` | `"marginal"` | `"insufficient"` (ต้องมีข้อมูล ≥ 3 เดือน)

**Errors:** `403 PLAN_REQUIRED`

---

### `GET /api/business/budgets?month=2024-03` 🔒

ดูงบประมาณที่ตั้งไว้ต่อหมวดหมู่ (เฉพาะเดือน + standing)

**Response `200 OK`** `{ "budgets": [{ "category": "บุคลากร", "amount": 65000, "month": "2024-03" }] }`

---

### `POST /api/business/budgets` 🔒

ตั้งงบประมาณต่อหมวดหมู่ (upsert)

**Body** `{ "category": "บุคลากร", "amount": 65000, "month": "2024-03" }` (month = null สำหรับ standing)

**Response `200 OK`** `{ "budget": {...} }`

**Errors:** `400 INVALID_INPUT`

---

### `DELETE /api/business/budgets?category=บุคลากร&month=2024-03` 🔒

ลบงบประมาณที่ตั้งไว้

**Response `200 OK`** `{ "ok": true }`

---

### `GET /api/business/alerts?unread=true` 🔒

การแจ้งเตือน (Alerts) ของ user

**Response `200 OK`** `{ "alerts": [...], "unreadCount": 3 }`

---

### `PATCH /api/business/alerts` 🔒

อ่าน หรือ dismiss alerts

**Body** `{ "ids": ["id1", "id2"], "action": "read" | "dismiss" }`

**Response `200 OK`** `{ "ok": true }`

---

### `GET /api/business/report/[id]/export/pdf` 🔒 Pro

ข้อมูลสำหรับ render PDF report ของ file ที่ระบุ

**Response `200 OK`**

```json
{
  "file": { "id": "cuid", "filename": "Q1-2024.xlsx", "periodStart": "...", "periodEnd": "...", "transactionCount": 48 },
  "user": { "name": "สมชาย", "email": "s@example.com", "organization": null },
  "summary": { "totalIncome": 450000, "totalExpense": 280000, "netCashFlow": 170000, "leakCount": 2 },
  "categories": [{ "name": "บุคลากร", "amount": 60000 }],
  "leaks": [{ "date": "2024-03-15", "description": "...", "amount": -65000, "leakFlag": "MONTHLY_SPIKE", "leakSeverity": "CRITICAL", "leakReason": "..." }]
}
```

**Errors:** `403 PLAN_REQUIRED` · `404 NOT_FOUND`

---

## 6. Business Layer — Analytics (4 Tiers)

### `GET /api/business/analytics/summary?range=6` 🔒

**Tier 1 — Descriptive** ("เกิดอะไรขึ้น?")  
Pre-aggregated month × category rollups, เหมาะกับ dashboard charts

`range` = จำนวนเดือนย้อนหลัง (1–24, default 6)

---

### `GET /api/business/analytics/diagnose?limit=20` 🔒

**Tier 2 — Diagnostic** ("ทำไมถึงเป็นอย่างนี้?")  
Plain-language insights จาก z-score analysis — ค้นหา category spikes/drops, vendor surges

`limit` = จำนวน insights (1–50, default 20)

**Response `200 OK`** `{ "insights": [{ "category": "การตลาด", "insightType": "SPIKE", "message": "ค่าโฆษณาเดือนนี้สูงกว่าค่าเฉลี่ย 3.2 เท่า", ... }] }`

---

### `GET /api/business/analytics/forecast` 🔒 Pro

**Tier 3 — Predictive** ("จะเกิดอะไรขึ้น?")  
ดึง ForecastSnapshot ล่าสุดที่ persist ไว้ (ไม่คำนวณใหม่)

**Response `200 OK`** `{ "snapshot": { "predictedIncome": 462000, "predictedExpense": 285000, "method": "WMA+Seasonal", "inputWindow": 6, ... } | null }`

---

### `POST /api/business/analytics/forecast` 🔒 Pro

คำนวณ forecast ใหม่ + persist เป็น ForecastSnapshot

**Body** `{ "currentCash": 100000 }` (optional)

**Response `200 OK`** `{ "snapshot": {...}, "disclaimer": "การพยากรณ์ใช้ WMA + Seasonal Index..." }`

---

### `GET /api/business/analytics/recommendations?status=PENDING` 🔒

**Tier 4 — Prescriptive** ("ควรทำอะไร?")  
คำแนะนำ next-best-action จาก if-then rule engine (ไม่ใช่ AI)

`status` = `PENDING` / `APPLIED` / `DISMISSED` (optional, default = ทั้งหมด)

**Response `200 OK`** `{ "recommendations": [{ "id": "cuid", "title": "ลดค่าโฆษณาลง 20%", "detail": "...", "priority": "HIGH", "status": "PENDING" }] }`

---

### `POST /api/business/analytics/recommendations` 🔒

สร้าง recommendations ใหม่จาก Tier 2/3 ล่าสุด (recompute)

**Response `200 OK`** `{ "created": 3, "recommendations": [...] }`

---

### `PATCH /api/business/analytics/recommendations/[id]` 🔒

อัปเดตสถานะ recommendation

**Body** `{ "status": "APPLIED" | "DISMISSED" }`

**Response `200 OK`** `{ "success": true, "status": "APPLIED" }`

**Errors:** `400 INVALID_STATUS` · `404 NOT_FOUND`

---

## 7. Subscription & Payments

### `GET /api/subscription` 🔒

ข้อมูล subscription ปัจจุบัน (auto-expire trial ถ้าหมดอายุ)

**Response `200 OK`** `{ "plan": "PRO", "status": "TRIAL", "trialEndsAt": "...", ... }`

---

### `POST /api/subscription/checkout` 🔒

สร้าง Stripe Checkout session (หรือ mock flow ถ้าไม่มี Stripe key)

**Body** `{ "plan": "PRO" | "TEAM", "billing": "monthly" | "yearly" }`

**Response `200 OK`** `{ "checkout_url": "https://checkout.stripe.com/..." }`

**Errors:** `400 INVALID_PLAN` · `503 PRICE_NOT_CONFIGURED`

---

### `POST /api/subscription/cancel` 🔒

ยกเลิก subscription (cancel at period end)

---

### `GET /api/subscription/history` 🔒

ประวัติการชำระเงิน

---

### `POST /api/webhooks/stripe`

Stripe webhook handler — รับ events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`

**Auth:** `Stripe-Signature` header (HMAC verification)

---

## 8. Workspace (Team Plan)

### `GET /api/workspace` 🔒

รายการ workspaces ที่ user เป็นสมาชิก

**Response `200 OK`**

```json
{
  "owned": [{ "id": "cuid", "name": "บริษัท ABC", "slug": "abc-co", "_count": { "members": 3, "files": 8 } }],
  "member": [{ "id": "cuid", "name": "ทีม XYZ", "role": "MEMBER", ... }]
}
```

---

### `POST /api/workspace` 🔒 Team

สร้าง Workspace ใหม่ (Team plan only)

**Body** `{ "name": "บริษัท ABC", "slug": "abc-co", "description": "..." }`

**Response `201 Created`** `{ "workspace": {...} }`

**Errors:** `403 PLAN_REQUIRED` · `400 BAD_REQUEST` · `400 INVALID_SLUG` · `409 SLUG_TAKEN`

---

### `GET /api/workspace/[id]/members` 🔒

รายชื่อสมาชิก workspace (ต้องเป็นสมาชิก active ของ workspace นี้)

**Response `200 OK`** `{ "members": [{ "id": "cuid", "email": "...", "role": "OWNER", "status": "ACTIVE", "user": {...} }] }`

---

### `POST /api/workspace/[id]/members` 🔒 Owner/Admin

เชิญสมาชิกใหม่เข้า workspace — ส่ง invite email อัตโนมัติ (ถ้าตั้ง Resend)

**Body** `{ "email": "member@example.com", "role": "MEMBER" | "ADMIN" }`

**Response `201 Created`** `{ "member": { "status": "INVITED", ... } }`

**Errors:** `403 FORBIDDEN` · `422 SEAT_LIMIT` (สูงสุด 5 คน) · `409 ALREADY_MEMBER`

---

### `POST /api/workspace/join` 🔒

รับ invite token จาก email link → เข้าร่วม workspace

**Body** `{ "token": "64hex-invite-token" }`

**Response `200 OK`** `{ "workspaceId": "cuid", "workspaceName": "บริษัท ABC" }`

**Errors:** `404 NOT_FOUND` · `409 CONFLICT` (ใช้แล้ว) · `403 FORBIDDEN` (email ไม่ตรง)

---

## 9. Settings

### `GET /api/settings/notifications` 🔒

ดูการตั้งค่าการแจ้งเตือน

**Response `200 OK`** `{ "lineNotifyToken": "***" | null, "emailAlerts": true }`

> Token จริงไม่แสดง — แสดงเป็น `"***"` ถ้ามีค่า

---

### `PATCH /api/settings/notifications` 🔒

บันทึก LINE Notify Token

**Body** `{ "lineNotifyToken": "abc123..." | null }` (null = ลบ token)

**Response `200 OK`** `{ "ok": true }`

**Errors:** `400 BAD_REQUEST` (token ความยาวไม่ถูก)

---

### `POST /api/settings/notifications/test-line` 🔒

ส่ง test message ผ่าน LINE Notify เพื่อตรวจสอบ token

**Response `200 OK`** `{ "ok": true }` หรือ `502` ถ้า LINE API ล้มเหลว

---

## 10. Developer API Keys

### `GET /api/developer/keys` 🔒

รายการ API keys ของ user (ไม่แสดง plaintext)

**Response `200 OK`**

```json
{
  "keys": [
    {
      "id": "cuid",
      "name": "My Integration",
      "keyPrefix": "ok_live_a1b2c3d4",
      "scopes": ["read:files", "read:reports"],
      "lastUsedAt": null,
      "expiresAt": null,
      "createdAt": "2024-03-01T10:00:00Z"
    }
  ]
}
```

---

### `POST /api/developer/keys` 🔒 Pro/Team

สร้าง API key ใหม่ (สูงสุด 5 keys)

**Body**

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | ✓ | 1–80 ตัวอักษร |
| `scopes` | string[] | ✓ | `read:files` / `read:reports` / `read:alerts` / `write:files` |

**Response `200 OK`**

```json
{
  "key": {
    "id": "cuid",
    "name": "My Integration",
    "keyPrefix": "ok_live_a1b2c3d4",
    "scopes": ["read:files"],
    "plaintext": "ok_live_a1b2c3d4xxxx..."
  },
  "warning": "บันทึก key นี้ไว้ทันที — จะไม่แสดงอีกครั้ง"
}
```

> `plaintext` แสดงเพียงครั้งเดียว — SHA-256 hash เก็บใน DB เท่านั้น

**Errors:** `403 PLAN_REQUIRED` · `429 KEY_LIMIT` (5 keys) · `400 INVALID_INPUT`

---

### `DELETE /api/developer/keys/[id]` 🔒

Revoke API key (soft delete — `revoked = true`)

**Response `200 OK`** `{ "ok": true }`

**Errors:** `404 NOT_FOUND`

---

## 11. Admin (ADMIN role เท่านั้น)

### `GET /api/admin/civic-data` 🔒 Admin

รายการ CivicDataVersion ทั้งหมด

**Response `200 OK`** `{ "versions": [...] }`

---

### `POST /api/admin/civic-data/upload` 🔒 Admin

อัปโหลด budget dataset ใหม่ (HTML/XLSX/CSV → parser → cache invalidate)

**Content-Type:** `multipart/form-data`, ขนาดสูงสุด 150 MB

| Field | Type | Description |
|---|---|---|
| `file` | File | ไฟล์งบประมาณ |
| `fiscal_year` | string | ปีงบประมาณ BE (เช่น `2568`) |
| `mode` | string | `add` / `replace` / `delete` |
| `notes` | string | หมายเหตุ (optional) |

---

### `PATCH /api/admin/civic-data/[id]` 🔒 Admin

แก้ไข notes ของ version

**Body** `{ "notes": "..." }`

---

### `DELETE /api/admin/civic-data/[id]` 🔒 Admin

ลบ dataset version (ถ้าเป็น ACTIVE: ลบ DB rows + JSON file + invalidate cache)

**Response `200 OK`** `{ "ok": true }`

---

### `GET /api/admin/comments?status=PENDING_REVIEW&page=1` 🔒 Admin

รายการ comments สำหรับ moderation queue

**Response `200 OK`**

```json
{
  "total": 42,
  "pending": 12,
  "page": 1,
  "comments": [
    {
      "id": "cuid",
      "projectId": "proj-001",
      "body": "ความคิดเห็น...",
      "status": "PENDING_REVIEW",
      "createdAt": "...",
      "authorName": "สมชาย",
      "isGuest": false
    }
  ]
}
```

`status` รับค่า: `PENDING_REVIEW` / `VISIBLE` / `REJECTED` / `ALL`

---

### `PATCH /api/admin/comments/[id]` 🔒 Admin

อนุมัติหรือปฏิเสธ comment

**Body** `{ "action": "approve" | "reject" }`

**Response `200 OK`** `{ "comment": { "id": "cuid", "status": "VISIBLE" } }`

---

## Plan Gating Summary

| Feature | FREE | PRO | TEAM |
|---|---|---|---|
| Civic Layer (ทั้งหมด) | ✓ | ✓ | ✓ |
| File upload | 3/month | Unlimited | Unlimited |
| Leak detection | – | ✓ | ✓ |
| Cash flow forecast | – | ✓ | ✓ |
| Analytics Tier 3-4 | – | ✓ | ✓ |
| PDF export | – | ✓ | ✓ |
| API keys | – | ✓ | ✓ |
| Workspace | – | – | ✓ |
| API keys limit | – | 5 | 5 |

---

## Auth Helper Summary

| Helper | Used in |
|---|---|
| `requireAuth(req)` | Business API, Workspace, Settings, Developer keys |
| `requireAdmin(req)` | Admin endpoints |
| `getOptionalAuth(req)` | Comments (guest + user) |
| `verifyTokenFromRequest(req)` | Legacy business endpoints (leaks, forecast, alerts) |
| `getCurrentUser()` (Server Component) | Civic saved searches, rating, auth/me |
