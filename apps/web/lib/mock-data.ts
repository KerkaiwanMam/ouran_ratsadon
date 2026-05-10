import type { BudgetData } from "@/types";

export const MOCK_BUDGET: BudgetData = {
  metadata: {
    id: "mock-file-001",
    filename: "งบประมาณ_สำนักงาน_2567.pdf",
    fileType: "pdf",
    status: "done",
    uploadedAt: "2024-10-01T08:00:00.000Z",
    fiscalYear: "2567",
    organization: "สำนักงานเขตพื้นที่การศึกษา",
    parsedAt: "2024-10-01T08:01:23.000Z",
    totalItems: 12,
  },
  summary: {
    totalBudget: 48_500_000,
    totalSpent:  32_180_000,
    totalRemaining: 16_320_000,
    categories: [
      { name: "บุคลากร",    budget: 22_000_000, spent: 18_700_000, percentage: 45.4 },
      { name: "ดำเนินงาน", budget: 12_500_000, spent:  8_200_000, percentage: 25.8 },
      { name: "ลงทุน",      budget:  8_000_000, spent:  3_480_000, percentage: 16.5 },
      { name: "ครุภัณฑ์",  budget:  4_000_000, spent:  1_500_000, percentage:  8.2 },
      { name: "วัสดุ",      budget:  2_000_000, spent:    300_000, percentage:  4.1 },
    ],
  },
  items: [
    { id: "1", description: "เงินเดือนข้าราชการ",             category: "บุคลากร",    amount: 14_400_000, date: null, anomalyFlag: "none",     anomalyReason: null },
    { id: "2", description: "ค่าจ้างลูกจ้างประจำ",           category: "บุคลากร",    amount:  4_200_000, date: null, anomalyFlag: "none",     anomalyReason: null },
    { id: "3", description: "ค่าตอบแทนพนักงานราชการ",        category: "บุคลากร",    amount:  3_400_000, date: null, anomalyFlag: "none",     anomalyReason: null },
    { id: "4", description: "ค่าสาธารณูปโภค",                category: "ดำเนินงาน", amount:  1_800_000, date: null, anomalyFlag: "none",     anomalyReason: null },
    { id: "5", description: "ค่าใช้จ่ายในการเดินทาง",        category: "ดำเนินงาน", amount:    950_000, date: null, anomalyFlag: "warning",  anomalyReason: "สูงกว่าค่าเฉลี่ยปีที่ผ่านมา 2.3 เท่า" },
    { id: "6", description: "ค่าเช่าอาคาร",                  category: "ดำเนินงาน", amount:  2_400_000, date: null, anomalyFlag: "none",     anomalyReason: null },
    { id: "7", description: "ค่าวัสดุสำนักงาน",              category: "วัสดุ",      amount:    300_000, date: null, anomalyFlag: "none",     anomalyReason: null },
    { id: "8", description: "ค่าครุภัณฑ์คอมพิวเตอร์",       category: "ครุภัณฑ์",  amount:  1_500_000, date: null, anomalyFlag: "none",     anomalyReason: null },
    { id: "9", description: "ค่าก่อสร้างห้องประชุม",         category: "ลงทุน",      amount:  3_480_000, date: null, anomalyFlag: "critical", anomalyReason: "เกินวงเงินที่อนุมัติเบื้องต้น 15%" },
    { id: "10", description: "ค่าจัดซื้อวัสดุฝึกอบรม",     category: "ดำเนินงาน", amount:  3_050_000, date: null, anomalyFlag: "none",     anomalyReason: null },
    { id: "11", description: "ค่าจ้างที่ปรึกษาโครงการ",     category: "ดำเนินงาน", amount:  4_500_000, date: null, anomalyFlag: "warning",  anomalyReason: "รายการซ้ำกับไตรมาส 2" },
    { id: "12", description: "ค่าซ่อมแซมอาคาร",              category: "ลงทุน",      amount:  4_520_000, date: null, anomalyFlag: "none",     anomalyReason: null },
  ],
};
