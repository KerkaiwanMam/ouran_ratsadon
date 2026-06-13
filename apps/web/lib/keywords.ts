// Keyword-frequency analysis for the "KeywordBudget" view.
//
// Thai project names/transaction descriptions are written without spaces
// between words (e.g. "โครงการก่อสร้างอาคารเรียนภูมิภาค"), so generic
// whitespace tokenization doesn't produce useful keywords. Instead we match
// a curated dictionary of domain terms as substrings — deterministic, no
// NLP/ML dependency, consistent with this project's "no AI/ML" rule for
// analysis features.

export interface KeywordCount {
  keyword: string;
  count: number;
}

// Civic Layer — common themes found in Thai government budget project names.
export const BUDGET_PROJECT_KEYWORDS: readonly string[] = [
  "ก่อสร้าง", "พัฒนา", "ปรับปรุง", "ซ่อมแซม", "ซ่อมบำรุง", "บำรุงรักษา",
  "จัดซื้อ", "จัดหา", "ฝึกอบรม", "อบรม", "บุคลากร", "ระบบ", "ดิจิทัล",
  "เทคโนโลยี", "ถนน", "ทางหลวง", "สะพาน", "รถไฟ", "ขนส่ง", "คมนาคม",
  "น้ำ", "ชลประทาน", "เกษตร", "เกษตรกร", "สาธารณสุข", "โรงพยาบาล",
  "วัคซีน", "โรค", "การศึกษา", "โรงเรียน", "นักเรียน", "ครู", "มหาวิทยาลัย",
  "หลักสูตร", "อาชีวศึกษา", "ภัยพิบัติ", "ภัย", "ความมั่นคง", "ทหาร",
  "กองทัพ", "ตำรวจ", "ยาเสพติด", "สิ่งแวดล้อม", "พลังงาน", "ไฟฟ้า",
  "ท่องเที่ยว", "วัฒนธรรม", "กีฬา", "สวัสดิการ", "ผู้สูงอายุ", "เด็ก",
  "สตรี", "คนพิการ", "ที่อยู่อาศัย", "ชุมชน", "อาคาร", "เครื่องมือ",
  "อุปกรณ์", "ฐานข้อมูล", "ทะเบียนราษฎร", "เลือกตั้ง", "แรงงาน", "เศรษฐกิจ",
  "อุตสาหกรรม", "ส่งออก", "ป่าไม้", "ทะเล", "ประมง", "โครงสร้างพื้นฐาน",
  "ภูมิภาค", "ทั่วประเทศ", "ท้องถิ่น", "กู้ภัย", "ดับเพลิง", "อาสาสมัคร",
  "เตือนภัย", "อาหาร", "รายได้",
];

// Business Layer — common Thai SME expense/transaction description themes.
export const TRANSACTION_KEYWORDS: readonly string[] = [
  "ค่าเช่า", "ค่าน้ำ", "ค่าไฟ", "สาธารณูปโภค", "เงินเดือน", "ค่าจ้าง",
  "ค่าแรง", "ค่าน้ำมัน", "ค่าขนส่ง", "ค่าเดินทาง", "ค่าโฆษณา", "การตลาด",
  "ค่าซ่อม", "ซ่อมบำรุง", "ค่าธรรมเนียม", "ดอกเบี้ย", "ภาษี", "ประกัน",
  "เบี้ยประกัน", "วัตถุดิบ", "อุปกรณ์", "สำนักงาน", "โทรศัพท์", "อินเทอร์เน็ต",
  "คอมมิชชั่น", "สวัสดิการ", "บริการ", "จัดส่ง", "สาขา", "พนักงาน",
];

/**
 * Count how many texts contain each dictionary keyword (as a substring,
 * case-insensitive), sorted by frequency descending and capped to topN.
 * Keywords with zero matches are omitted.
 */
export function countKeywords(
  texts: string[],
  dictionary: readonly string[],
  topN = 20
): KeywordCount[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const keyword of dictionary) {
      if (lower.includes(keyword.toLowerCase())) {
        counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .filter((k) => k.count > 0)
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword, "th"))
    .slice(0, topN);
}
