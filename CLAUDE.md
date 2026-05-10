# ouran_ratsadon — Budget Intelligence Platform

## About this project

A web application that transforms complex budget documents (PDF/Excel) into real-time interactive dashboards. Built as a portfolio project demonstrating full-stack development skills.

**Primary language**: Thai (UI), English (code)
**Target users**: Thai government agencies (transparency), SMEs (cash flow management)
**Revenue model**: Freemium (Free + Pro subscription at ฿299/month)

## Tech stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Backend**: node.js API Routes + Python microservice (FastAPI) for PDF/Excel parsing
- **PDF parsing**: pdfplumber (Python)
- **Excel parsing**: openpyxl + pandas (Python)


## Project structure

```
ouran_ratsadon/
├── CLAUDE.md
├── README.md
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (public)/       # Landing, About, Features, Pricing, Contact, Demo
│   │   │   ├── (auth)/         # Login, Register, Forgot/Reset Password
│   │   │   ├── (dashboard)/    # Member pages (requires auth)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── upload/
│   │   │   │   ├── files/
│   │   │   │   ├── report/[id]/
│   │   │   │   ├── compare/
│   │   │   │   ├── settings/
│   │   │   │   └── upgrade/
│   │   │   └── (admin)/        # Admin panel (requires admin role)
│   │   │       ├── admin/
│   │   │       ├── admin/users/
│   │   │       ├── admin/files/
│   │   │       ├── admin/subscriptions/
│   │   │       └── admin/logs/
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── charts/         # Recharts wrappers
│   │   │   ├── layout/         # Header, Sidebar, Footer
│   │   │   └── shared/         # Reusable components
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── utils/
│   └── parser/                 # Python FastAPI microservice
│       ├── main.py
│       ├── parsers/
│       │   ├── pdf_parser.py
│       │   └── excel_parser.py
│       ├── models/
│       └── utils/
├── prisma/
│   └── schema.prisma
├── docs/
│   ├── wireframes/
│   ├── api-spec.md
│   └── database-schema.md
└── sample-data/                # Sample budget files for testing
```

## User roles

There are 4 roles. Always check role before rendering pages or calling APIs.

- **Guest**: Unauthenticated visitor. Can see public pages only.
- **Member (Free)**: Registered user. Limited to 3 file uploads/month. Basic charts (Bar, Pie). Export CSV only.
- **Member (Pro)**: Paying subscriber ฿299/month. Unlimited uploads. All charts + drill-down. Anomaly detection. File comparison. PDF export. Priority support.
- **Admin**: System administrator. Full access to admin panel at /admin. Can manage users, view all files, manage subscriptions, view logs.

## Routes and pages

### Public (no auth)
- `/` — Landing page with hero, how-it-works, features, pricing preview, footer
- `/about` — Mission, team, tech stack, timeline
- `/features` — All features with Free vs Pro comparison
- `/pricing` — Plan cards with monthly/yearly toggle and FAQ
- `/demo` — Interactive demo with sample data (no login needed)
- `/contact` — Contact form + LINE OA + email
- `/privacy` — Privacy policy
- `/terms` — Terms of service

### Auth
- `/login` — Email/password + Google OAuth
- `/register` — Form with password strength meter + Google OAuth
- `/forgot-password` — Email input for reset link
- `/reset-password` — New password form (token-based)

### Member (auth required)
- `/dashboard` — Main workspace: stat cards, bar chart, pie chart, line chart, data table with anomaly highlights
- `/upload` — Drag-and-drop upload zone, file quota bar, processing states
- `/files` — File history with search, filter, status badges
- `/report/:id` — Full dashboard for a specific file
- `/report/:id/overview` — Summary cards + main charts
- `/report/:id/detail` — Sortable data table
- `/report/:id/anomalies` — Anomaly list [Pro only]
- `/report/:id/export` — Export options
- `/compare` — Side-by-side comparison of 2 files [Pro only]
- `/settings/profile` — Name, email, avatar
- `/settings/security` — Password, 2FA
- `/settings/billing` — Plan info, payment history
- `/settings/notifications` — Alert preferences
- `/upgrade` — Upgrade to Pro CTA

### Admin (admin role required)
- `/admin` — System overview: total users, pro members, uploads today, monthly revenue, revenue chart, recent users table
- `/admin/users` — User list with search, filter, role change, ban
- `/admin/users/:id` — User detail + usage history
- `/admin/files` — All uploaded files in system
- `/admin/subscriptions` — Active subscriptions management
- `/admin/logs` — System logs and errors

## Core features — MVP (Phase 0)

### File upload and processing
- Accept PDF (text-based only, no OCR) and Excel (.xlsx, .xls)
- Drag-and-drop + file picker
- Validate file type and size (max 50MB)
- Show progress bar during processing
- Free plan: 3 files/month limit with quota bar
- Extract budget data into structured JSON with categories, amounts, dates

### Dashboard and visualization
- Summary stat cards: total budget, spent, remaining, anomaly count
- Bar chart: budget by category
- Pie chart: spending proportions
- Line chart: trend over time (if data supports it)
- Data table with sorting, pagination, search
- Filter by category and date range
- Drill-down on chart click [Pro]

### Anomaly detection [Pro]
- Flag items exceeding 2 standard deviations
- Flag unusual increases vs previous period
- Flag duplicate entries
- Highlight with red/yellow in table and charts
- Separate anomaly report page

### Export
- CSV export (all users)
- PDF report with charts [Pro]
- Print-friendly view

### Subscription
- Pricing page with Free vs Pro comparison
- Payment gateway integration
- Subscription management (upgrade, cancel)
- Payment history
- Renewal reminders
- 14-day free trial (no credit card required)

### Admin panel
- System stats dashboard
- User management (search, view, ban, change role)
- File management
- Subscription management
- System logs

## Data schema (expected JSON from parser)

```json
{
  "metadata": {
    "filename": "string",
    "file_type": "pdf | xlsx",
    "fiscal_year": "string",
    "organization": "string",
    "parsed_at": "ISO 8601 datetime",
    "total_items": "number"
  },
  "summary": {
    "total_budget": "number",
    "total_spent": "number",
    "total_remaining": "number",
    "categories": [
      {
        "name": "string (e.g. บุคลากร, ดำเนินงาน, ครุภัณฑ์, วัสดุ)",
        "budget": "number",
        "spent": "number",
        "percentage": "number"
      }
    ]
  },
  "items": [
    {
      "id": "string",
      "description": "string",
      "category": "string",
      "amount": "number",
      "date": "string | null",
      "anomaly_flag": "none | warning | critical",
      "anomaly_reason": "string | null"
    }
  ]
}
```

## Coding conventions

- **TypeScript**: Strict mode, no `any` types. Use interfaces for data shapes, types for unions.
- **Components**: Functional components only. Use custom hooks for shared logic. One component per file.
- **Naming**: PascalCase for components, camelCase for functions/variables, UPPER_SNAKE for constants, kebab-case for files/folders.
- **Styling**: Tailwind utility classes. Use shadcn/ui for form controls, dialogs, toasts. No inline style objects.
- **State**: React state (useState, useReducer) for local state. React Context for auth/theme. No Redux.
- **API calls**: Use fetch with proper error handling. Create typed API client functions in `/lib/api.ts`.
- **Error handling**: Always show user-friendly Thai error messages. Use toast notifications for actions. Use error boundaries for pages.
- **Commits**: Conventional commits — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Commit at least 1-2 times per day.
- **Branching**: Feature branches from `main`. Branch name: `feat/feature-name`, `fix/bug-name`.
- **Comments**: Comment complex logic only. JSDoc for exported functions.
- **Python (parser)**: Use type hints. Follow PEP 8. Use pydantic for validation. Async endpoints with FastAPI.

## Design system

- **Primary color**: Purple (#7F77DD / #534AB7 for darker)
- **Success**: Green (#1D9E75)
- **Warning**: Amber (#BA7517 / #EF9F27)
- **Error**: Red (#E24B4A / #A32D2D)
- **Backgrounds**: Use shadcn/ui defaults (light/dark mode support)
- **Border radius**: `rounded-md` for inputs, `rounded-lg` for cards
- **Fonts**: System font stack (Tailwind default)
- **Icons**: Lucide React icons (comes with shadcn/ui)
- **Dark mode**: Support via Tailwind `dark:` classes
- **Responsive**: Mobile-first. Breakpoints: sm (640), md (768), lg (1024)
- **Sidebar**: 200px fixed width on desktop, collapsible on mobile
- **Language**: All UI text in Thai. Code and variable names in English.

## API endpoints

### Auth
- `POST /api/auth/register` — Register with email/password
- `POST /api/auth/login` — Login, returns JWT
- `POST /api/auth/logout` — Invalidate session
- `POST /api/auth/forgot-password` — Send reset email
- `POST /api/auth/reset-password` — Reset with token
- `GET /api/auth/me` — Get current user

### Files
- `POST /api/files/upload` — Upload PDF/Excel, triggers parsing
- `GET /api/files` — List user's files (with pagination, filter)
- `GET /api/files/:id` — Get file metadata + parsed data
- `DELETE /api/files/:id` — Delete file and associated data

### Budget / Report
- `GET /api/budget/:fileId` — Get full parsed budget data
- `GET /api/budget/:fileId/summary` — Get summary only
- `GET /api/budget/:fileId/anomalies` — Get anomaly list [Pro]
- `GET /api/budget/:fileId/export/csv` — Export as CSV
- `GET /api/budget/:fileId/export/pdf` — Export as PDF [Pro]

### Compare [Pro]
- `POST /api/compare` — Compare 2 files, body: { fileId1, fileId2 }

### Subscription
- `GET /api/subscription` — Get current plan
- `POST /api/subscription/checkout` — Create checkout session
- `POST /api/subscription/cancel` — Cancel subscription
- `GET /api/subscription/history` — Payment history

### Admin
- `GET /api/admin/stats` — System overview stats
- `GET /api/admin/users` — List all users (with search, pagination)
- `GET /api/admin/users/:id` — User detail
- `PATCH /api/admin/users/:id` — Update user (role, ban)
- `GET /api/admin/files` — All files in system
- `GET /api/admin/subscriptions` — All active subscriptions
- `GET /api/admin/logs` — System logs

### Parser (Python microservice)
- `POST /parse/pdf` — Upload PDF, returns structured JSON
- `POST /parse/excel` — Upload Excel, returns structured JSON
- `GET /parse/health` — Health check

## Priority matrix

### P0 — Must have (Week 1-2)
- File upload (PDF + Excel)
- Data extraction to JSON
- Dashboard with bar chart, pie chart, stat cards
- Data table with sorting
- Basic filter/search
- Auth (register, login, logout)
- Deploy to production

### P1 — Should have (Week 3)
- Anomaly detection
- Responsive design
- Export CSV
- Line chart
- File history
- Settings page
- Google OAuth

### P2 — Nice to have (Week 4)
- File comparison [Pro]
- PDF export [Pro]
- Dark mode
- Admin panel
- Demo video
- Payment integration

## Sample data

Use 2-3 sample Thai government budget files for development:
- Source: data.go.th, กรมบัญชีกลาง, สำนักงบประมาณ
- Focus on text-based PDFs (not scanned)
- Expected categories: บุคลากร, ดำเนินงาน, ลงทุน, ครุภัณฑ์, วัสดุ, ที่ดินและสิ่งก่อสร้าง

## Important notes

- This is a portfolio project, not a production SaaS. Focus on clean code and good UX over handling every edge case.
- PDF parsing is the riskiest part. If it doesn't work within 3 days, fall back to Excel + JSON only.
- Keep README excellent: hero screenshot, live demo link, tech stack, architecture diagram, features, quick start guide, lessons learned section.
- Commit history matters for portfolio — commit often with clear messages.
- All Thai government budget data is public domain; no copyright concerns.
