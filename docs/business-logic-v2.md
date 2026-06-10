# ouran_ratsadon — Business Logic v2.0 (ปรับใหม่)

## ฉบับแก้ไข: จาก "ทำทุกอย่าง" → "แก้ปัญหาจริงที่เฉพาะเจาะจง"

---

## 1. การวิเคราะห์ปัญหาจริงจากข้อมูลตลาด

### 1.1 สถานการณ์ปัจจุบัน

**ด้านภาครัฐ:**
- ดัชนีภาพลักษณ์การทุจริต (CPI) ของไทยปี 2025 อยู่ที่ 33 คะแนน ต่ำสุดในรอบ 14 ปี อันดับที่ 116 จาก 182 ประเทศ
- งบก่อสร้างภาครัฐเป็นจุดรั่วไหลสำคัญ ระเบียบจัดซื้อจัดจ้างที่ซับซ้อนกลายเป็นกับดัก
- Open Government Data Portal (data.go.th) มีกว่า 11,000 datasets แต่คุณภาพข้อมูลยังเป็นปัญหา
- WeVis/PunchUp เป็นตัวอย่าง civic tech ไทยที่ทำ budget visualization สำเร็จในฐานะ non-profit

**ด้านSME:**
- Cash Flow Management เป็นปัญหาอันดับ 1 ที่ทำให้ SME ปิดกิจการ
- SME หลายแห่งยอดขายดี กำไรทางบัญชีสูง แต่ขาดสภาพคล่อง หมุนเงินไม่ทัน
- ผู้เชี่ยวชาญแนะนำว่า SME ควรทำ Cash Flow Forecasting แต่ส่วนใหญ่ทำไม่เป็น
- เครื่องมือที่มีอยู่ (Excel, โปรแกรมบัญชี) ไม่ได้ออกแบบมาเพื่อ "วิเคราะห์" แต่ทำเพื่อ "บันทึก"

### 1.2 ช่องว่างที่แท้จริง (Real Gap)

| สิ่งที่มีอยู่แล้ว | สิ่งที่ยังขาด |
|---|---|
| data.go.th = ข้อมูลดิบ | เครื่องมือ **เปรียบเทียบ** งบระหว่างหน่วยงาน |
| WeVis = visualization สวยแต่ static | dashboard ที่ **ใครก็อัปโหลดไฟล์เองได้** |
| Excel = บันทึกตัวเลข | เครื่องมือที่ **บอกว่าตัวเลขไหนผิดปกติ** |
| โปรแกรมบัญชี = ดูอดีต | เครื่องมือที่ **พยากรณ์อนาคต** |
| ข้อมูลกระจัดกระจาย | แพลตฟอร์ม **รวมศูนย์** ที่เปรียบเทียบข้ามหน่วยงานได้ |

---

## 2. Business Logic ที่ปรับใหม่

### 2.1 Pivot สำคัญ: จากสองตลาดเป็นหนึ่งแพลตฟอร์ม

**ก่อน (v1 — มีปัญหา):**
```
ตลาดรัฐ (ขาย subscription ให้รัฐ)  ←→  ตลาด SME (ขาย subscription ให้ SME)
         ↑ เข้ากันไม่ได้ ↑
```

**หลัง (v2 — ปรับใหม่):**
```
ชั้นที่ 1: Civic Layer (ฟรี, สร้างฐานผู้ใช้ + ชื่อเสียง)
    "ประชาชนตรวจสอบงบประมาณรัฐ"
    ↓ สร้าง trust + brand awareness + SEO traffic
    
ชั้นที่ 2: Business Layer (เสียเงิน, สร้างรายได้)
    "SME วิเคราะห์ค่าใช้จ่ายธุรกิจตัวเอง"
    ↓ subscription revenue
    
ชั้นที่ 3: API Layer (อนาคต, scale ได้)
    "นักพัฒนา/บริษัทอื่น ใช้ parsing engine ของเรา"
    ↓ API revenue
```

### 2.2 ทำไมโครงสร้างนี้ถึงแก้ปัญหาเดิม

| ปัญหาเดิม | วิธีแก้ใน v2 |
|---|---|
| รัฐไม่จ่าย subscription | ไม่ต้องขายให้รัฐ → ให้ประชาชนใช้ฟรีตรวจสอบงบรัฐ |
| SME ไม่เห็นคุณค่า | แยก value proposition ชัด → ไม่ใช่ "ดู dashboard" แต่คือ "หาจุดรั่วไหลในธุรกิจคุณ" |
| สองตลาดแย่งโฟกัส | Civic Layer ใช้เป็น marketing (ฟรี) → ดึงคนเข้า → convert เป็น Business Layer |
| Zero-config ทำไม่ได้ | จำกัด scope: รัฐ = ใช้ template สำเร็จรูป / SME = Excel ง่ายๆ ก่อน |

---

## 3. Logic แต่ละชั้นโดยละเอียด

### 3.1 Civic Layer — "งบ-อุ้ม-ราษฎร Explorer"

**เป้าหมาย:** สร้าง brand, ฐานผู้ใช้, SEO traffic, social proof
**รายได้โดยตรง:** ไม่มี (เป็น marketing cost)
**รายได้ทางอ้อม:** ดึง SME owners เข้ามาเห็นแพลตฟอร์ม → convert เป็น Pro

#### ฟีเจอร์ Civic Layer

```
[A] Budget Explorer (ไม่ต้อง login)
│
├── ฐานข้อมูลงบประมาณที่ทีมงาน pre-process มาแล้ว
│   ├── งบรายจ่ายประจำปี (จาก พ.ร.บ. งบประมาณ)
│   ├── งบลงทุน/ก่อสร้าง ที่น่าสนใจ
│   └── เปรียบเทียบข้ามปี / ข้ามกระทรวง
│
├── Dashboard สาธารณะ
│   ├── กราฟภาพรวมงบประมาณแผ่นดิน
│   ├── Top 10 หมวดหมู่ที่ใช้งบมากที่สุด
│   ├── แนวโน้มงบรายปี (5 ปีย้อนหลัง)
│   └── เปรียบเทียบ: งบจัดสรร vs งบใช้จริง
│
├── Red Flag Highlights
│   ├── รายการที่เพิ่มขึ้นผิดปกติ (> 50% จากปีก่อน)
│   ├── รายการที่มีมูลค่าสูงผิดปกติ
│   └── รายการซ้ำซ้อนระหว่างหน่วยงาน
│
└── Community Features
    ├── แชร์กราฟบน Social Media (OG Image auto-gen)
    ├── ฝังในเว็บอื่นได้ (embed widget)
    └── Download ข้อมูลเป็น CSV/JSON (open data)
```

#### Business Logic ของ Civic Layer

```
ข้อมูลเข้า:
  - ทีมงานดาวน์โหลด พ.ร.บ. งบประมาณจาก bb.go.th (ปีละครั้ง)
  - Parse ด้วย Python scripts (semi-automated, ทีมตรวจสอบก่อนเผยแพร่)
  - เก็บใน database เป็น structured data

Logic การแสดงผล:
  - Fiscal Year Filter: เลือกปีงบประมาณ (เช่น 2567, 2568, 2569)
  - Category Drill-down: กระทรวง → กรม → แผนงาน → โครงการ
  - Comparison Mode: เลือก 2 ปี หรือ 2 หน่วยงาน วางเทียบกัน
  
Logic ตรวจจับ Red Flags:
  - Rule 1: รายการที่เพิ่มขึ้น > 50% จากปีก่อน → Flag "เพิ่มขึ้นผิดปกติ"
  - Rule 2: รายการที่ > 3 SD จากค่าเฉลี่ยหมวดเดียวกัน → Flag "มูลค่าสูง"
  - Rule 3: ชื่อโครงการซ้ำข้ามกรม (fuzzy match > 80%) → Flag "อาจซ้ำซ้อน"
  - Rule 4: สัดส่วนงบดำเนินงาน/งบลงทุน เบี่ยงเบนจากค่าเฉลี่ย → Flag "สัดส่วนผิดปกติ"

ไม่ทำ:
  × ไม่ parse PDF ที่ user อัปโหลด (ใน Civic Layer)
  × ไม่มี login/subscription
  × ไม่ทำ real-time (อัปเดตปีละ 1-2 ครั้ง)
```

#### ทำไม Civic Layer ถึง Work

1. **ไม่ต้อง Zero-config** — ทีมงาน pre-process ข้อมูลเอง ควบคุมคุณภาพได้
2. **ไม่ต้องขายให้รัฐ** — ประชาชนใช้ฟรี รัฐไม่ต้องอนุมัติอะไร
3. **สร้าง Brand Awareness** — คนแชร์กราฟบน social media = marketing ฟรี
4. **สร้าง SEO** — "งบประมาณ 2569", "งบก่อสร้าง กระทรวงคมนาคม" = search traffic
5. **Funnel ไปยัง Business Layer** — SME owner เห็นแล้วคิด "อยากมีแบบนี้กับธุรกิจตัวเองบ้าง"

---

### 3.2 Business Layer — "SME Expense Intelligence"

**เป้าหมาย:** สร้างรายได้หลักจาก subscription
**ราคา:** Free (3 ไฟล์/เดือน) / Pro ฿299/เดือน / Team ฿799/เดือน

#### ฟีเจอร์ Business Layer

```
[B] SME Dashboard (ต้อง login)
│
├── File Upload & Processing
│   ├── อัปโหลด Excel (bank statement, expense report)
│   ├── อัปโหลด CSV (export จากโปรแกรมบัญชี)
│   ├── อัปโหลด PDF (ใบแจ้งหนี้, ใบเสร็จ — text-based เท่านั้น)
│   └── Auto-categorize รายการ (กำหนด rules เอง / ใช้ preset)
│
├── Expense Dashboard
│   ├── Cash Flow Overview (เงินเข้า vs เงินออก รายเดือน)
│   ├── Category Breakdown (ค่าจ้าง, ค่าเช่า, วัตถุดิบ, ฯลฯ)
│   ├── Trend Analysis (เปรียบเทียบเดือนต่อเดือน)
│   └── Budget vs Actual (ถ้ากำหนด budget ไว้)
│
├── Leak Detection (ตรวจจับจุดรั่วไหล) [Pro]
│   ├── ค่าใช้จ่ายที่เพิ่มขึ้นผิดปกติ
│   ├── รายการจ่ายซ้ำ (duplicate payment detection)
│   ├── ค่าใช้จ่ายที่ไม่ตรงกับ pattern ปกติ
│   └── แนะนำจุดที่อาจลดได้ (based on category benchmarks)
│
├── Cash Flow Forecasting [Pro]
│   ├── Simple projection (ไม่ใช่ ML — ใช้ค่าเฉลี่ยเคลื่อนที่ + seasonal pattern)
│   ├── "ถ้ายอดขายลด 20% เงินจะหมดเมื่อไหร่?" (what-if scenario)
│   ├── Burn Rate Calculator
│   └── Cash Runway Indicator (เงินพอใช้อีกกี่เดือน)
│
├── Alerts & Notifications [Pro]
│   ├── แจ้งเตือนเมื่อค่าใช้จ่ายเกิน budget
│   ├── แจ้งเตือนเมื่อ cash runway ต่ำกว่า 3 เดือน
│   └── สรุปรายสัปดาห์ทาง email / LINE
│
└── Export & Share
    ├── PDF Report (ส่งให้ผู้ถือหุ้น/ธนาคาร)
    ├── CSV Export
    └── Shareable dashboard link (read-only)
```

#### Business Logic ของ Expense Analysis

```
ข้อมูลเข้า:
  - User อัปโหลด Excel/CSV ของค่าใช้จ่ายธุรกิจ
  - Expected columns: วันที่, รายการ, จำนวนเงิน, หมวดหมู่ (optional)
  - ระบบรองรับ: Bank statement (SCB, KBANK, BBL format)
                   โปรแกรมบัญชี export (PEAK, FlowAccount, AccCloud)
                   Excel ที่กรอกเอง (ใช้ template ของเรา)

Logic การจัดหมวดหมู่อัตโนมัติ:
  - Step 1: ตรวจสอบว่ามี column "หมวดหมู่" หรือไม่
  - Step 2: ถ้าไม่มี → ใช้ keyword matching:
      "เงินเดือน|ค่าจ้าง|salary" → บุคลากร
      "ค่าเช่า|rent|office" → สถานที่
      "วัตถุดิบ|สินค้า|material" → ต้นทุนสินค้า
      "ไฟฟ้า|น้ำประปา|โทรศัพท์|internet" → สาธารณูปโภค
      "โฆษณา|marketing|ads" → การตลาด
  - Step 3: รายการที่จับคู่ไม่ได้ → "ยังไม่จัดหมวดหมู่" (user จัด manual)
  - Step 4: ระบบเรียนรู้จากที่ user จัดเอง → ใช้กับรายการถัดไป

Logic ตรวจจับจุดรั่วไหล (Leak Detection):
  - Rule 1: Monthly Spike — หมวดใดเพิ่มขึ้น > 30% จากค่าเฉลี่ย 3 เดือนก่อน
  - Rule 2: Duplicate Detection — รายการที่มี (จำนวนเงินเท่ากัน + วันที่ห่างกัน < 7 วัน + ชื่อคล้ายกัน)
  - Rule 3: Outlier — รายการที่ > 2.5 SD จากค่าเฉลี่ยในหมวดเดียวกัน
  - Rule 4: Recurring Cost Creep — ค่าใช้จ่ายประจำที่ค่อยๆ เพิ่มขึ้นทุกเดือน (> 5% ต่อเนื่อง 3 เดือน)

Logic การพยากรณ์ Cash Flow (ใช้สถิติพื้นฐาน ไม่ใช่ ML):
  - Method: Weighted Moving Average (WMA)
      weighted_avg = (month[-1] × 3 + month[-2] × 2 + month[-3] × 1) / 6
  - Seasonal Adjustment: ถ้ามีข้อมูล >= 12 เดือน
      seasonal_index = avg_month[i] / avg_all_months
      forecast[i] = weighted_avg × seasonal_index
  - What-If Scenario:
      input: "ถ้ารายได้ลด X%"
      output: ปรับ income forecast ลง X% → คำนวณ cash runway ใหม่
  - Cash Runway:
      current_cash / avg_monthly_burn_rate = จำนวนเดือนที่เหลือ

ข้อจำกัดที่บอก user ตรงๆ:
  - "การพยากรณ์ใช้ค่าเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ AI — เป็นแนวโน้มประมาณการ"
  - "ยิ่งมีข้อมูลมากเดือน ยิ่งแม่นยำ (แนะนำ 6+ เดือน)"
  - "ไม่ได้รับประกันความแม่นยำ ควรใช้ประกอบการตัดสินใจ"
```

#### ทำไม Business Layer ถึง Work (แตกต่างจาก v1)

1. **ไม่สัญญา Zero-config** → บอกชัดว่ารองรับ format ไหน ให้ template ดาวน์โหลด
2. **ไม่สัญญา AI Forecasting** → ใช้สถิติพื้นฐานแล้วบอกตรงๆ ว่าไม่ใช่ AI → ความเชื่อมั่นสูงกว่า
3. **แก้ปัญหาที่ SME มีจริง** → "เงินหาย ไม่รู้หายไปไหน" และ "เงินจะหมดเมื่อไหร่"
4. **Template-based** → ให้ Excel template ที่กรอกง่าย → ลด friction เรื่อง data format
5. **เปรียบเทียบกับ Excel ชัด** → Excel ไม่บอกว่า "ค่าไฟเพิ่ม 40% จากเดือนก่อน" อัตโนมัติ

---

### 3.3 API Layer — อนาคต (Phase 3+)

```
ยังไม่ต้องทำตอนนี้ แต่วางโครงสร้างรองรับ:

POST /api/v1/parse
  Input: PDF/Excel file
  Output: Structured JSON

POST /api/v1/analyze
  Input: Structured financial data
  Output: Anomalies + Forecasts

ลูกค้าเป้าหมายในอนาคต:
  - Fintech startups ที่ต้อง parse เอกสารการเงินไทย
  - บริษัทบัญชีที่ต้อง onboard ลูกค้าใหม่
  - ธนาคารที่ต้อง process ใบสมัครสินเชื่อ
```

---

## 4. Revenue Model ที่ปรับใหม่

### 4.1 แผนราคา

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  🌐 Civic Explorer        ฟรี (ไม่ต้อง login)           │
│  ├── ดูงบประมาณรัฐ                                       │
│  ├── Dashboard สาธารณะ                                   │
│  ├── Download CSV/JSON                                   │
│  └── แชร์กราฟบน Social Media                              │
│                                                          │
│  📊 SME Free              ฟรี (ต้อง login)               │
│  ├── อัปโหลด 3 ไฟล์/เดือน                                │
│  ├── Dashboard พื้นฐาน (Bar, Pie)                        │
│  ├── Export CSV                                          │
│  └── ดูรายการ (ไม่มี anomaly detection)                   │
│                                                          │
│  ⭐ SME Pro               ฿299/เดือน (฿2,999/ปี)        │
│  ├── ไม่จำกัดไฟล์                                         │
│  ├── Leak Detection (ตรวจจับจุดรั่วไหล)                    │
│  ├── Cash Flow Forecasting                               │
│  ├── What-If Scenarios                                   │
│  ├── Alerts (email + LINE)                               │
│  ├── PDF Report Export                                   │
│  └── Priority Support                                    │
│                                                          │
│  👥 SME Team              ฿799/เดือน                     │
│  ├── ทุกอย่างใน Pro                                       │
│  ├── 5 users ต่อ workspace                               │
│  ├── Shared dashboards                                   │
│  ├── Comment & annotation                                │
│  └── Role-based access                                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Unit Economics (เป้าหมาย)

```
Target: 200 Pro subscribers (เดือนที่ 12)

รายได้:
  150 Pro × ฿299/เดือน   = ฿44,850
  50 Team × ฿799/เดือน   = ฿39,950
  รวม                     = ฿84,800/เดือน

ต้นทุน:
  Vercel Pro              = ฿700/เดือน
  Railway/Render          = ฿1,000/เดือน
  Domain + email          = ฿200/เดือน
  รวม                     = ฿1,900/เดือน

กำไรก่อนหักค่าแรง          = ฿82,900/เดือน
```

### 4.3 Conversion Funnel Logic

```
Step 1: Civic Layer Traffic
  ├── SEO: "งบประมาณ 2569 กระทรวงศึกษา" → หน้า Explorer
  ├── Social: คนแชร์กราฟ "งบทหาร vs งบการศึกษา" → viral
  └── Media: นักข่าว/NGO ใช้ข้อมูลจากแพลตฟอร์ม → PR ฟรี

Step 2: Awareness → Interest
  ├── Banner บนหน้า Civic: "วิเคราะห์ค่าใช้จ่ายธุรกิจคุณแบบนี้บ้าง →"
  ├── Blog: "5 สัญญาณที่บอกว่า SME ของคุณกำลังรั่วไหล"
  └── Case Study: "ร้านกาแฟลดค่าใช้จ่าย 15% หลังใช้ ouran_ratsadon"

Step 3: Sign Up (Free)
  ├── ให้ template Excel ดาวน์โหลดฟรี
  ├── อัปโหลดไฟล์ 3 ไฟล์ → เห็น dashboard ทันที
  └── เห็น "ฟีเจอร์ Leak Detection" แต่ blur → CTA อัปเกรด

Step 4: Convert → Pro
  ├── Trigger 1: เห็น red flag แต่ดูรายละเอียดไม่ได้
  ├── Trigger 2: ครบ 3 ไฟล์ → "อัปเกรดเพื่อไม่จำกัด"
  └── Trigger 3: อยากได้ Cash Flow Forecast
```

---

## 5. ปรับ Feature Priority ใหม่

### Phase 0 — Portfolio MVP (เดือนที่ 1) ★ เน้นที่นี่

> ⚠️ Updated 2026-06-08 — scope ด้านล่าง sync กับ `CLAUDE.md` (แหล่งอ้างอิงหลักที่ตัดสินใจแล้ว) ฉบับร่างก่อนหน้านี้ระบุ leak rules 3 ข้อ และ Google OAuth ไว้ใน Phase 0 ซึ่งได้ถูกตัด scope ออกแล้วเพื่อลด risk ก่อนเริ่ม scaffold — ดูเหตุผลละเอียดใน `CLAUDE.md` § Priority matrix และ `docs/dev-roadmap-2026-06-08.md`
>
> Phase 0 ยังถูกแบ่งเป็น 0a (Civic Layer, สัปดาห์ 1-2 — โฟกัสก่อน) และ 0b (Business Layer slice บางๆ, สัปดาห์ 3-4)

```
เป้าหมาย: มี live demo ที่ใช้งานได้จริง 2 ส่วน

[Civic Layer — 0a, ship first]
✅ หน้า Explorer (Treemap + ตัวเลือกปี + drill-down กระทรวง)
✅ หน้า Search (filter panel + ตาราง + active filter tags)
✅ หน้า Project detail (ประวัติ 5 ปี)
✅ Red Flag: Rule 1 (เพิ่มผิดปกติ) + Rule 2 (ค่าผิดปกติทางสถิติ) เท่านั้น — รวม fallback ตามที่กำหนดใน analyzer-spec.md
✅ Download CSV
✅ Share URL + OG image พื้นฐาน
✅ Responsive + Dark mode

[Business Layer — 0b, deliberately thin — เริ่มหลัง 0a demo-ready เท่านั้น]
✅ Register/Login: email/password เท่านั้น (Google OAuth → Phase 1 เพื่อลด scope การตั้งค่า OAuth/callback/account-linking)
✅ Upload Excel template เท่านั้น (bank/accounting format → Phase 2)
✅ Auto-categorize (keyword matching)
✅ Expense Dashboard: Cash flow + Category breakdown เท่านั้น (ไม่มี Budget vs Actual — ต้องมี budget-setting ก่อน)
✅ Leak Detection: **Outlier rule เท่านั้น** (Monthly Spike ต้องการข้อมูล 3 เดือนซึ่ง demo user ส่วนใหญ่ยังไม่มี — ไปทำพร้อม rule อื่นใน Phase 1 เมื่อมีข้อมูลใช้งานจริงมา validate)
✅ Export CSV
✅ "Pro" features: ใช้ flag `isManuallyGranted` บน Subscription (admin ตั้งเอง) — ยังไม่มี checkout flow จริง

[ไม่ทำใน Phase 0]
✗ Google OAuth (→ Phase 1)
✗ Leak rules อื่น: Monthly Spike, Duplicate Payment, Recurring Cost Creep (→ Phase 1)
✗ Sunburst/Map view, year-over-year comparison (Civic)
✗ Bank statement / accounting export parsing
✗ Cash Flow Forecasting, What-If Scenarios, Alerts
✗ PDF Export
✗ Team features
✗ Payment integration จริง (ใช้ manual `isManuallyGranted` flag แทน)
✗ Budget vs Actual comparison
```

### Phase 1 — Beta (เดือนที่ 2-3)

```
✅ Google OAuth (ย้ายมาจาก Phase 0)
✅ Leak rules ที่เหลือ: Monthly Spike, Duplicate Payment, Recurring Cost Creep
✅ Budget vs Actual comparison
✅ Sunburst + Map view (Civic), red flag rules 3-4 ครบ, embed widget
✅ Cash Flow Forecasting (WMA + Seasonal)
✅ What-If Scenario Calculator
✅ Cash Runway Indicator
✅ Alerts (email only)
✅ PDF Report Export
✅ Payment integration (Stripe/Omise)
✅ Free trial 14 วัน
```

### Phase 2 — Growth (เดือนที่ 4-6)

```
✅ LINE notification
✅ Team workspace
✅ Support bank statement formats (SCB, KBANK, BBL)
✅ Support โปรแกรมบัญชี export (PEAK, FlowAccount)
✅ Community features (Civic Layer)
✅ Admin panel full
```

---

## 6. สรุปการเปลี่ยนแปลงจาก v1

| หัวข้อ | v1 (เดิม) | v2 (ปรับใหม่) |
|-------|----------|--------------|
| **ลูกค้าหลัก** | รัฐ + SME (พร้อมกัน) | SME เป็นหลัก, รัฐเป็น marketing layer |
| **ขายให้รัฐ** | Subscription ให้รัฐ | ไม่ขาย → ให้ประชาชนใช้ฟรี |
| **Value Prop** | "Zero-config AI dashboard" | "หาจุดรั่วไหล + พยากรณ์เงินจะหมดเมื่อไหร่" |
| **PDF Parsing** | User อัปโหลดทุก format | Civic = ทีม pre-process / SME = Excel template |
| **AI/ML** | สัญญา AI forecasting | ใช้สถิติพื้นฐาน (WMA) บอกตรงๆ ว่าไม่ใช่ AI |
| **Pricing** | Free + Pro | Civic (ฟรี) + Free + Pro + Team |
| **Growth Strategy** | ขาย sales-assisted | Civic SEO → content → free signup → convert |
| **ความเสี่ยง parsing** | สูง (ทุก PDF format) | ต่ำ (จำกัด format + ให้ template) |
| **สิ่งที่ต่างจาก Excel** | "Dashboard สวยกว่า" | "บอกว่าเงินหายไปไหน + เงินจะหมดเมื่อไหร่" |

---

## 7. คำถามสำคัญที่ต้องตอบ (Validation Checklist)

ก่อนเริ่ม code จริง ให้ validate สิ่งเหล่านี้:

```
□ สัมภาษณ์ SME owner 10 คน:
  "ค่าใช้จ่ายอะไรที่คุณไม่แน่ใจว่าจำเป็น?"
  "เคยมีเดือนที่เงินหมดไม่ทันตั้งตัวไหม?"
  "ถ้ามีเครื่องมือบอกว่า ค่าไฟเดือนนี้เพิ่ม 40% จากปกติ — จะใช้ไหม?"
  "ยินดีจ่ายเท่าไหร่ต่อเดือนสำหรับเครื่องมือนี้?"

□ หาข้อมูลงบประมาณ 3 ปีจาก bb.go.th:
  ได้มาง่ายไหม? format เป็นอย่างไร? parse ได้จริงไหม?

□ ทดลอง parse bank statement จากธนาคาร 3 แห่ง:
  SCB, KBANK, BBL → format ต่างกันไหม?
  ดึงข้อมูลได้ครบไหม?

□ ลอง keyword matching กับรายการค่าใช้จ่ายจริง:
  accuracy กี่ %? รายการที่ match ไม่ได้เยอะไหม?
```
