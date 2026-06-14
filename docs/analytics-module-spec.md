# Data Analytics Module — Blueprint (4-tier analytics)

> ส่วนขยายจาก CLAUDE.md / roadmap.md — ออกแบบ analytics สำหรับ Business Layer (SME) ในกรอบ 4 ระดับ: Descriptive → Diagnostic → Predictive → Prescriptive
>
> **กติกาที่ต้องยึดเสมอ**: Forecasting (Tier 3) ต้องเป็น **Weighted Moving Average + Seasonal Index** และเปิดเผยวิธีคิดให้ผู้ใช้เห็นเสมอ ("การประมาณการด้วยค่าเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ AI") — ตรงตาม `CLAUDE.md` ห้ามเปลี่ยนเป็น black-box ML

## ขอบเขต

โมดูลนี้ครอบคลุม **Business Layer เท่านั้น**. Civic Layer มี analytics ระดับ Descriptive/Diagnostic อยู่แล้วผ่าน in-memory cache (cache-only read path ตาม `analyzer-spec.md`) และ category breakdown ใน `/search` (ดู `feature-specs.md`) — ไม่ต้องสร้าง pipeline ใหม่ซ้อนทับ

## 1. System & Architecture

### Data flow

```
Raw data
 └─ Business: user-uploaded Excel/bank/accounting → Python parser (FastAPI) → Transaction table
                                                                                     │
                                          ┌──────────────────────────────────────────┘
                                          ▼
                         Aggregation job (post-upload + nightly cron)
                                          │
        ┌────────────────┬───────────────┼───────────────┬─────────────────┐
        ▼                ▼               ▼               ▼                 ▼
MonthlyFinancial   DiagnosticInsight  ForecastSnapshot  Recommendation   (existing)
   Summary           (Tier 2)            (Tier 3)         (Tier 4)      Transaction.leakFlag
   (Tier 1)                                                              (Tier 1-2 input)
        │                │               │                │
        └────────────────┴───────┬───────┴────────────────┘
                                  ▼
                  API layer (Next.js API Routes, /api/business/analytics/*)
                                  ▼
                      Dashboard UI (Recharts/D3, design-system.md)
```

### ทำไมไม่แยก Data Warehouse

- Civic Layer ใช้ cache-only read path (in-memory cache จาก `data/budget-XXXX.json`) ตามที่ตัดสินใจไว้แล้วใน `analyzer-spec.md` — เพียงพอสำหรับ analytics ระดับ 1-2 ของ Civic
- ขนาดข้อมูล Business Layer คือ "ไฟล์ที่ user อัปโหลดเอง" (หลักพัน-หมื่นแถว/คน) ไม่ใช่สเกลที่ต้องมี warehouse แยก — Postgres + index ที่มีอยู่ (`@@index([userId, date])`) เพียงพอ
- แทนที่จะแยก DB ให้ **pre-aggregate เป็นตารางสรุป** (ด้านล่าง) คำนวณตอน upload เสร็จ/cron แทนการ aggregate สดทุกครั้งที่โหลด dashboard — ลด query load บน core tables โดยไม่เพิ่ม ops overhead ของระบบแยก
- Revisit ตอน Phase 2 ถ้ามี real usage data บ่งชี้ว่าจำเป็น (read-replica สำหรับ analytics query หนัก) — ใส่ไว้เป็น "deferred" สอดคล้องกับแนวทางที่ใช้ตัดสินใจ leak rules อื่นๆ ในโปรเจกต์

## 2. Database Schema (เพิ่มจาก schema ปัจจุบัน — ทุกตารางเป็น derived data, ลบแล้ว recompute จาก `Transaction` ได้เสมอ)

```prisma
// Tier 1 — สรุปรายเดือน/หมวด คำนวณ batch แทนการ aggregate สดทุกครั้ง
model MonthlyFinancialSummary {
  id           String   @id @default(cuid())
  userId       String
  month        String   // "2026-06"
  category     String
  totalIncome  Float
  totalExpense Float
  txCount      Int
  computedAt   DateTime @default(now())

  @@unique([userId, month, category])
  @@index([userId, month])
}

// Tier 2 — เหตุการณ์ผิดปกติระดับเดือน/หมวด พร้อมคำอธิบายต้นเหตุ (ไม่ใช่แค่ flag รายแถวแบบ leak detection ปัจจุบัน)
model DiagnosticInsight {
  id           String   @id @default(cuid())
  userId       String
  month        String
  category     String
  insightType  String   // "category_spike" | "new_vendor_surge" | "seasonal_drop"
  summary      String   // ข้อความภาษาไทยอธิบายสาเหตุ
  relatedTxIds String   // JSON array ของ Transaction.id ที่เป็นต้นเหตุ
  createdAt    DateTime @default(now())

  @@index([userId, month])
}

// Tier 3 — ผล forecast พร้อม "วิธีคิด" เพื่อ disclose ตรงๆ ตามกติกาของโปรเจกต์
model ForecastSnapshot {
  id               String   @id @default(cuid())
  userId           String
  forecastMonth    String
  method           String   @default("WMA_SEASONAL") // ต้องตรงกับสิ่งที่ disclose ใน UI เสมอ
  predictedNet     Float
  confidenceLow    Float
  confidenceHigh   Float
  cashRunwayMonths Float?
  inputWindow      String   // JSON: เดือนย้อนหลัง + น้ำหนักที่ใช้คำนวณ (เพื่อความโปร่งใส)
  generatedAt      DateTime @default(now())

  @@index([userId, forecastMonth])
}

// Tier 4 — ข้อเสนอแนะจาก rule engine โดยอิงผลจาก Tier 2+3
model Recommendation {
  id        String   @id @default(cuid())
  userId    String
  basedOn   String   // "forecast" | "leak" | "diagnostic"
  basedOnId String   // FK ไปยัง record ต้นทาง
  action    String   // เช่น "ลดงบหมวดการตลาด 15% ใน 2 เดือนข้างหน้า เพื่อรักษา cash runway > 3 เดือน"
  priority  String   // "high" | "medium" | "low"
  status    String   @default("PENDING") // PENDING | DISMISSED | APPLIED
  createdAt DateTime @default(now())

  @@index([userId, status])
}
```

## 3. API Design

ทุก endpoint อยู่ใต้ `(business)` namespace ตาม `api-spec.md`, ใช้ `getCurrentUser()` guard + rate limiting ตาม `security.md`

```
# Tier 1 — Descriptive
GET /api/business/analytics/summary?range=6m
→ { months: [{ month, totalIncome, totalExpense, net, byCategory: [...] }] }

# Tier 2 — Diagnostic (drill-down จากความผิดปกติที่เจอใน Tier 1)
GET /api/business/analytics/diagnose?month=2026-06&category=การตลาด
→ {
    summary: "ค่าใช้จ่ายหมวดการตลาดเดือนนี้สูงกว่าค่าเฉลี่ย 6 เดือน 42%",
    rootCauses: [
      { type: "single_transaction", txId: "...", description: "...", amount: -65000 },
      { type: "new_vendor", vendorPattern: "...", txCount: 4 }
    ],
    relatedFlags: [{ leakFlag: "OUTLIER", txId: "..." }]
  }

# Tier 3 — Predictive (ต้อง disclose method เสมอ — ดู ForecastSnapshot.method)
POST /api/business/analytics/forecast
Body: { months: 3, whatIf?: { revenueChangePct: -10 } }
→ {
    method: "WMA_SEASONAL",
    disclosure: "พยากรณ์ด้วยค่าเฉลี่ยเคลื่อนที่ถ่วงน้ำหนักและดัชนีฤดูกาล ไม่ใช่ AI",
    projection: [{ month, predictedNet, confidenceLow, confidenceHigh }],
    cashRunwayMonths: 4.2
  }

# Tier 4 — Prescriptive
GET /api/business/analytics/recommendations?status=PENDING
→ { recommendations: [{ id, action, basedOn, priority, status }] }

POST /api/business/analytics/recommendations/:id/apply   (หรือ /dismiss)
→ { recommendation: { id, status: "APPLIED" } }
```

## 4. Implementation Phases & Tooling

อ้างอิงโครง phase เดิมใน `roadmap.md` — โมดูลนี้ขยายงานที่อยู่ใน Phase 1/2 อยู่แล้ว ไม่ใช่ phase ใหม่แยกต่างหาก

### Phase A — ผูกกับ Phase 1 (Tier 1 + 2)
- เพิ่ม batch job คำนวณ `MonthlyFinancialSummary` หลัง upload เสร็จ + nightly cron (ใช้ logic เดียวกับ dashboard ปัจจุบัน แต่ pre-compute แทนการ query สด)
- `DiagnosticInsight`: ขยายจาก leak detection ที่มีอยู่ — group by เดือน+หมวด แล้วอธิบายเป็นประโยคภาษาไทย ใช้ z-score แบบเดียวกับ Outlier rule ที่มีอยู่แล้ว ไม่ต้องเพิ่ม ML
- Tooling: ใช้ของเดิมพอ — Prisma + Recharts ไม่ต้องเพิ่ม dependency

### Phase B — ผูกกับ "Cash flow forecasting (Pro)" ใน Phase 1 (Tier 3)
- คงใช้ **WMA + Seasonal Index ตาม `analyzer-spec.md`** ห้ามเปลี่ยนเป็น ML model ตาม `CLAUDE.md`
- คำนวณใน Python FastAPI microservice (มีโครงอยู่แล้ว) ด้วย `pandas`/`numpy` พื้นฐาน — ไม่ต้องใช้ `scikit-learn`
- บันทึกผลเป็น `ForecastSnapshot` พร้อม `inputWindow` (น้ำหนัก/เดือนที่ใช้) เพื่อให้ UI แสดง "วิธีคิด" ได้ตรงไปตรงมา ตอบโจทย์ disclosure requirement

### Phase C — ผูกกับ Phase 2 (Tier 4)
- Rule engine แบบ if-then ธรรมดา (ไม่ใช่ optimization solver) เช่น "ถ้า cash runway < 3 เดือน AND หมวดที่โตเร็วสุดคือ X → แนะนำลดงบ X" — เขียนเป็น TypeScript rule list ใน `lib/` ไม่ต้องมี dependency พิเศษ
- เก็บผลลง `Recommendation` ให้ user กด apply/dismiss — ฟีดแบ็กนี้ใช้ปรับ priority ของ rule ในอนาคตได้แบบ lightweight feedback loop โดยไม่ต้องมี ML
