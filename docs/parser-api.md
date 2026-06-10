# ouran_ratsadon Parser Microservice — API Documentation

> **Base URL (local):** `http://localhost:8000`  
> **Base URL (production):** ตั้งค่าใน `NEXT_PUBLIC_PARSER_URL`  
> **Framework:** FastAPI 0.100+ · Python 3.11+  
> **Version:** 0.1.0

---

## Overview

Parser microservice รับผิดชอบการแปลงไฟล์ทุกรูปแบบให้เป็น JSON ที่ standardized ก่อนส่งต่อให้ Next.js API บันทึกลง PostgreSQL มี 2 กลุ่มหลัก:

| กลุ่ม | Endpoints | ใช้กับ |
|---|---|---|
| **Civic Parsers** | `/parse/pdf`, `/parse/excel`, `/parse/government-budget` | Admin อัปโหลดข้อมูลงบประมาณรัฐ |
| **Business Parsers** | `/parse/bank-statement`, `/parse/accounting-export` | SME อัปโหลดข้อมูลการเงินของตัวเอง |

---

## Authentication

Parser microservice **ไม่มี authentication** — รับเรียกได้จาก Next.js API Routes เท่านั้น (ผ่าน internal network / same-origin) ไม่ควร expose port 8000 สู่ public internet โดยตรง

---

## Endpoints

---

### `GET /parse/health`

Health check — ใช้สำหรับ load balancer / deploy pipeline

**Response `200 OK`**
```json
{ "status": "ok" }
```

---

### `POST /parse/pdf`

แปลง PDF งบประมาณรัฐเป็น BudgetData JSON

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | ✓ | ไฟล์ `.pdf` เท่านั้น |

**Response `200 OK`** — `BudgetData` schema (ดู [models.py](../apps/parser/models.py))

**Errors**

| Code | Reason |
|---|---|
| `400` | Content-type ไม่ใช่ `application/pdf` |
| `422` | PDF parse ล้มเหลว (ไฟล์เสีย, รูปแบบไม่รองรับ) |

---

### `POST /parse/excel`

แปลง Excel งบประมาณรัฐเป็น BudgetData JSON

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | ✓ | ไฟล์ `.xlsx` หรือ `.xls` เท่านั้น |

**Response `200 OK`** — `BudgetData` schema

**Errors**

| Code | Reason |
|---|---|
| `400` | Content-type ไม่ใช่ Excel MIME type |
| `422` | Excel parse ล้มเหลว |

---

### `POST /parse/government-budget`

Multi-format budget ingestion สำหรับ Civic Layer Admin Upload Pipeline  
รองรับ HTML (สำนักงบประมาณ), XLSX, CSV — detect format อัตโนมัติจาก filename/content-type

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | ✓ | `.html`, `.xlsx`, หรือ `.csv` ขนาดไม่เกิน **150 MB** |
| `fiscal_year` | integer | – | hint ปีงบประมาณ (เช่น `2568`) ถ้าไม่ระบุจะ detect จากไฟล์ |

**Response `200 OK`** — `ParseResult` schema

```json
{
  "rows": [
    {
      "ministry_name": "กระทรวงศึกษาธิการ",
      "department_name": "สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน",
      "project_name": "โครงการพัฒนาคุณภาพการศึกษา",
      "amount": 1500000000,
      "fiscal_year": "2568",
      "budget_type": "operating",
      "province": null
    }
  ],
  "rowCount": 1,
  "warnings": [],
  "sourceFormat": "xlsx",
  "fiscalYear": "2568"
}
```

| Field | Type | Description |
|---|---|---|
| `rows` | `BudgetLineItemRow[]` | Parsed budget rows |
| `rowCount` | integer | จำนวน rows ที่ parse ได้ |
| `warnings` | `string[]` | คำเตือนที่ไม่ fatal (เช่น บาง row ข้อมูลไม่ครบ) |
| `sourceFormat` | `"html" \| "xlsx" \| "csv"` | Format ที่ detect ได้ |
| `fiscalYear` | string | ปีงบประมาณที่ใช้ |

**Errors**

| Code | Reason |
|---|---|
| `400` | ไฟล์ว่างเปล่า |
| `413` | ขนาดเกิน 150 MB |
| `422` | Format ไม่รองรับ หรือ parse ล้มเหลว |

---

### `POST /parse/bank-statement`

แปลง bank statement CSV/XLSX จากธนาคารไทยเป็น normalized transactions

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | ✓ | `.csv` หรือ `.xlsx` ขนาดไม่เกิน **20 MB** |
| `bank` | string | ✓ | รหัสธนาคาร: `SCB`, `KBANK`, หรือ `BBL` |

**Supported Banks**

| รหัส | ธนาคาร | Export source |
|---|---|---|
| `SCB` | ธนาคารไทยพาณิชย์ | SCB Easy App · CSV Export |
| `KBANK` | ธนาคารกสิกรไทย | K PLUS · CSV Export |
| `BBL` | ธนาคารกรุงเทพ | Bualuang ibanking · CSV/XLSX |

**Response `200 OK`**

```json
{
  "bank": "SCB",
  "transactionCount": 42,
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "โอนเงินเข้า บจก.ABC",
      "amount": 50000.00,
      "balance": 125000.50,
      "channel": "INTERNET",
      "ref": "TXN20240115001",
      "bank": "SCB"
    }
  ],
  "warnings": []
}
```

**Transaction Schema (`NormalizedTransaction`)**

| Field | Type | Description |
|---|---|---|
| `date` | `YYYY-MM-DD` | วันที่ธุรกรรม (แปลงจาก BE→AD อัตโนมัติ) |
| `description` | string | รายละเอียดรายการ |
| `amount` | float | **บวก = รับเงิน, ลบ = จ่ายเงิน** |
| `balance` | float\|null | ยอดคงเหลือหลังธุรกรรม |
| `channel` | string\|null | `ATM` \| `INTERNET` \| `BRANCH` \| `TRANSFER` \| `PROMPTPAY` |
| `ref` | string\|null | เลขอ้างอิง/trace number |
| `bank` | string | รหัสธนาคาร |

**Errors**

| Code | Reason |
|---|---|
| `400` | `bank` ไม่ใช่ `SCB`/`KBANK`/`BBL`, หรือไฟล์ว่าง |
| `413` | ขนาดเกิน 20 MB |
| `422` | Parse ล้มเหลว (ไม่พบ header row, format ไม่ตรง) |

> **Note:** `warnings` จะมีข้อความถ้าไม่พบ transactions เลย — ควรแสดง warning ให้ user ทราบ

---

### `POST /parse/accounting-export`

แปลง accounting software export (PEAK / FlowAccount) เป็น normalized journal entries

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | ✓ | `.csv` หรือ `.xlsx` ขนาดไม่เกิน **50 MB** |
| `software` | string | ✓ | `PEAK` หรือ `FLOWACCOUNT` |

**Supported Software**

| รหัส | โปรแกรม | Export path |
|---|---|---|
| `PEAK` | PEAK บัญชี | รายงาน → Export CSV/XLSX |
| `FLOWACCOUNT` | FlowAccount | รายงาน → ดาวน์โหลด CSV |

**Response `200 OK`**

```json
{
  "software": "PEAK",
  "entryCount": 156,
  "entries": [
    {
      "date": "2024-03-01",
      "doc_no": "IV-2024-001",
      "account": "4100",
      "description": "ขายสินค้า บจก.XYZ",
      "debit": 0.0,
      "credit": 107000.0,
      "net": 107000.0,
      "vat": 7000.0,
      "wht": null,
      "category": "รายได้จากการขาย",
      "source": "PEAK"
    }
  ],
  "warnings": []
}
```

**Entry Schema (`NormalizedJournalEntry`)**

| Field | Type | Description |
|---|---|---|
| `date` | `YYYY-MM-DD` | วันที่บันทึกบัญชี |
| `doc_no` | string\|null | เลขที่เอกสาร (invoice/receipt/journal) |
| `account` | string\|null | รหัสบัญชี (chart of accounts) |
| `description` | string | รายละเอียด |
| `debit` | float | ยอดเดบิต (0 ถ้าเป็น credit entry) |
| `credit` | float | ยอดเครดิต (0 ถ้าเป็น debit entry) |
| `net` | float | **credit − debit** (บวก = รายได้, ลบ = ค่าใช้จ่าย) |
| `vat` | float\|null | ภาษีมูลค่าเพิ่ม |
| `wht` | float\|null | ภาษีหัก ณ ที่จ่าย |
| `category` | string\|null | หมวดหมู่จาก PEAK/FlowAccount |
| `source` | `"PEAK"\|"FLOWACCOUNT"` | ที่มาของข้อมูล |

**Errors**

| Code | Reason |
|---|---|
| `400` | `software` ไม่ใช่ `PEAK`/`FLOWACCOUNT`, หรือไฟล์ว่าง |
| `413` | ขนาดเกิน 50 MB |
| `422` | Parse ล้มเหลว (ไม่พบ header row ที่จำเป็น) |

---

## Error Response Format

FastAPI ส่ง error response ในรูปแบบมาตรฐาน:

```json
{
  "detail": "ข้อความอธิบายข้อผิดพลาดเป็นภาษาไทย"
}
```

---

## Running the Service

```bash
# Install dependencies
cd apps/parser
pip install fastapi uvicorn pdfplumber openpyxl pandas python-multipart

# Development
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

**Interactive Swagger UI** (dev only): `http://localhost:8000/docs`  
**ReDoc UI**: `http://localhost:8000/redoc`

---

## CORS Configuration

ปัจจุบันอนุญาตเฉพาะ `http://localhost:3000` — แก้ใน `main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://ouran.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## File Size Limits

| Endpoint | Limit | Reason |
|---|---|---|
| `/parse/government-budget` | 150 MB | ไฟล์งบประมาณรัฐ (ต้อง match กับ Next.js API) |
| `/parse/bank-statement` | 20 MB | Bank statements มักเล็กมาก |
| `/parse/accounting-export` | 50 MB | Accounting exports อาจใหญ่กว่า |

---

## Date Handling

Parser จัดการ date formats ไทยอัตโนมัติ:

| Input format | ตัวอย่าง | Output |
|---|---|---|
| `DD/MM/YYYY` (AD) | `15/01/2024` | `2024-01-15` |
| `DD/MM/YYYY` (BE) | `15/01/2567` | `2024-01-15` |
| `DD-MM-YYYY` | `15-01-2567` | `2024-01-15` |
| `YYYY-MM-DD` | `2024-01-15` | `2024-01-15` |
| `DD MMM YYYY` (Thai) | `15 ม.ค. 2567` | `2024-01-15` |
| `DD MMM YYYY` (English) | `15 Jan 2024` | `2024-01-15` |

**BE → AD:** ถ้า year > 2500 จะ subtract 543 อัตโนมัติ

---

## Integration Example (Next.js)

```typescript
// apps/web/app/(dashboard)/upload/page.tsx pattern

const parserUrl = process.env.NEXT_PUBLIC_PARSER_URL ?? "http://localhost:8000";

// Bank statement
const form = new FormData();
form.append("file", file);
form.append("bank", "SCB");

const res = await fetch(`${parserUrl}/parse/bank-statement`, {
  method: "POST",
  body: form,
});

const { transactions, warnings } = await res.json();

// Accounting export  
const form2 = new FormData();
form2.append("file", file);
form2.append("software", "PEAK");

const res2 = await fetch(`${parserUrl}/parse/accounting-export`, {
  method: "POST",
  body: form2,
});

const { entries, warnings: w2 } = await res2.json();
```
