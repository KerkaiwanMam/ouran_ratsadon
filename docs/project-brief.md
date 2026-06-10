# ouran_ratsadon — Project Brief & Business Context

## Business idea (v2)

แพลตฟอร์ม Budget Intelligence แบบ 2 ชั้น (Two-Layer Platform):

1. **Civic Layer**: ระบบสำรวจงบประมาณภาครัฐสาธารณะแบบ WeVis + USASpending.gov (ฟรี ไม่ต้อง login)
2. **Business Layer**: เครื่องมือวิเคราะห์ค่าใช้จ่ายและ Cash Flow สำหรับ SME (Subscription)

โดยสองชั้นนี้ใช้ infrastructure ร่วมกัน แต่แยก user journey และ revenue model

### ปัญหาที่แก้

**ภาครัฐ:**
- ดัชนีทุจริต CPI ของไทยปี 2025 อยู่ที่ 33 คะแนน ต่ำสุดในรอบ 14 ปี
- เอกสารงบประมาณรัฐอ่านยาก กระจัดกระจาย ไม่มีเครื่องมือเปรียบเทียบข้ามหน่วยงาน
- ประชาชนต้องการตรวจสอบงบประมาณแต่ไม่มีเครื่องมือที่เข้าถึงง่าย

**SME:**
- Cash Flow Management คือสาเหตุหลักที่ทำให้ SME ปิดกิจการ
- ยอดขายดี กำไรทางบัญชีสูง แต่ขาดสภาพคล่อง
- Excel/โปรแกรมบัญชี เน้นบันทึก ไม่ได้เน้นวิเคราะห์
- ไม่มีเครื่องมือพยากรณ์ Cash Flow ที่ใช้ง่าย

### Value proposition (ที่แตกต่างจาก v1)

**Civic Layer:**
- "ตรวจสอบงบประมาณรัฐได้ทุกคน ไม่ต้องล็อกอิน"
- Drill-down จากกระทรวง → กรม → โครงการ
- Red Flag อัตโนมัติ (เพิ่มผิดปกติ, ซ้ำซ้อน, มูลค่าสูง)
- แชร์/Embed กราฟไปยังเว็บข่าวได้

**Business Layer:**
- "หาจุดรั่วไหลในธุรกิจคุณ + บอกว่าเงินจะหมดเมื่อไหร่"
- Leak Detection (4 กฎ: spike, duplicate, outlier, creep)
- Cash Flow Forecasting (WMA + Seasonal, ไม่ใช่ AI)
- What-If Scenario Calculator

### Target customers (ใหม่)

**Civic Layer (free users — สร้าง traffic):**
- ประชาชนทั่วไปที่สนใจการเมือง/งบประมาณ
- นักข่าวสายตรวจสอบ
- NGO ด้านความโปร่งใส
- นักศึกษา / นักวิจัย

**Business Layer (paying customers — สร้างรายได้):**
- เจ้าของ SME ที่กำลังโตและกังวลเรื่อง Cash Flow
- Startup ที่ต้องการ tracking burn rate
- บริษัทขนาดเล็ก-กลางที่อยากเห็นภาพรวมค่าใช้จ่าย

### Revenue model

```
Civic Layer:        ฟรี (เป็น marketing funnel)
Business Free:      ฟรี (3 ไฟล์/เดือน — สำหรับ trial)
Business Pro:       ฿299/เดือน (฿2,999/ปี ประหยัด 16%)
Business Team:      ฿799/เดือน (5 users + shared workspace)
```

**เป้าหมายเดือนที่ 12:**
- Civic Layer: 50,000 monthly visitors
- Business Free: 1,000 users
- Business Pro: 150 users → ฿44,850/เดือน
- Business Team: 50 workspaces → ฿39,950/เดือน
- รายได้รวม: ฿84,800/เดือน

---

## Known risks (จากการวิเคราะห์ตลาด)

### Risk 1: PDF Parsing ของรัฐยาก [แก้แล้ว]
**ปัญหาเดิม**: User อัปโหลด PDF รัฐแล้ว parse ไม่ได้
**วิธีแก้ใน v2**: ทีมงาน pre-process ข้อมูลเอง (offline) ก่อนเผยแพร่ — runtime ไม่ต้อง parse PDF เลย

### Risk 2: Dual market ทำพร้อมกันไม่ได้ [แก้แล้ว]
**ปัญหาเดิม**: ขายรัฐ + SME พร้อมกัน → focus หาย
**วิธีแก้ใน v2**: ไม่ขายรัฐ — ใช้ Civic Layer เป็น marketing → focus กับ SME อย่างเดียวในการสร้างรายได้

### Risk 3: SME ไม่จ่ายสำหรับ dashboard [แก้แล้ว]
**ปัญหาเดิม**: SME มี Excel อยู่แล้ว ไม่เห็นคุณค่า dashboard
**วิธีแก้ใน v2**: เปลี่ยน value prop เป็น "หาจุดรั่วไหล + พยากรณ์เงินจะหมดเมื่อไหร่" ซึ่ง Excel ทำเองไม่ได้

### Risk 4: AI Forecasting แม่นยำไม่พอ [แก้แล้ว]
**ปัญหาเดิม**: สัญญา "AI forecast" แต่ทำไม่ได้จริง
**วิธีแก้ใน v2**: ใช้สถิติพื้นฐาน (WMA + Seasonal) แล้วบอก user ตรงๆ ว่า "ไม่ใช่ AI" → ความเชื่อมั่นสูงขึ้น

---

## User flow summaries (v2)

### Civic Layer flow (no login)

```
ผู้เข้าชม → /explore
        │
        ├── เลือกปีงบประมาณ (2566-2569)
        ├── ดู Treemap ภาพรวม
        ├── คลิก กระทรวง → ดูกรมในกระทรวง
        ├── คลิก กรม → ดูโครงการในกรม
        ├── คลิก โครงการ → /project/[id]
        │        ├── ดู Red Flag (ถ้ามี)
        │        ├── ดูประวัติย้อนหลัง 5 ปี
        │        ├── ดูโครงการเกี่ยวข้อง
        │        └── แชร์ / Embed / Download
        │
        ├── หรือไป /search
        │        ├── พิมพ์คำค้น
        │        ├── เลือก filter (กระทรวง, ประเภท, วงเงิน, สถานะ)
        │        ├── ดูผลลัพธ์ใน Table/Map/Chart
        │        └── Export CSV
        │
        └── เห็น CTA → "วิเคราะห์ธุรกิจของคุณ" → ไป /register
```

### Business Layer flow

**Guest → Member**
1. มาจาก Civic Layer หรือ landing page → /register
2. Register (email/Google OAuth)
3. Verify email → auto-login → /dashboard
4. Onboarding: ดาวน์โหลด Excel template ตัวอย่าง

**Member Free — ครั้งแรก**
1. /dashboard (empty state) → ปุ่ม "อัปโหลดไฟล์แรก"
2. /upload → เลือก Excel template → ลาก/วาง
3. Processing → Dashboard auto-render
4. ดูกราฟพื้นฐาน (cash flow, category breakdown)
5. เห็น Leak Detection แต่ blur → "อัปเกรด Pro เพื่อดู"

**Member Pro — sessions ปกติ**
1. /dashboard → เห็น alert ใหม่ (ถ้ามี)
2. คลิก alert → /report/[id]/leaks → ดูจุดที่ flag
3. /report/[id]/forecast → เลื่อน slider what-if
4. ส่ง report PDF ให้ผู้ถือหุ้น

### Admin flow
1. /admin → ดู stats รวม (users, revenue, Civic traffic)
2. /admin/civic-data → upload data ปีงบประมาณใหม่
3. /admin/users → จัดการ user
4. /admin/subscriptions → จัดการ Pro/Team

---

## Conversion funnel (Civic → Business)

```
Step 1: SEO Traffic
  ↓ "งบประมาณ 2569 กระทรวงศึกษา" → /project/[id]
  ↓ social share "งบทหาร vs งบการศึกษา" → /compare
  
Step 2: Engagement (no login)
  ↓ ใช้ Treemap, filter, ดู Red Flag
  ↓ download CSV, embed widget
  
Step 3: Interest (CTA visible)
  ↓ "อยากวิเคราะห์ธุรกิจของคุณบ้าง?" banner
  ↓ blog: "5 สัญญาณที่ SME ของคุณกำลังรั่วไหล"
  
Step 4: Sign Up (Free)
  ↓ ดาวน์โหลด Excel template
  ↓ อัปโหลดไฟล์แรก → เห็น dashboard
  
Step 5: Upgrade (Pro)
  ↓ เห็น Leak Detection blur → ต้อง upgrade
  ↓ ครบ 3 ไฟล์/เดือน → quota exceeded
  ↓ อยาก export PDF report
```

---

## Wireframe reference (v2)

### Civic Layer wireframes (รูปแบบ WeVis + USASpending)

**Budget Explorer (/explore):**
- Left sidebar (220px): year selector pills, view filters, comparison bars
- Main: breadcrumb → stat cards (3 col) → treemap (3 col x 2 row grid)
- Treemap cells: ministry name + amount + percentage + red flag badge
- Below treemap: notable items table with status badges (red/amber/green)
- Top: search bar + view switcher (Treemap/Sunburst/Table) + Share button

**Advanced Search (/search):**
- Top bar: search input + "ค้นหา" button + "ล้างทั้งหมด"
- Left filter panel (230px) with 6 groups:
  1. ตัวกรองที่เลือก (active tags)
  2. กระทรวง (search + checkbox + count)
  3. ประเภทงบ (checkbox + count)
  4. ช่วงวงเงิน (min-max input)
  5. สถานะ (red flag, increased, duplicate)
  6. ปีงบประมาณ
- Main: tabs (Table/Map/Chart) → result count → stat strip (4 cards) → map placeholder → results table with row highlight for red flags → pagination

**Project Detail (/project/[id]):**
- Two-column: main content (left) + sidebar (280px, right)
- Header: breadcrumb + Share/Download buttons
- Project name + red flag badge + meta (ministry, year, province)
- Red flag explanation box (left-border accent, light red bg)
- Project info table (rows: amount this year, amount last year, % change, budget type, plan, dept, code)
- 5-year history bar chart (current year highlighted red)
- Sidebar: Share buttons (X/Copy/Embed) + Related Projects + Download (CSV/PDF/JSON) + Data Source citation

### Business Layer wireframes

**SME Dashboard (/dashboard):**
- Left sidebar (200px): main nav, anomaly count badge, Pro badge
- Main: top bar (filters + export) → stat cards (4 col) → bar chart + pie chart → data table
- Status badges in table: ปกติ (green), ผิดปกติ (red), ตรวจสอบ (amber)

**Upload (/upload):**
- Format tabs: Excel template / Bank statement / Accounting export
- Drag-and-drop zone (dashed purple border)
- File quota bar (Free plan)
- Upload states: processing (with progress bar), success (with action buttons)

**Pricing (/pricing):**
- Monthly/Yearly toggle (20% off badge)
- 2 cards: Free vs Pro (purple highlight)
- Feature list with check/x icons
- FAQ accordion

---

## Design system specifics

- **Primary**: Purple (#7F77DD)
- **Treemap colors** (categorical): Purple, Amber, Teal, Coral, Gray
- **Status colors**:
  - Red flag critical: bg #FCEBEB, text #A32D2D
  - Red flag warning: bg #FAEEDA, text #854F0B
  - Normal: bg #EAF3DE, text #3B6D11
- **Layout**:
  - Civic sidebar: 220px (with year selector + filters)
  - Business sidebar: 200px (with main nav)
  - Right sidebar (project detail): 280px
- **Charts**: Treemap (D3), Sunburst (D3), Map (Leaflet), Bar/Pie/Line (Recharts)

---

## 4-week development plan (revised for v2)

### Week 1: Foundation + Civic Data (Day 1-7)
- Day 1-2: GitHub repo, README skeleton, Next.js + TS + Tailwind setup, project structure
- Day 3-4: Pre-process 1 fiscal year of government budget data into JSON (this is the hard part)
- Day 5-7: Build Civic API endpoints (years, budget, ministry, project), test with sample data

### Week 2: Civic Layer Frontend (Day 8-14)
- Day 8-9: Layout (header, civic sidebar, footer), routing setup
- Day 10-12: /explore page with Treemap (D3), year selector, drill-down
- Day 13-14: /search page with filter panel, result table, active filter tags

### Week 3: Civic Detail + Business Layer Start (Day 15-21)
- Day 15-16: /project/[id] detail page with 5-year history chart
- Day 17-18: Auth (register, login, Google OAuth) + Business sidebar
- Day 19-20: /upload page with Excel template + parsing → /dashboard
- Day 21: Basic leak detection (2 rules) + CSV export

### Week 4: Polish + Deploy + Docs (Day 22-30)
- Day 22-23: Responsive design, dark mode, loading states, error handling
- Day 24-25: Deploy (Vercel + Railway), env vars, production testing
- Day 26-27: README with hero screenshot, architecture diagram, two-layer concept
- Day 28-29: Screenshots, demo video, sample files (Civic data + SME Excel template)
- Day 30: Buffer, final review, LinkedIn/GitHub post

### Time estimate: ~120 hours (4 hrs/day × 30 days)

### Phase 0 Cut Criteria
If running out of time, cut in this order:
1. Drop Business Layer entirely → focus on polished Civic Layer
2. Drop /search page → only /explore + /project/[id]
3. Drop drill-down → only top-level treemap
4. Drop Treemap → use simple bar chart of top 20 ministries

The Civic Layer alone is a strong portfolio piece (open data + civic tech + Thai government).

---

## Sample data prep guide

### For Civic Layer
1. Download `พ.ร.บ. งบประมาณรายจ่ายประจำปี 2568` PDF from `bb.go.th`
2. OR use machine-readable data from WeVis: search for `bit.ly/openbudget68` style URLs
3. Parse using Python script in `apps/parser/`
4. Validate JSON structure matches `BudgetData` schema in CLAUDE.md
5. Place in `/data/budget-2568.json`
6. Run red flag detection script → output cached results

### For Business Layer
1. Create Excel template with columns: วันที่, รายการ, หมวดหมู่, จำนวนเงิน, ประเภท
2. Generate 3 sample SME files:
   - `restaurant-2567.xlsx` — ร้านอาหารขนาดเล็ก 12 เดือน
   - `ecommerce-2567.xlsx` — ร้านค้าออนไลน์ 6 เดือน
   - `consulting-2567.xlsx` — บริษัทที่ปรึกษา 12 เดือน
3. Inject 2-3 anomalies in each file for leak detection demo
