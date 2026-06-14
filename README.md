# อุรัณ รัษฎร — Budget Intelligence Platform

> แพลตฟอร์มสองชั้นสำหรับสำรวจงบประมาณภาครัฐไทยแบบสาธารณะ และวิเคราะห์ค่าใช้จ่ายสำหรับ SME — โปรเจกต์พอร์ตโฟลิโอที่สาธิตการพัฒนา full-stack ตั้งแต่ data pipeline ไปจนถึง UI

![Civic Layer Treemap — ภาพหน้าจอหลักของ /explore](./docs/screenshots/civic-treemap-hero.png)
*ภาพหน้าจอหน้า `/explore` แสดง Treemap งบประมาณปี 2568 แบบ drill-down กระทรวง → กรม → โครงการ*
> 📸 เพิ่มภาพ hero screenshot จริงไว้ที่ `docs/screenshots/civic-treemap-hero.png` ก่อนเผยแพร่

**Live demo**: _ใส่ลิงก์ deploy จริงที่นี่ เช่น `https://ouran-ratsadon.vercel.app`_ (ยังไม่ได้ deploy — ดู [Roadmap](./docs/roadmap.md))

---

## แนวคิด Two-Layer

โปรเจกต์นี้แบ่งเป็น **2 ชั้น** ที่ใช้ infrastructure ร่วมกัน แต่มี user journey และโมเดลรายได้ต่างกันโดยสิ้นเชิง:

### 🏛️ Civic Layer (สาธารณะ — ฟรี ไม่ต้อง login)
สำรวจงบประมาณแผ่นดินไทยในรูปแบบที่เข้าใจง่าย แรงบันดาลใจจาก [WeVis](https://wevis.info) และ [USASpending.gov](https://www.usaspending.gov):
- **Treemap/Sunburst/Map** แสดงสัดส่วนงบประมาณแบบ interactive พร้อม drill-down กระทรวง → กรม → โครงการ
- **ค้นหาขั้นสูง** พร้อมตัวกรองและตารางเปรียบเทียบ
- **หน้ารายละเอียดโครงการ** พร้อมประวัติย้อนหลัง 5 ปี
- **Red Flags อัตโนมัติ** ตรวจจับความผิดปกติในงบประมาณ (เช่น เพิ่มขึ้นผิดปกติ, ซ้ำซ้อน)
- **แชร์/Embed** กราฟไปยังเว็บข่าวหรือโซเชียลได้ พร้อมดาวน์โหลดข้อมูลเปิด (Open Data)

จุดประสงค์: สร้างแบรนด์ ดึง traffic จาก SEO และเป็น funnel ส่งต่อผู้ใช้สู่ Business Layer

### 💼 Business Layer (ต้อง login — Freemium + Subscription)
เครื่องมือวิเคราะห์ค่าใช้จ่ายและกระแสเงินสดสำหรับ SME:
- อัปโหลดข้อมูลทางการเงินของตัวเอง (Excel template / bank statement / accounting export)
- **แดชบอร์ดกระแสเงินสด** พร้อมการจัดหมวดหมู่อัตโนมัติ
- **Leak Detection** ตรวจจับจุดรั่วไหลของเงิน (Outlier rule ใน Phase 0, ครบ 4 กฎใน Phase ถัดไป)
- **Cash Flow Forecasting** ด้วย Weighted Moving Average + Seasonal — *ขอย้ำว่านี่ไม่ใช่ AI/ML* เป็นการคำนวณสถิติแบบโปร่งใสที่อธิบายได้

จุดประสงค์: สร้างรายได้จากการสมัครสมาชิก (Freemium → Pro ฿299/เดือน → Team ฿799/เดือน)

ทั้งสองชั้นใช้ฐานข้อมูล, ระบบ auth, และ component infrastructure ร่วมกัน — ทำให้พอร์ตโฟลิโอนี้แสดงทั้งการออกแบบสถาปัตยกรรมที่ใช้ซ้ำได้ และการแยก concern ระหว่างผลิตภัณฑ์สองแบบที่ต่างกันโดยสิ้นเชิง

---

## Tech Stack

| ชั้น | เทคโนโลยี |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui |
| Charts/Visualization | Recharts (bar/pie/line) · D3.js (treemap, sunburst) · Leaflet (map view) |
| Backend | Next.js API Routes (Node.js) · Python microservice (FastAPI) สำหรับ parse PDF/Excel |
| Data parsing | pdfplumber (PDF) · openpyxl + pandas (Excel) |
| Database | SQLite (dev) / PostgreSQL (prod) ผ่าน Prisma ORM |
| Caching | In-memory tree cache สำหรับ Civic Layer (rebuild จาก Postgres ตอน server start) |
| Deploy | Vercel (frontend) + Railway/Render (Python service) |

---

## Architecture

```
                         ┌─────────────────────────────┐
                         │        Next.js 14 App        │
                         │   (apps/web — App Router)    │
                         │                              │
   Guest ───────────────▶│  (civic)/   ── Civic Layer   │
   (no login)            │  (public)/  ── Landing/About │
                         │                              │
   Member/Admin ────────▶│  (auth)/    ── Login/Register│
   (login required)      │  (business)/── SME Dashboard │
                         │  (admin)/   ── Admin Panel   │
                         └───────┬──────────┬───────────┘
                                 │          │
                  ┌──────────────▼───┐  ┌───▼─────────────────┐
                  │  In-memory tree   │  │   Prisma ORM        │
                  │  cache (Civic)    │◀─┤   SQLite (dev) /    │
                  │  rebuilt at boot  │  │   PostgreSQL (prod) │
                  └──────────▲────────┘  └─────────┬───────────┘
                             │                      │
                  ┌──────────┴──────────┐  ┌────────▼────────────┐
                  │ data/budget-XXXX.json│  │ apps/parser (FastAPI)│
                  │ (source of truth,    │  │ pdfplumber/openpyxl  │
                  │  bulk-loaded once)   │  │ leak/forecast logic  │
                  └─────────────────────┘  └─────────────────────┘
```

**กลยุทธ์ dual storage ของ Civic Layer**: `data/budget-XXXX.json` คือ source of truth → bulk-load เข้า Postgres (สำหรับ query ที่กรอง/เรียงลำดับ/แบ่งหน้า เช่น `/api/civic/search`) **และ** ใช้สร้าง in-memory tree cache (สำหรับ bounded reads เช่น `/explore` drill-down) พร้อมกัน — รายละเอียดเต็มอยู่ใน [`docs/analyzer-spec.md`](./docs/analyzer-spec.md)

---

## โครงสร้างโปรเจกต์

```
ouran_ratsadon/
├── apps/
│   ├── web/      # Next.js frontend (Civic + Business + Admin)
│   └── parser/   # Python FastAPI microservice (PDF/Excel parsing, analyzers)
├── prisma/       # Database schema + migrations
├── data/         # ข้อมูลงบประมาณที่ประมวลผลล่วงหน้า (budget-XXXX.json)
├── sample-data/  # ไฟล์ SME ตัวอย่างสำหรับทดสอบ Business Layer
└── docs/         # สเปกละเอียดทุกส่วน (ดู docs index ใน CLAUDE.md)
```

ดูรายละเอียดเชิงลึกของแต่ละส่วนได้ใน [`CLAUDE.md`](./CLAUDE.md) และเอกสารใน [`docs/`](./docs)

---

## เริ่มต้นใช้งาน (Local Development)

```bash
# ติดตั้ง dependencies
cd apps/web && npm install

# ตั้งค่า database (SQLite)
npx prisma migrate dev

# รัน dev server
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) — Civic Layer ใช้งานได้ทันทีโดยไม่ต้อง login ส่วน Business Layer ต้องสมัครสมาชิกก่อน (ดูตัวอย่างไฟล์สำหรับทดสอบใน [`sample-data/`](./sample-data))

### ⚠️ บริการเสริมที่มีค่าใช้จ่าย (Optional paid services)

โปรเจกต์รันได้ฟรีทั้งหมดโดยปล่อยตัวแปรด้านล่างเป็นค่าว่าง (ฟีเจอร์ที่เกี่ยวข้องจะ degrade อย่างสุภาพ ไม่ crash) แต่ถ้าตั้งค่าเพื่อเปิดใช้ฟีเจอร์เต็มรูปแบบ จะมีค่าใช้จ่ายตามนี้:

| Env var | บริการ | ค่าใช้จ่าย |
|---|---|---|
| `STRIPE_SECRET_KEY` | ชำระเงินสมาชิก Pro/Team | ฟรีถ้าใช้ `sk_test_...` (test mode) — โหมด live คิดค่าธรรมเนียมตาม transaction จริง |
| `RESEND_API_KEY` | ส่งอีเมลแจ้งเตือน | ฟรี 3,000 อีเมล/เดือน เกินกว่านี้มีค่าใช้จ่าย |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Rate limiting แบบ distributed | ฟรี free tier — เกิน quota มีค่าใช้จ่าย |
| `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / ... | Direct-to-storage file upload (Cloudflare R2) | ฟรี free tier (10GB storage + egress ฟรี) — เกิน quota มีค่าใช้จ่าย |
| `DATABASE_URL` / `DIRECT_URL` (Neon) | ฐานข้อมูล Postgres | ฟรี free tier (0.5GB storage, auto-suspend) — เกิน quota มีค่าใช้จ่าย |

> **ผู้ช่วย AI (`/assistant`)** ปัจจุบันตอบด้วย rule-based engine ภายใน (`lib/assistant/rules.ts`) — ไม่เรียก LLM ภายนอก ไม่มีค่าใช้จ่าย ไม่ต้องตั้งค่า API key ใดๆ การเชื่อมต่อ LLM ฟรี tier (เช่น Google Gemini) สำหรับคำถามแบบอิสระเป็นแผนในเฟสถัดไป

---

## บทเรียนที่ได้ (Lessons Learned)

- **การออกแบบ dual-storage ไม่ใช่ over-engineering เสมอไป** — การแยก in-memory cache (สำหรับอ่านแบบ bounded/aggregate) ออกจาก Postgres queries (สำหรับ filter/sort/paginate) ทำให้ทั้งสองทางได้ประสิทธิภาพที่เหมาะสมกับ pattern การใช้งานจริงของแต่ละหน้า แทนที่จะ optimize ทางใดทางหนึ่งแล้วยอมเสียอีกทาง
- **Server/Client Component boundary ใน Next.js App Router ต้องวางแผนตั้งแต่ต้น** — ปัญหาอย่าง "Event handlers cannot be passed to Client Component props" และ hydration mismatch (เช่นการเรียก `window` ตอน render) แก้ได้ง่ายด้วยการแยก interactive ส่วนเล็กๆ ออกเป็น Client Component ของตัวเอง แทนที่จะทำทั้งหน้าเป็น client
- **กำหนดขอบเขต Phase ให้ชัดตั้งแต่แรกช่วยไม่ให้หลงทาง** — การยึด priority matrix (Civic 0a ก่อน Business 0b) ทำให้ส่งมอบ "ส่วนที่ recruiter จะเห็น" ได้ก่อน แทนที่จะกระจายความพยายามไปทั่วทุกฟีเจอร์พร้อมกัน
- **ความโปร่งใสของ logic สำคัญกว่าความล้ำของเทคโนโลยี** — การเลือกใช้ Weighted Moving Average แทน AI/ML สำหรับ forecasting และเปิดเผยให้ผู้ใช้ทราบตรงๆ สอดคล้องกับ value proposition ของทั้งแพลตฟอร์ม (โปร่งใส ตรวจสอบได้) มากกว่าการใช้ "กล่องดำ" ที่ดูล้ำกว่า

---

## ข้อมูลและแหล่งที่มา

ข้อมูลงบประมาณภาครัฐในโปรเจกต์นี้มาจากแหล่งข้อมูลสาธารณะ (`bb.go.th`, `data.go.th`, ตัวอย่างจาก [WeVis](https://wevis.info/thbudget68)) — ทุกหน้าใน Civic Layer แสดงแหล่งที่มาของข้อมูลกำกับไว้ ตามหลัก open data

โปรเจกต์นี้เป็น **portfolio project** ไม่ใช่ production SaaS — เน้นโค้ดสะอาด UX ที่ดี และความสมบูรณ์ของ Civic Layer demo เป็นหลัก
