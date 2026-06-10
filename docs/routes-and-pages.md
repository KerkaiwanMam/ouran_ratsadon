# Routes and pages

> ส่วนขยายจาก CLAUDE.md — รายละเอียดทุก route ของแอป

## Public marketing (no auth)
- `/` — Landing page with hero, two-layer concept, social proof, pricing
- `/about` — Mission, team, tech stack, why this project exists
- `/pricing` — Free / Pro / Team comparison with FAQ
- `/contact` — Contact form + LINE OA + email
- `/privacy`, `/terms` — Legal pages

## Civic Layer (no auth, public budget explorer)
- `/explore` — Main view: treemap of all ministries, year selector (2566-2569), view switcher (treemap/sunburst/table), red flag count, drill-down to ministry/department/project
- `/search` — Advanced search: filter panel (ministry, budget type, amount range, status, year), result tabs (table/map/chart), active filter tags, sort, pagination, stat strip
- `/project/[id]` — Single project detail: 5-year history chart, red flag explanation, related projects, share/embed/download
- `/ministry/[id]` — Ministry detail: all departments, all projects, year-over-year trend
- `/compare` — Side-by-side comparison: pick 2 years OR 2 ministries, see diff with % change
- `/embed/[type]/[id]` — Embeddable widget for journalists/NGOs (iframe-safe)

## Auth
- `/login` — Email/password + Google OAuth
- `/register` — Form with password strength meter + Google OAuth
- `/forgot-password` — Email input for reset link
- `/reset-password` — Token-based new password form

## Business Layer (auth required)
- `/dashboard` — SME workspace: cash flow overview, recent files, alerts, quick stats
- `/upload` — Drag-and-drop, format selector (Excel template / bank statement / accounting export), quota bar
- `/files` — File history with search, filter, status badges
- `/report/[id]` — Full dashboard for a file
  - `/report/[id]/overview` — Cash flow, category breakdown, trend
  - `/report/[id]/detail` — Sortable data table
  - `/report/[id]/leaks` — Leak detection list [Pro]
  - `/report/[id]/forecast` — Cash flow forecast + what-if [Pro]
  - `/report/[id]/export` — CSV/PDF export
- `/files/compare` — Compare 2 SME files [Pro] (moved from `/compare` — collided with the Civic Layer's `/compare` saved-search comparison route; both can't resolve to the same path)
- `/alerts` — Alert history and settings [Pro]
- `/settings/profile`, `/settings/security`, `/settings/billing`, `/settings/notifications`
- `/upgrade` — Free → Pro upgrade page

## Admin (admin role required)
- `/admin` — System overview: users, revenue, uploads, civic layer traffic
- `/admin/users` — User management
- `/admin/users/[id]` — User detail
- `/admin/files` — All Business Layer files
- `/admin/subscriptions` — Active subscriptions
- `/admin/civic-data` — Manage Civic Layer dataset (upload new fiscal year data, edit red flag rules)
- `/admin/logs` — System logs
