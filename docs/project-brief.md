# ouran_ratsadon — Project Brief & Business Context

## Business idea

แพลตฟอร์ม Budget Intelligence ที่ใช้ AI และ Data Analysis เปลี่ยนเอกสารงบประมาณที่ซับซ้อน (PDF/Excel) ให้เป็น Dashboard แบบ Real-time

### ปัญหาที่แก้
- ความยุ่งยากในการอ่านเอกสารงบประมาณราชการ
- ความไร้ประสิทธิภาพในการจัดการรายจ่ายในธุรกิจ SME

### Value proposition
1. **Zero-Configuration** — โยนไฟล์เข้าแล้วได้ผลทันที ไม่ต้อง config
2. **Anomaly Detection** — ตรวจจับความผิดปกติและจุดรั่วไหล
3. **Cost Optimization** — แนะนำจุดลดค่าใช้จ่าย

### Target customers
- หน่วยงานรัฐ (เน้นความโปร่งใส/ตรวจสอบทุจริต)
- SME และบริษัทเกิดใหม่ (เน้นการจัดการ Cash Flow)

### Revenue model
- Freemium: Free (3 files/month) + Pro (฿299/month unlimited)
- 14-day free trial, no credit card required

---

## Known risks (from business analysis)

These are documented risks. This project is a portfolio piece, so commercial viability is not the primary goal, but awareness of these risks demonstrates analytical thinking.

1. **Technical**: Zero-config PDF parsing is extremely difficult with Thai government documents (varied formats, encodings TIS-620/UTF-8/Windows-874, merged cells, scanned PDFs). Realistic accuracy is 60-70% out-of-box. Mitigation: limit to text-based PDFs and 2-3 known templates.

2. **Market**: Government agencies don't buy subscriptions (they do project-based procurement). SMEs prefer free Excel. Mitigation: this is a portfolio project, not a real business.

3. **Technical debt**: Dual-market (gov + SME) requires incompatible UX. Mitigation: build one dashboard that works for both, don't customize per segment.

---

## User flow summaries

### Guest → Member
1. Visit landing page → click "เริ่มต้นฟรี"
2. Register (email/password or Google)
3. Verify email → auto-login
4. Redirect to /dashboard

### Member (Free) — typical session
1. Login → /dashboard (see previous reports or empty state)
2. Click upload → drag PDF/Excel → processing → dashboard appears
3. Explore charts, filter data, search items
4. Export CSV
5. Hit Pro feature → see upgrade prompt

### Member (Pro) — typical session
1. Login → /dashboard
2. Upload unlimited files
3. View full dashboard with drill-down
4. Check anomaly report
5. Compare 2 budget files side-by-side
6. Export PDF report

### Admin — typical session
1. Login → /admin
2. Check system stats (users, revenue, uploads)
3. Review flagged users
4. Manage subscriptions
5. Check error logs

---

## Wireframe reference

Wireframes were designed in the Claude.ai conversation. Key design decisions:

- **Color**: Purple (#7F77DD) as primary brand color
- **Sidebar**: Left sidebar navigation for dashboard pages (200px)
- **Stat cards**: 4 columns (total budget, spent, remaining, anomalies)
- **Charts**: Bar chart (by category) + Pie chart (proportions) side by side
- **Table**: With status badges (ปกติ = green, ผิดปกติ = red, ตรวจสอบ = amber)
- **Upload**: Drag-and-drop zone with purple dashed border, file quota bar
- **Pricing**: 2 cards (Free / Pro with purple highlight), FAQ accordion
- **Admin**: System stats + revenue bar chart + user management table
- **Auth**: Centered card with logo, Google OAuth button, password strength meter

---

## 4-week development plan

### Week 1: Foundation & Setup (Day 1-7)
- Day 1-2: GitHub repo, README, wireframes, project setup (Next.js + TS + Tailwind)
- Day 3-4: PDF/Excel parsing (Python microservice)
- Day 5-7: Backend API endpoints, SQLite + Prisma setup, testing

### Week 2: Core Frontend & Dashboard (Day 8-14)
- Day 8-9: Layout (header, sidebar), upload page with drag-and-drop
- Day 10-12: Dashboard charts (bar, pie, line), summary cards, data table
- Day 13-14: Filters, search, drill-down interaction

### Week 3: Advanced Features & Polish (Day 15-21)
- Day 15-16: Anomaly detection logic and UI
- Day 17-18: File comparison feature
- Day 19-20: Export (CSV, PDF), print view
- Day 21: Responsive design, dark mode, loading states, error handling

### Week 4: Testing, Deploy & Documentation (Day 22-30)
- Day 22-23: Testing, bug fixes, performance optimization
- Day 24-25: Deploy (Vercel + Railway), environment variables, production testing
- Day 26-27: README, API docs, code comments, architecture diagram
- Day 28-29: Screenshots, demo video, sample files, case study post
- Day 30: Buffer, final review, share on LinkedIn/GitHub

### Time estimate: ~120 hours (4 hrs/day × 30 days)
