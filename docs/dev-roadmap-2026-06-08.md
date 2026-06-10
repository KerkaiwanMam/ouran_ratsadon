# สถานะโปรเจกต์ ouran_ratsadon และแผนพัฒนาต่อ
_ตรวจสอบเมื่อ: 2026-06-08_

> ⚠️ **แก้ไขภายหลัง**: ข้อ 1 ด้านล่างเขียนผิด — แท้จริงแล้ว `business-logic-v2.md`, `database-schema.md`, `project-brief.md`, `api-spec.md` **มีอยู่แล้ว** ในโฟลเดอร์ `docs/` (ผลจาก search ตอนแรกพลาด/ไม่ทันอัปเดต) เนื้อหาเหล่านี้ได้ถูกตรวจสอบและ sync กับ scope ของ CLAUDE.md แล้ว (ดู `roadmap.md` สำหรับสถานะล่าสุดที่ถูกต้อง) ตารางแผนพัฒนาในข้อ 4 ยังใช้อ้างอิงลำดับงานได้ตามปกติ

## 1. สิ่งที่ตรวจพบ — ไฟล์อ้างอิงที่ขอให้เช็คยังไม่มีอยู่จริง (⚠️ ข้อมูลนี้คลาดเคลื่อน ดูกล่องด้านบน)

ผมตรวจโฟลเดอร์โปรเจกต์แล้วพบว่า **มีเฉพาะ `CLAUDE.md`** เป็นเอกสารแผนงาน ส่วนไฟล์ที่ขอให้ตรวจอีก 4 ไฟล์ — `business-logic-v2.md`, `database-schema.md`, `project-brief.md`, `api-spec.md` — **ยังไม่ถูกสร้างขึ้น** (โฟลเดอร์ `docs/` ว่างเปล่า) และโครงสร้างที่ CLAUDE.md อ้างถึงอย่าง `apps/web`, `apps/parser`, `prisma/schema.prisma`, `data/*.json` ก็ยังไม่ถูกสร้างเช่นกัน มีเพียง `package.json` ระดับ root ที่ตั้ง workspace ไว้ล่วงหน้า และ `node_modules` ที่ถูก install แล้ว

สรุปคือ **โปรเจกต์อยู่ในขั้น "วางแผน" (pre-Phase 0)** — ยังไม่มีโค้ดแอปพลิเคชันจริงเลยสักไฟล์ ดังนั้นทุกอย่างใน CLAUDE.md ถือว่า "ยังต้องทำทั้งหมด"

## 2. รายการสิ่งที่ต้องทำ (ตามแผนใน CLAUDE.md)

### A. เอกสารที่ยังขาด (ควรทำก่อนเริ่มโค้ด)
- `docs/project-brief.md` — สรุปเป้าหมายโปรเจกต์ กลุ่มผู้ใช้ คุณค่าที่ส่งมอบ (ยังไม่มีไฟล์)
- `docs/business-logic-v2.md` — รายละเอียด logic การคำนวณ/red-flag/leak-detection/forecast แบบเจาะลึก (ยังไม่มีไฟล์)
- `docs/database-schema.md` — เอกสารคู่กับ `prisma/schema.prisma` (ทั้งสองยังไม่มี)
- `docs/api-spec.md` — สเปก endpoint แบบละเอียด (มีแค่หัวข้อ endpoint คร่าวๆ ใน CLAUDE.md)
- `docs/wireframes/` — ยังว่างเปล่า ต้องทำ wireframe ของหน้าหลักก่อนเริ่มตัด UI

### B. โครงสร้างโปรเจกต์ที่ต้อง scaffold
- สร้าง `apps/web` (Next.js 14 + TypeScript + Tailwind + shadcn/ui) — ยังไม่มีแม้แต่โฟลเดอร์
- สร้าง `apps/parser` (FastAPI microservice) — ยังไม่มี
- สร้าง `prisma/schema.prisma` และเชื่อมกับ SQLite (dev)
- เตรียม `data/budget-XXXX.json` อย่างน้อย 1 ปีงบประมาณ (2568) สำหรับ demo

### C. Civic Layer (Phase 0 — เน้นก่อน เพราะเป็นหน้าตาของพอร์ต)
- ดาวน์โหลด/ประมวลผล PDF งบประมาณจาก bb.go.th → script Python parser (`pdfplumber`)
- หน้า `/explore` — Treemap + ตัวเลือกปี + drill-down กระทรวง→กรม→โครงการ
- หน้า `/search` — filter panel + ตาราง + active filter tags
- หน้า `/project/[id]` — รายละเอียดโครงการ + กราฟ 5 ปี
- ตรรกะ red flag กฎ 1 และ 2 (เพิ่มผิดปกติ >50%, ค่าผิดปกติทางสถิติ >3SD)
- ฟังก์ชัน export CSV
- ปุ่ม share URL + OG image พื้นฐาน

### D. Business Layer (Phase 0)
- ระบบ auth (email/password + Google OAuth) — หน้า login/register/forgot-password
- หน้า `/upload` รองรับเฉพาะ Excel template ก่อน
- ตัวจัดหมวดหมู่อัตโนมัติด้วย keyword matching
- หน้า `/dashboard` — cash flow + category breakdown
- Leak detection แบบพื้นฐาน (Monthly Spike + Outlier เท่านั้น)
- Export CSV

### E. Backend / Infra พื้นฐาน
- ตั้งค่า Prisma + SQLite (dev) ตาม schema ที่ออกแบบไว้
- Endpoint Civic Layer (`/api/civic/*`) ให้ตรงกับสเปกใน CLAUDE.md
- Endpoint auth (`/api/auth/*`)
- FastAPI parser endpoints (`/parse/excel`, `/analyze/leaks` เป็นต้น)

### F. งานสนับสนุนที่มักถูกลืม
- README พร้อม hero screenshot, live demo link, architecture diagram, lessons learned (ตามที่ CLAUDE.md กำหนดไว้ว่า "ต้องมี")
- ตัวอย่างไฟล์ SME สำหรับทดสอบ (ร้านอาหาร / e-commerce / ที่ปรึกษา) ใน `sample-data/`
- Template Excel สำหรับดาวน์โหลด (คอลัมน์: วันที่, รายการ, หมวดหมู่, จำนวนเงิน, ประเภท)
- ตั้งค่า dark mode (Tailwind `dark:`) ตั้งแต่เริ่มต้น เพราะ CLAUDE.md ระบุว่า "บังคับ"

## 3. สิ่งที่ "ยังไม่ชัดเจน" และต้องตัดสินใจเพิ่มก่อนลงมือ
- ยังไม่มีเอกสาร business-logic-v2 / database-schema / api-spec ที่เป็น source of truth จริง — ต้องเขียนขึ้นใหม่หรือดึงรายละเอียดจาก CLAUDE.md มาขยายให้ครบก่อนเริ่ม dev (โดยเฉพาะ schema ตาราง User/File/Transaction/Subscription ที่ Prisma ต้องใช้ ยังไม่ถูกนิยามเป็นเอกสารแยก)
- ยังไม่ได้ตัดสินใจเรื่อง deploy target จริง (Vercel + Railway/Render) — ต้องเตรียม account/ENV ก่อนถึง Phase 1
- ยังไม่มี wireframe ที่ใช้ตัด UI จริง — มีแค่คำอธิบาย UI spec เป็นข้อความ

## 4. ตารางแผนพัฒนาต่อ (ลำดับตาม Phase ใน CLAUDE.md)

| ลำดับ | Phase | งาน | สถานะปัจจุบัน | ผลลัพธ์ที่ต้องได้ |
|---|---|---|---|---|
| 1 | Pre-0 (เอกสาร) | เขียน `project-brief.md`, `business-logic-v2.md`, `database-schema.md`, `api-spec.md`, ทำ wireframe หน้าใหม่ | ยังไม่เริ่ม (ไฟล์ไม่มี) | เอกสารอ้างอิงครบ พร้อมเริ่มเขียนโค้ด |
| 2 | Pre-0 (scaffold) | สร้าง `apps/web` (Next.js+TS+Tailwind+shadcn), `apps/parser` (FastAPI), `prisma/schema.prisma`, โครง `data/` | ยังไม่เริ่ม (มีแค่ root package.json) | รัน `npm run dev` ขึ้นหน้าว่างได้ |
| 3 | Phase 0 — Civic | เตรียมข้อมูลงบ 2568 เป็น JSON + เขียน red flag กฎ 1-2 | ยังไม่เริ่ม | มีไฟล์ `data/budget-2568.json` ใช้งานได้ |
| 4 | Phase 0 — Civic | สร้างหน้า `/explore` (Treemap + ตัวกรองปี + drill-down) | ยังไม่เริ่ม | demo treemap ใช้งานได้จริง |
| 5 | Phase 0 — Civic | สร้างหน้า `/search` และ `/project/[id]` | ยังไม่เริ่ม | ค้นหา-กรอง-ดูรายละเอียดโครงการได้ |
| 6 | Phase 0 — Civic | export CSV + share/OG image | ยังไม่เริ่ม | ผู้ใช้ดาวน์โหลด/แชร์ได้ |
| 7 | Phase 0 — Auth | ระบบ register/login (email + Google OAuth) | ยังไม่เริ่ม | ผู้ใช้สมัคร/ล็อกอินได้ |
| 8 | Phase 0 — Business | หน้า `/upload` (Excel template) + auto-categorize | ยังไม่เริ่ม | อัปโหลดไฟล์แล้วระบบจัดหมวดได้ |
| 9 | Phase 0 — Business | หน้า `/dashboard` (cash flow + category breakdown) + leak detection พื้นฐาน | ยังไม่เริ่ม | เห็นภาพรวมการเงิน + จุดผิดปกติ |
| 10 | Phase 0 — ปิดงาน | README (screenshot, demo link, architecture diagram), sample-data, Excel template | ยังไม่เริ่ม | พอร์ตพร้อมโชว์ |
| 11 | Phase 1 | Sunburst/Map view, red-flag กฎ 3-4, embed widget, forecast, what-if, alerts (email), PDF export, payment (Stripe/Omise), trial 14 วัน | ยังไม่เริ่ม | ฟีเจอร์ครบตาม beta scope |
| 12 | Phase 2 | LINE notify, team workspace, bank/accounting parser (SCB/KBANK/BBL, PEAK/FlowAccount), API access, admin civic-data UI, admin panel เต็มรูปแบบ | ยังไม่เริ่ม | feature set เต็มตามแผน growth |

## 5. ข้อเสนอแนะลำดับการเริ่มงาน
เริ่มจากแถวที่ 1-2 ก่อนเสมอ (เอกสาร + scaffold) เพราะ CLAUDE.md เองอ้างถึงไฟล์และโครงสร้างที่ยังไม่มีอยู่จริง — ถ้าข้ามขั้นตอนนี้จะทำให้ทีม (หรือ AI agent ที่ช่วยเขียนโค้ดต่อ) ขาด source of truth ระหว่างพัฒนา จากนั้นโฟกัส Civic Layer (แถว 3-6) ให้เสร็จก่อน เพราะ CLAUDE.md ระบุชัดว่า "Civic Layer คือหน้าตาที่ทำให้ portfolio น่าประทับใจ"
