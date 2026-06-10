// Demo data used in the Business Layer dashboard (Phase 0)
// Replaced by real DB data in production

export interface MockTransaction {
  id: string;
  description: string;
  category: string;
  amount: number;
  transactionType: "INCOME" | "EXPENSE";
  date: string;
  leakFlag: "NONE" | "SPIKE" | "DUPLICATE" | "OUTLIER" | "CREEP";
  leakReason: string | null;
}

export interface MockCategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
  trendPct: number;
}

export interface MockSummary {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  categories: MockCategoryBreakdown[];
}

export const MOCK_SUMMARY: MockSummary = {
  totalIncome: 870000,
  totalExpense: 682000,
  netCashFlow: 188000,
  categories: [
    { name: "บุคลากร",       amount: 300000, percentage: 44.0, trendPct:  3.2 },
    { name: "สถานที่",        amount: 150000, percentage: 22.0, trendPct:  0.0 },
    { name: "การตลาด",       amount: 110000, percentage: 16.1, trendPct: 38.5 },
    { name: "สาธารณูปโภค",   amount:  48000, percentage:  7.0, trendPct:  5.1 },
    { name: "ค่าเดินทาง",    amount:  30000, percentage:  4.4, trendPct: -8.0 },
    { name: "อื่นๆ",          amount:  44000, percentage:  6.4, trendPct:  2.0 },
  ],
};

export const MOCK_TRANSACTIONS: MockTransaction[] = [
  { id: "1",  description: "รายได้จากการขายสินค้า",          category: "รายได้",         amount:  450000, transactionType: "INCOME",  date: "2568-03-01", leakFlag: "NONE",    leakReason: null },
  { id: "2",  description: "รายได้จากบริการที่ปรึกษา",      category: "รายได้",         amount:  420000, transactionType: "INCOME",  date: "2568-03-15", leakFlag: "NONE",    leakReason: null },
  { id: "3",  description: "เงินเดือนพนักงาน 5 คน",         category: "บุคลากร",        amount: -300000, transactionType: "EXPENSE", date: "2568-03-28", leakFlag: "NONE",    leakReason: null },
  { id: "4",  description: "ค่าเช่าสำนักงานรายเดือน",       category: "สถานที่",         amount: -150000, transactionType: "EXPENSE", date: "2568-03-01", leakFlag: "NONE",    leakReason: null },
  { id: "5",  description: "ค่าโฆษณา Facebook Ads (มีนาคม)", category: "การตลาด",        amount:  -80000, transactionType: "EXPENSE", date: "2568-03-10", leakFlag: "NONE",    leakReason: null },
  { id: "6",  description: "ค่าโฆษณา Google Ads (แคมเปญพิเศษ)", category: "การตลาด",   amount:  -30000, transactionType: "EXPENSE", date: "2568-03-20", leakFlag: "SPIKE",   leakReason: "หมวดการตลาดเพิ่มขึ้น 38.5% จากเฉลี่ย 3 เดือนก่อน" },
  { id: "7",  description: "ค่าไฟฟ้าและน้ำประปา",            category: "สาธารณูปโภค",   amount:  -28000, transactionType: "EXPENSE", date: "2568-03-05", leakFlag: "NONE",    leakReason: null },
  { id: "8",  description: "ค่าอินเทอร์เน็ตและโทรศัพท์",   category: "สาธารณูปโภค",   amount:  -20000, transactionType: "EXPENSE", date: "2568-03-01", leakFlag: "NONE",    leakReason: null },
  { id: "9",  description: "ค่าเดินทางประชุมลูกค้า",         category: "ค่าเดินทาง",    amount:  -30000, transactionType: "EXPENSE", date: "2568-03-18", leakFlag: "NONE",    leakReason: null },
  { id: "10", description: "ค่าใช้จ่ายเบ็ดเตล็ด",           category: "อื่นๆ",          amount:  -44000, transactionType: "EXPENSE", date: "2568-03-25", leakFlag: "NONE",    leakReason: null },
];
