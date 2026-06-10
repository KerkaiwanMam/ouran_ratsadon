# Core features — detailed UI/behavior spec (MVP / Phase 0)

> ส่วนขยายจาก CLAUDE.md — รายละเอียด UI และพฤติกรรมของแต่ละฟีเจอร์ ใช้ตอนตัด component จริง

## Civic Layer

### Budget explorer (/explore)
- Year selector: 2566, 2567, 2568, 2569 as pill buttons
- View switcher: Treemap / Sunburst / Table
- Treemap with proportional rectangles by budget size
- Each cell shows: ministry name, amount, percentage, red flag count badge
- Click ministry → drill down to departments
- Click department → drill down to projects
- Breadcrumb at top showing drill path
- Filter sidebar: by budget type, by ministry (multi-select), by amount range
- Stat strip: total budget, red flag count, project count
- Comparison bars in sidebar showing top 5 ministries

### Advanced search (/search)
- Top search bar with placeholder examples ("จัดซื้อ", "ก่อสร้าง", "วัคซีน")
- Left filter panel with collapsible groups: ministry (with search and counts), budget type (checkbox with counts), amount range (min-max inputs), status (red flag, increased >50%, duplicate), fiscal year
- Active filter tags at top showing what's selected (clickable to remove)
- Result tabs: Table / Map / Chart
- Stat strip with 4 cards: total amount, red flag count, average increase, new projects
- Map view: Thailand provinces colored by total budget allocated (darker = higher)
- Table with: project name, ministry, amount, year-over-year %, province, status badge
- Sort options: largest amount, biggest increase, alphabetical
- Pagination (20 per page)
- Export results as CSV

### Saved searches & comparison (/search) — Phase 1
> Inspired by USASpending.gov's Advanced Search ("save filters", "compare side-by-side")
- "Save this search" button next to the search bar — stores current `SearchFilters` (q, ministries, budgetTypes, amount range, status, sort) under a user-chosen label
- Saved searches list in a dropdown/sidebar — click to re-apply instantly, with a small badge showing result count delta since last visit ("+12 โครงการใหม่")
- Guest users: saved searches persist in `localStorage` only (no account needed); logged-in users: synced to DB so they survive across devices — gives a soft funnel reason to register
- "Compare" mode: pick 2-3 saved searches or filter sets → side-by-side stat strips (total amount, red flag count, avg increase) + overlapping bar chart, e.g. "งบกระทรวงสาธารณสุข ปี 2567 vs 2568"
- Every search result view has a shareable deep link (`/search?q=...&budgetTypes[]=...`) so filtered views can be sent directly — same deep-link principle should extend to `/explore` drill-down state

### Civic participation: project rating & comments (/project/[id]) — Phase 1/2
> Inspired by WeVis Bangkok Budgeting (citizens rate/rank/comment on budget items) — turns the Civic Layer from a one-way data viewer into a participatory tool, which is also a stronger funnel/retention story for recruiters
- "ให้คะแนนโครงการนี้" widget: simple 1-5 or thumbs up/down rating answering "คุณคิดว่าโครงการนี้ควรได้รับงบประมาณนี้หรือไม่"
- Aggregate display: "73% ของผู้โหวต (1,204 คน) เห็นว่างบสูงเกินไป" shown as a horizontal bar near the red flag box
- Public comment thread per project — plain text, rate-limited, basic profanity/spam filter (see `security.md`), moderation queue in admin panel
- Anti-abuse: one rating per project per IP/session for guests; one per account for logged-in users; comments require either a free account or a lightweight CAPTCHA-free challenge (avoid the bot-detection bypass concern entirely by gating on account creation)
- Sort/filter project lists by "most discussed" or "most disputed" (high rating disagreement) — surfaces civic interest, not just raw budget size

### Project detail (/project/[id])
- Header with project name + red flag badge if applicable + breadcrumb
- Red flag explanation box (left-border accent, light red bg): explains why flagged with statistical context
- Project info table: amount this year, amount last year, % change, budget type, plan, responsible department, budget code
- 5-year history bar chart with current year highlighted in red if flag exists
- Right sidebar: share buttons (X/Twitter, copy URL, embed code), related projects (with red flag dots), download options (CSV, PDF, JSON)
- Data source citation box at bottom

## Business Layer

### File upload (/upload)
- Three tabs for format: Excel template (recommended) / Bank statement (SCB, KBANK, BBL) / Accounting export (PEAK, FlowAccount)
- Drag-and-drop zone with format-specific instructions
- File quota bar for Free plan (3/month)
- Upload states: uploading → processing → success/error
- Auto-categorize after parse (with manual override option)

> Phase 0 ships Excel template only — bank/accounting tabs are Phase 2 (see roadmap.md)

#### Duplicate file & re-upload handling
> Implemented in `apps/web/app/api/files/upload/route.ts` + `fileHash`/`rowHash`/`softKey` columns in `prisma/schema.prisma`. Two layers, so "same file again" and "overlapping export with edits" are both handled without double-counting:

1. **File-level dedup (byte-identical re-upload).** On upload we hash the raw file bytes (SHA-256 → `File.fileHash`). If a file with the same hash already exists for this user, we don't re-parse or re-store it — we respond `409 DUPLICATE_FILE` with the existing file's name/date/transaction count and ask the user to confirm before re-importing (`force=true`). This covers "ฉันลากไฟล์เดิมเข้ามาอีกรอบโดยไม่ตั้งใจ".

2. **Row-level dedup (overlapping export with new/changed rows).** This is the case in the question — re-uploading a wider export that re-includes previously-imported rows *plus* new ones, possibly with corrections. Each transaction gets two fingerprints:
   - `rowHash` = hash of `(userId, date, description, amount, type, occurrence-index-within-day)`. An *occurrence index* disambiguates legitimate repeats (e.g. two ฿120 coffee purchases on the same day would otherwise collapse into one hash and the second would be wrongly skipped).
   - `softKey` = the same fingerprint **without** amount/category — identifies "this is the same underlying transaction" even if the figure changed.

   On import we compare incoming rows against everything the user has already stored (across all their files, not just the same file — catches re-exports with a wider date range):
   - **Exact `rowHash` match** → skip silently, don't insert, don't count toward totals or leak stats. Reported back as `dedup.skippedExactDuplicates`.
   - **`softKey` match but different amount/category** → likely a corrected re-export. We insert the new row (the newest figure should win on the dashboard) but tag it `leakFlag: DUPLICATE`, `leakSeverity: WARNING`, with a Thai-language `leakReason` explaining the old vs. new amount — surfacing it through the *existing* leak-detection UI for the user to review, rather than silently overwriting the original row or building a separate merge UI. Reported as `dedup.flaggedChanged`.
   - **No match** → new row, inserted normally with full leak-rule evaluation.

   The upload response includes a `dedup: { imported, skippedExactDuplicates, flaggedChanged }` summary so the upload UI can show e.g. "นำเข้า 240 รายการใหม่ • ข้าม 12 รายการซ้ำ • พบ 3 รายการที่ตัวเลขเปลี่ยนไป (ตรวจสอบในหน้ารายการ)".

   Deliberately **not** doing silent overwrite-in-place: financial data corrections should always be visible to the user, not invisible — consistent with the project's "no black-box" stance on forecasting/leak detection.

### SME Dashboard (/dashboard, /report/[id])
- Cash flow overview: income vs expense per month (line chart)
- Category breakdown (pie or stacked bar)
- Trend analysis: month-over-month comparison
- Budget vs Actual (if user sets budget) — Phase 1, needs budget-setting feature first
- Stat cards: total income, total expense, net, cash runway months

### Leak Detection [Pro]
- Auto-flag items based on 4 rules (see business-logic-v2.md for the formulas and thresholds):
  - Monthly spike, Duplicate, Outlier, Recurring creep
- Severity levels: critical (red), warning (amber), info (gray)
- Per-leak action: dismiss, mark as expected, view similar

> Phase 0 ships the Outlier rule only — see roadmap.md for why the others are deferred

### Vendor/counterparty pattern detection [Pro] — Phase 2
> Inspired by Palantir Foundry's Ontology concept (raw records → linked real-world objects with traceable relationships) — scaled down to something a single SME's transaction data can actually support
- Group transactions by recurring counterparty name (fuzzy-matched: "บจก. เอบีซี" ≈ "ABC Co., Ltd." ≈ "เอบีซี จำกัด") into a "vendor" entity, independent of the existing per-row leak rules
- Vendor profile view: total spend, transaction count, frequency pattern (monthly/irregular), trend line, and a plain-language insight such as "ยอดจ่ายให้ผู้ขายรายนี้เพิ่มขึ้น 40% ใน 3 เดือนที่ผ่านมา"
- Cross-links a vendor to every flagged transaction involving them — lets a user click "ผู้ขาย: เอบีซี" from a leak alert and see the full relationship history, not just the single flagged row
- Explicitly NOT real-time enrichment or external data matching (no AI/ML claims, consistent with the forecasting disclosure principle below) — purely aggregation + fuzzy string matching over the user's own uploaded data

### Cash Flow Forecasting [Pro] — Phase 1
- Method: Weighted Moving Average + Seasonal Index (NOT machine learning)
- Disclose explicitly to user: "การประมาณการด้วยค่าเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ AI"
- What-if slider: "ถ้ารายได้ลด X%" → recalculate cash runway
- Cash runway indicator: months until cash hits zero based on current burn rate
- Forecast next 3-6-12 months with confidence range (lighter band around projection)

### Alerts [Pro] — Phase 1
- Triggers: cash runway <3 months, category over budget, new red flag detected
- Channels: email (Phase 1), LINE notify (Phase 2)
- Frequency: real-time / daily digest / weekly summary
