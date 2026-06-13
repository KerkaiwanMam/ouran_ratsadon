# Page Playbooks

One checklist per page. Each page must satisfy all three layers (Narrative on top, Evidence
controls, governed data). The "specific" items are the things that page tends to get wrong.

Score the data tables: numbers right-aligned + `tabular-nums`, text left, comfortable rows, no edge
contact. Confirm every insight/chart segment has a drill-down to its rows.

---

## /dashboard — Overview

**Layer 3 (top):** `NarrativeInsight` with the month's headline ("เดือนนี้ใช้จ่าย ฿X สูงขึ้น Y% จาก
หมวด Z") + a `verifyHref` to the relevant transactions. Just below, an **"วันนี้ควรทำอะไร" (Actionable
Today)** card fed from `Recommendation` (status=PENDING, priority=high).

**Layer 2 (evidence):**
- Summary KPI row — burn rate, cash runway, top leak — as `KpiCard`s reading `ForecastSnapshot`
  (governed). Use `tone="warn"/"risk"` when runway is low.
- **Comparative chart: current month vs previous month** (Recharts bar/line). Both series clearly
  labeled; legend not overlapping bars; y-axis with units (฿). Clicking a bar drills to that period's
  transactions.

**Specific pitfalls to fix:** KPI cards crammed together (`gap-6`, equal heights); comparative chart
with no legend or with the two series indistinguishable; elements with uneven vertical spacing — the
brief specifically calls out "ระยะห่างขององค์ประกอบต้องไม่กวนสายตา", so enforce a single `space-y-8`
rhythm and `grid gap-6` for the KPI row.

---

## /transactions — The evidence ledger (most important verification surface)

This page IS Layer 2 — it's where users land from every `DrillDownLink`. Make it pristine.

**Layer 3 (top):** optional short narrative summarizing the *currently filtered* set
("รายการที่กรอง: 128 รายการ รวม ฿X — 3 รายการถูก flag ว่าผิดปกติ").

**Layer 2 (evidence) — the core:**
- `EvidenceToolbar` with: search box (full-text over description/counterparty, pg_trgm — FREE),
  category filter, date-range filter. Controls aligned on one row, `gap-3`, equal height `h-10`.
- Clean data table: amount right-aligned `tabular-nums`, date and category columns aligned, leak/flag
  shown as a small colored chip with a reason on hover, `divide-y divide-slate-100`, rows `py-3`.
- Row click → transaction detail / drill context.
- **Symmetric pagination**: centered or consistently right-aligned, equal button sizing, current page
  clearly marked, prev/next disabled states. The brief flags pagination symmetry explicitly.

**Specific pitfalls:** dense `py-1` rows; numbers left-aligned; filters of differing heights; ragged
pagination; search that doesn't visibly reflect the active query.

---

## /analytics — Proportions & deep-dive

**Layer 3 (top):** `NarrativeInsight` interpreting the breakdown ("หมวด 'เงินเดือน' คิดเป็น 42% ของ
รายจ่าย เพิ่มจาก 35% เดือนก่อน") + drill-down.

**Layer 2 (evidence):**
- **Donut chart** for category share + **Bar chart** for trend/top categories (Recharts).
- Charts must be *clean*: legends and labels must NOT overlap or stack on the plot; every axis has a
  clear, non-overlapping scale label; donut has a center total or a side legend with %; consistent
  color mapping with the rest of the app.
- Clicking a donut slice or a bar drills to the matching transactions on /transactions (filter
  pre-applied) — the verification path.

**Specific pitfalls:** the brief calls out "ไม่ทับซ้อนกัน" (no overlap) and "คำอธิบายสเกลที่ชัดเจน" —
so the most common failure here is cramped/overlapping labels and missing axis units. Give charts
real height (`h-72`+), use `margin` in Recharts, and move dense legends to the side.

---

## /vendors — Supplier / contractor management

**Layer 3 (top):** `NarrativeInsight` on spend concentration ("3 ซัพพลายเออร์แรกคิดเป็น 61% ของ
รายจ่าย — ค่าใช้จ่ายกับ 'X' เพิ่มขึ้นต่อเนื่อง 3 เดือน") + drill-down.

**Layer 2 (evidence):**
- Vendor list/table: name, **total deal value**, **payment history** (small sparkline of monthly
  spend), last-paid date.
- **Ranking filter** — sort/group by highest spend, by rising trend, by frequency (the brief asks for
  "คัดกรองจัดอันดับ Vendor เช่น ยอดใช้จ่ายสูงสุด").
- Clear **action buttons** per row (e.g. "ดูโปรไฟล์", "ดูรายการทั้งหมด") — real `<button>`/`<a>`,
  consistent sizing, not floating ambiguously. Row → vendor profile with the full transaction history.

**Specific pitfalls:** vendor rows that don't make the total/most-recent obvious; sparklines with no
baseline; action buttons of inconsistent style or unclear affordance; no visible sort control even
though ranking is the whole point of the page.

---

## Cross-page consistency check (run last)

- Same `NarrativeInsight` / `EvidenceToolbar` / `KpiCard` / `TierBadge` components everywhere.
- Same spacing rhythm (`space-y-8`, `gap-6`, `p-6`, `px-4 py-3`).
- Same color + Thai font stack.
- Every page answerable from its own surface: a user arriving from a drill-down link should see the
  filtered evidence immediately, not a blank default view.
