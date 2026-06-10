# Sample data sources

> ส่วนขยายจาก CLAUDE.md — ใช้ตอนเตรียมข้อมูลสาธิต/ทดสอบ

## Civic Layer (pre-processed by team)
- Source: `bb.go.th`, `data.go.th`, sample machine-readable files from WeVis (e.g., `https://wevis.info/thbudget68`)
- Format: Text-based PDF only (no OCR)
- Expected categories per ministry: บุคลากร, ดำเนินงาน, ลงทุน, ครุภัณฑ์, วัสดุ, ที่ดินและสิ่งก่อสร้าง
- Initial dataset: at minimum fiscal year 2568 (for portfolio demo) — see roadmap.md for the Phase 0 cut (a 2nd year is a stretch goal, not required)

## Business Layer (Excel template)
- Provide downloadable template with columns: วันที่, รายการ, หมวดหมู่ (optional), จำนวนเงิน, ประเภท (income/expense)
- Encourage users to use this rather than parsing arbitrary formats
- Generate 2-3 sample SME files for testing (restaurant, small e-commerce, consulting firm)

> Phase 0 only accepts the Excel template — bank statement (SCB/KBANK/BBL) and accounting export (PEAK/FlowAccount) sample data is needed in Phase 2, not now (see roadmap.md)
