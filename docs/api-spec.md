# API Specification (v2)

Base URL: `/api` (Next.js route handlers)
Parser URL: `http://localhost:8000` (FastAPI microservice)

## Authentication

- **Civic Layer endpoints**: No auth required (public)
- **Business Layer endpoints**: Require `Authorization: Bearer <token>` header
- **Admin endpoints**: Require admin role

Response format for errors:
```json
{
  "error": "ERROR_CODE",
  "message": "User-friendly Thai message",
  "details": {} 
}
```

---

## Civic Layer (Public, No Auth)

### GET /api/civic/years
List available fiscal years in the system.

**Response:**
```json
{
  "years": ["2566", "2567", "2568", "2569"],
  "current": "2568",
  "last_updated": "2025-01-15T00:00:00Z"
}
```

### GET /api/civic/budget/:year
Get full budget tree for a fiscal year.

**Query:** `?level=ministry|department|project` (default: ministry)

**Response:**
```json
{
  "fiscal_year": "2568",
  "total_budget": 3780000000000,
  "ministry_count": 20,
  "project_count": 4821,
  "red_flag_count": 12,
  "ministries": [
    {
      "id": "moe",
      "name": "กระทรวงศึกษาธิการ",
      "budget": 340000000000,
      "percentage": 9.0,
      "department_count": 15,
      "project_count": 487,
      "red_flag_count": 0,
      "color_category": "purple"
    }
  ]
}
```

### GET /api/civic/ministry/:id
Ministry detail with department breakdown.

**Query:** `?year=2568`

**Response:**
```json
{
  "id": "mod",
  "name": "กระทรวงกลาโหม",
  "fiscal_year": "2568",
  "total_budget": 230000000000,
  "previous_budget": 215000000000,
  "change_pct": 7.0,
  "red_flag_count": 3,
  "departments": [
    {
      "id": "mod-001",
      "name": "กรมสรรพาวุธทหารบก",
      "budget": 45000000000,
      "project_count": 28,
      "red_flag_count": 2
    }
  ],
  "history": [
    {"year": "2564", "amount": 195000000000},
    {"year": "2565", "amount": 200000000000}
  ]
}
```

### GET /api/civic/department/:id
Department detail with project list.

**Query:** `?year=2568`

**Response:** Same shape as ministry but one level deeper.

### GET /api/civic/project/:id
Single project detail with full history and related projects.

**Query:** `?year=2568`

**Response:**
```json
{
  "id": "B68-0301-0012-01",
  "name": "จัดซื้อยานพาหนะทางทหาร",
  "fiscal_year": "2568",
  "amount": 12400000000,
  "previous_amount": 2818000000,
  "change_pct": 340.0,
  "budget_type": "investment",
  "ministry": {
    "id": "mod",
    "name": "กระทรวงกลาโหม"
  },
  "department": {
    "id": "mod-001",
    "name": "กรมสรรพาวุธทหารบก"
  },
  "province": "กรุงเทพมหานคร",
  "plan_name": "ป้องกันประเทศ",
  "flags": [
    {
      "rule": "unusual_increase",
      "severity": "critical",
      "label": "เพิ่มผิดปกติ",
      "description": "งบประมาณเพิ่ม 340% จากปีก่อน ซึ่งสูงกว่า 2.5 SD จากค่าเฉลี่ย 5 ปีย้อนหลัง",
      "statistical_context": {
        "previous_avg_5yr": 2510000000,
        "std_deviations": 2.5,
        "category_avg_multiple": 4.2
      }
    }
  ],
  "history": [
    {"year": "2564", "amount": 2100000000},
    {"year": "2565", "amount": 2450000000},
    {"year": "2566", "amount": 2680000000},
    {"year": "2567", "amount": 2818000000},
    {"year": "2568", "amount": 12400000000}
  ],
  "related_projects": [
    {
      "id": "B68-0301-0013-01",
      "name": "จัดซื้ออาวุธยุทโธปกรณ์",
      "amount": 9800000000,
      "change_pct": 185.0,
      "flag_severity": "critical"
    }
  ],
  "source": {
    "name": "พ.ร.บ. งบประมาณ 2568",
    "section": "มาตรา 4 ผนวก ข",
    "url": "https://bb.go.th/..."
  }
}
```

### GET /api/civic/search
Advanced search with multi-filter.

**Query parameters:**
- `q` — text search (project name, description)
- `ministries[]` — array of ministry IDs
- `departments[]` — array of department IDs
- `budgetTypes[]` — `personnel | operating | investment | other`
- `minAmount`, `maxAmount` — number (THB)
- `status[]` — `red_flag | increased_50 | duplicate | new_project`
- `provinces[]` — array of province names
- `year` — fiscal year
- `sort` — `amount_desc | amount_asc | change_desc | name_asc`
- `page` — default 1
- `limit` — default 20, max 100

**Response:**
```json
{
  "total": 247,
  "page": 1,
  "limit": 20,
  "stats": {
    "total_amount": 485200000000,
    "red_flag_count": 8,
    "avg_increase_pct": 127,
    "new_project_count": 34
  },
  "results": [
    {
      "id": "...",
      "name": "...",
      "ministry_name": "...",
      "amount": 12400000000,
      "change_pct": 340,
      "province": "กรุงเทพมหานคร",
      "flags": [{"severity": "critical", "label": "เพิ่มผิดปกติ"}]
    }
  ]
}
```

### GET /api/civic/compare
Compare 2 years or 2 ministries.

**Query:**
- `type=years|ministries`
- `a=2567`, `b=2568` (years) OR `a=moe`, `b=mod` (ministry IDs)

**Response:**
```json
{
  "comparison_type": "years",
  "a": {"label": "2567", "total": 3650000000000},
  "b": {"label": "2568", "total": 3780000000000},
  "change_pct": 3.5,
  "categories": [
    {
      "name": "บุคลากร",
      "a_amount": 1180000000000,
      "b_amount": 1200000000000,
      "change_pct": 1.7
    }
  ],
  "biggest_increases": [],
  "biggest_decreases": []
}
```

### GET /api/civic/red-flags
List all red-flagged projects in a year.

**Query:** `?year=2568&severity=critical|warning&limit=50`

**Response:**
```json
{
  "total": 12,
  "by_severity": {"critical": 5, "warning": 7},
  "projects": []
}
```

### GET /api/civic/export/csv
Export filtered search results as CSV.

**Query:** Same as `/api/civic/search`
**Response:** `text/csv` with UTF-8 BOM (for Excel compatibility)

### GET /api/civic/export/json
Full data download for a fiscal year.

**Query:** `?year=2568`
**Response:** `application/json` with full BudgetData structure

### GET /api/civic/embed/:type/:id
Embeddable widget HTML (for journalists/NGOs).

**Path:** `type` = `treemap | chart | stat | project`
**Query:** `?year=&theme=light|dark&width=&height=`
**Response:** `text/html` (iframe-safe minimal HTML)

---

## Auth

### POST /api/auth/register
**Body:** `{ email, password, name }`
**Response:** `{ user: User, token: string }`
**Errors:** `EMAIL_TAKEN`, `WEAK_PASSWORD`, `INVALID_EMAIL`

### POST /api/auth/login
**Body:** `{ email, password }`
**Response:** `{ user: User, token: string }`
**Errors:** `INVALID_CREDENTIALS`, `ACCOUNT_BANNED`, `EMAIL_NOT_VERIFIED`

### POST /api/auth/google
OAuth callback handler.
**Body:** `{ code: string }`
**Response:** `{ user: User, token: string }`

### POST /api/auth/logout
Invalidate current session.

### POST /api/auth/forgot-password
**Body:** `{ email }`
Always returns 200 (don't leak whether email exists).

### POST /api/auth/reset-password
**Body:** `{ token, password }`

### GET /api/auth/me
**Response:** `{ user: User, subscription: Subscription }`

---

## Business Layer — Files (auth required)

### POST /api/files/upload
Upload SME financial file.

**Body:** `multipart/form-data`
- `file` — Excel/CSV/PDF file
- `source_format` — `excel_template | bank_scb | bank_kbank | bank_bbl | peak | flowaccount`

**Response:**
```json
{
  "file": {
    "id": "f_abc123",
    "filename": "expenses_jan_2568.xlsx",
    "status": "processing",
    "uploaded_at": "2025-01-15T10:30:00Z"
  }
}
```

**Errors:** `QUOTA_EXCEEDED` (Free plan), `INVALID_FORMAT`, `FILE_TOO_LARGE` (>50MB)

### GET /api/files
List user's files.

**Query:** `?page=1&limit=20&status=done&sort=date_desc`

**Response:**
```json
{
  "total": 8,
  "files": [
    {
      "id": "f_abc123",
      "filename": "expenses_jan_2568.xlsx",
      "status": "done",
      "uploaded_at": "...",
      "transaction_count": 247,
      "leak_count": 3
    }
  ]
}
```

### GET /api/files/:id
File metadata + parsed data.

### DELETE /api/files/:id
Delete file and associated data.

---

## Business Layer — Reports (auth required)

### GET /api/report/:fileId
Full financial report.

**Response:** `SMEFinancialData` (see CLAUDE.md schema)

### GET /api/report/:fileId/summary
Summary only (lighter payload for dashboards).

**Response:**
```json
{
  "period_start": "2568-01-01",
  "period_end": "2568-12-31",
  "total_income": 1200000,
  "total_expense": 980000,
  "net_cash_flow": 220000,
  "category_breakdown": [],
  "monthly_trend": [
    {"month": "2568-01", "income": 100000, "expense": 80000}
  ]
}
```

### GET /api/report/:fileId/leaks [Pro]
Leak detection results.

**Query:** `?severity=critical|warning&rule=spike|duplicate|outlier|creep`

**Response:**
```json
{
  "total": 8,
  "by_rule": {
    "spike": 3,
    "duplicate": 2,
    "outlier": 2,
    "creep": 1
  },
  "leaks": [
    {
      "transaction_id": "tx_045",
      "description": "ค่าโฆษณา Facebook Ads",
      "amount": -45000,
      "date": "2568-03-15",
      "rule": "spike",
      "severity": "critical",
      "reason": "หมวด การตลาด เพิ่มขึ้น 65% จากค่าเฉลี่ย 3 เดือนก่อน",
      "context": {
        "category_avg_3mo": 27000,
        "this_month_total": 45000,
        "increase_pct": 67
      }
    }
  ]
}
```

### GET /api/report/:fileId/forecast [Pro]
Cash flow forecast with what-if scenarios.

**Query:**
- `months` — 3 | 6 | 12 (default: 6)
- `revenueChange` — percentage change to apply (e.g., `-20` for 20% decrease)

**Response:**
```json
{
  "method": "weighted_moving_average_with_seasonal",
  "disclaimer": "การพยากรณ์ใช้ค่าเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ AI",
  "current_cash": 350000,
  "avg_monthly_burn": 45000,
  "runway_months": 7.8,
  "forecast": [
    {
      "month": "2568-02",
      "projected_income": 105000,
      "projected_expense": 82000,
      "projected_net": 23000,
      "projected_cash_balance": 373000,
      "confidence_low": 18000,
      "confidence_high": 28000
    }
  ],
  "what_if": {
    "revenue_change_pct": -20,
    "adjusted_runway_months": 4.2,
    "warning": "Cash runway ต่ำกว่า 6 เดือน"
  }
}
```

### GET /api/report/:fileId/export/csv
Export transactions as CSV.

### GET /api/report/:fileId/export/pdf [Pro]
Export full PDF report with charts.

---

## Business Layer — Compare [Pro]

### POST /api/compare
Compare 2 SME files.

**Body:** `{ fileId1: string, fileId2: string }`

**Response:**
```json
{
  "file1": {"id": "...", "label": "2567 Q4"},
  "file2": {"id": "...", "label": "2568 Q1"},
  "income_change_pct": 5.2,
  "expense_change_pct": -3.1,
  "net_change_pct": 28.5,
  "categories": []
}
```

---

## Business Layer — Alerts [Pro]

### GET /api/alerts
Alert history.

**Query:** `?unread=true&limit=20`

**Response:**
```json
{
  "alerts": [
    {
      "id": "a_001",
      "type": "low_runway",
      "severity": "critical",
      "title": "Cash runway เหลือน้อยกว่า 3 เดือน",
      "message": "ตามค่าเฉลี่ยการใช้จ่ายปัจจุบัน เงินจะหมดในเดือนเมษายน",
      "created_at": "2568-01-15T08:00:00Z",
      "read": false
    }
  ]
}
```

### POST /api/alerts/settings
Update alert preferences.

**Body:**
```json
{
  "channels": {"email": true, "line": false},
  "frequency": "realtime | daily | weekly",
  "triggers": {
    "low_runway_months": 3,
    "category_over_budget": true,
    "new_leak_detected": true
  }
}
```

---

## Subscription

### GET /api/subscription
Get current subscription.

**Response:**
```json
{
  "plan": "PRO",
  "status": "ACTIVE",
  "current_period_start": "2025-01-01",
  "current_period_end": "2025-02-01",
  "cancel_at_period_end": false,
  "trial_ends_at": null
}
```

### POST /api/subscription/checkout
Create Stripe/Omise checkout session.

**Body:** `{ plan: "PRO" | "TEAM", billing: "monthly" | "yearly" }`
**Response:** `{ checkout_url: string }`

### POST /api/subscription/cancel
Cancel at period end.

### GET /api/subscription/history
Payment history.

---

## Admin (admin role required)

### GET /api/admin/stats
System overview statistics.

**Response:**
```json
{
  "users": {
    "total": 1248,
    "new_this_week": 43,
    "pro": 187,
    "team": 23,
    "conversion_rate": 15.0
  },
  "civic_layer": {
    "monthly_visitors": 42500,
    "page_views": 178000,
    "top_projects": []
  },
  "business_layer": {
    "files_today": 84,
    "files_total": 12401,
    "active_alerts": 156
  },
  "revenue": {
    "mrr": 55913,
    "arr": 670956,
    "growth_pct": 12
  }
}
```

### GET /api/admin/users
List users with search.

**Query:** `?q=&page=1&limit=20&role=&status=`

### GET /api/admin/users/:id
User detail and usage history.

### PATCH /api/admin/users/:id
Update user.

**Body:** `{ role?: Role, banned?: boolean }`

### GET /api/admin/files
All Business Layer files in system.

### GET /api/admin/subscriptions
All subscriptions with filters.

### POST /api/admin/civic-data/upload
Upload new fiscal year dataset.

**Body:** `multipart/form-data`
- `file` — JSON file matching BudgetData schema
- `year` — fiscal year string
- `replace` — boolean (replace existing year data)

**Response:**
```json
{
  "year": "2569",
  "ministry_count": 20,
  "project_count": 4953,
  "red_flag_count": 18,
  "validation_warnings": [],
  "cached_at": "2025-01-15T12:00:00Z"
}
```

### GET /api/admin/logs
System logs and errors.

**Query:** `?level=error|warn|info&from=&to=&limit=100`

---

## Parser Microservice (FastAPI)

Internal service at `http://parser:8000` (not exposed publicly).

### GET /parse/health
Health check.

**Response:** `{ "status": "ok", "version": "1.0.0" }`

### POST /parse/government-pdf
Parse government budget PDF (admin only, for civic data prep).

**Body:** `multipart/form-data` with `file` field
**Response:** `BudgetData` JSON structure

### POST /parse/excel
Parse SME Excel template.

**Body:** `multipart/form-data`
- `file` — .xlsx or .xls file
- `template_version` — `v1` (default)

**Response:** `SMEFinancialData` JSON structure

### POST /parse/bank-statement
Parse bank statement.

**Body:** `multipart/form-data`
- `file` — PDF or Excel
- `bank` — `scb | kbank | bbl`

**Response:** `SMEFinancialData`

### POST /parse/accounting-export
Parse accounting software export.

**Body:** `multipart/form-data`
- `file` — Excel/CSV
- `software` — `peak | flowaccount | acccloud`

**Response:** `SMEFinancialData`

### POST /analyze/leaks
Run leak detection on transactions.

**Body:**
```json
{
  "transactions": [],
  "rules": ["spike", "duplicate", "outlier", "creep"]
}
```

**Response:** `{ leaks: [], stats: {} }`

### POST /analyze/forecast
Run cash flow forecast.

**Body:**
```json
{
  "monthly_history": [
    {"month": "2567-01", "income": 100000, "expense": 80000}
  ],
  "current_cash": 350000,
  "forecast_months": 6,
  "revenue_change_pct": 0
}
```

**Response:** Same as `/api/report/:fileId/forecast`

---

## Error codes reference

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_INPUT` | 400 | Validation error |
| `UNAUTHORIZED` | 401 | Not logged in |
| `FORBIDDEN` | 403 | No permission (e.g., Free user accessing Pro feature) |
| `NOT_FOUND` | 404 | Resource not found |
| `QUOTA_EXCEEDED` | 429 | Free plan quota reached |
| `INVALID_FORMAT` | 422 | File format not supported |
| `FILE_TOO_LARGE` | 413 | File > 50MB |
| `PARSE_ERROR` | 422 | Parser couldn't extract data |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate limits

- Civic Layer endpoints: 60 req/min per IP
- Auth endpoints: 5 req/min per IP
- File upload: 10 req/hour per user
- Other Business Layer: 120 req/min per user
- Admin: no limit
