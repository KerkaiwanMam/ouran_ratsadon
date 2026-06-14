// Phase 3 — Conversational AI assistant: rule-based reply engine.
//
// Zero-cost replacement for an LLM call: matches the user's Thai question
// against keyword intents and renders a templated answer purely from the
// governed AssistantContext bundle (lib/assistant/context.ts). Same
// anti-hallucination guarantee as an LLM path would need — every number here
// is read directly off the context, never invented — but with no external API,
// no token cost, and no latency.
//
// A free-tier LLM (e.g. Google Gemini) for free-form Q&A is a possible later
// phase — see docs/roadmap.md. This engine would remain the zero-cost fallback
// when that's unconfigured.

import type { AssistantContext } from "./context";

export interface ChatCitation {
  label: string;
  kind: "category" | "month" | "forecast" | "recommendation" | "general";
  category?: string;
  month?: string;
}

export interface AssistantReply {
  answer: string;
  citations: ChatCitation[];
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  if (!y || !m) return yyyymm;
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
}

function formatTHB(n: number): string {
  return `฿${n.toLocaleString("th-TH")}`;
}

function buildHref(c: ChatCitation): string {
  if (c.kind === "forecast" || c.kind === "recommendation") return "/analytics";
  const params = new URLSearchParams();
  if (c.category) params.set("category", c.category);
  if (c.month) params.set("month", c.month);
  const qs = params.toString();
  return qs ? `/transactions?${qs}` : "/transactions";
}

export function toHrefCitations(citations: ChatCitation[]): { label: string; href: string }[] {
  return citations.slice(0, 6).map((c) => ({ label: c.label, href: buildHref(c) }));
}

interface Rule {
  keywords: string[];
  handle: (ctx: AssistantContext) => AssistantReply;
}

const RULES: Rule[] = [
  // เงินสดพอใช้ได้อีกกี่เดือน (cash runway)
  {
    keywords: ["รันเวย์", "runway", "พอใช้", "เหลือกี่เดือน", "ใช้ได้อีกกี่เดือน", "เงินสดหมด"],
    handle: (ctx) => {
      const months = ctx.forecast?.cashRunwayMonths;
      if (months == null) {
        return {
          answer: "ยังไม่มีข้อมูลพอคำนวณ Cash Runway ครับ — ลองอัปโหลดข้อมูลย้อนหลังเพิ่มอีกสักหน่อยแล้วถามใหม่ได้เลย",
          citations: [{ label: "ไปหน้าอัปโหลดไฟล์", kind: "general" }],
        };
      }
      return {
        answer: `เงินสดคงเหลือของคุณตามอัตราการใช้จ่ายปัจจุบัน คาดว่าใช้ได้อีกประมาณ ${months} เดือน (คำนวณด้วยค่าเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ AI ทำนาย และไม่ใช่คำแนะนำการลงทุน)`,
        citations: [{ label: "ดูรายละเอียดการพยากรณ์", kind: "forecast" }],
      };
    },
  },

  // พยากรณ์เดือนหน้า
  {
    keywords: ["เดือนหน้า", "พยากรณ์", "คาดการณ์", "forecast"],
    handle: (ctx) => {
      const f = ctx.forecast;
      if (!f) {
        return {
          answer: "ยังไม่มีข้อมูลพยากรณ์ในระบบครับ — ต้องมีข้อมูลย้อนหลังอย่างน้อยสองสามเดือนก่อนจึงจะพยากรณ์ได้",
          citations: [{ label: "ดูหน้าวิเคราะห์เชิงลึก", kind: "general" }],
        };
      }
      return {
        answer: `กระแสเงินสดสุทธิที่คาดว่าจะเกิดขึ้นเดือน ${formatMonth(f.forecastMonth)} อยู่ที่ประมาณ ${formatTHB(f.predictedNet)} (ช่วงคาดการณ์ ${formatTHB(f.confidenceLow)} – ${formatTHB(f.confidenceHigh)}) คำนวณด้วยค่าเฉลี่ยถ่วงน้ำหนัก + ดัชนีฤดูกาล ไม่ใช่ AI ทำนาย และไม่ใช่คำแนะนำการลงทุน`,
        citations: [{ label: "ดูรายละเอียดการพยากรณ์", kind: "forecast" }],
      };
    },
  },

  // หมวดไหนใช้จ่ายเยอะที่สุด
  {
    keywords: ["หมวดไหน", "ใช้จ่ายเยอะ", "ค่าใช้จ่ายสูงสุด", "อันดับ", "ท็อป", "top"],
    handle: (ctx) => {
      const latest = ctx.months[ctx.months.length - 1];
      if (!latest || latest.topCategories.length === 0) {
        return {
          answer: "ยังไม่มีข้อมูลหมวดค่าใช้จ่ายในเดือนล่าสุดครับ",
          citations: [{ label: "ไปหน้ารายการธุรกรรม", kind: "general" }],
        };
      }
      const top3 = latest.topCategories.slice(0, 3);
      const lines = top3
        .map((c, i) => `${i + 1}. ${c.category} — ${formatTHB(c.totalExpense)} (${c.txCount} รายการ)`)
        .join("\n");
      return {
        answer: `หมวดค่าใช้จ่ายสูงสุดของเดือน ${formatMonth(latest.month)}:\n${lines}`,
        citations: top3.map((c) => ({
          label: `ดูรายการหมวด "${c.category}"`,
          kind: "category",
          category: c.category,
          month: latest.month,
        })),
      };
    },
  },

  // ค่าใช้จ่ายผิดปกติ / ความผิดปกติ / leak
  {
    keywords: ["ผิดปกติ", "แปลกๆ", "พุ่ง", "รั่ว", "leak", "anomaly"],
    handle: (ctx) => {
      if (ctx.diagnostics.length === 0) {
        return {
          answer: "ยังไม่พบความผิดปกติที่สำคัญในข้อมูลล่าสุดครับ — ระบบจะวิเคราะห์ใหม่ทุกครั้งที่มีการอัปโหลดไฟล์เพิ่ม",
          citations: [{ label: "ไปหน้าวิเคราะห์เชิงลึก", kind: "general" }],
        };
      }
      const top = ctx.diagnostics.slice(0, 3);
      const lines = top.map((d) => `• ${d.summary}`).join("\n");
      return {
        answer: `จุดที่น่าสนใจที่พบล่าสุด:\n${lines}`,
        citations: top.map((d) => ({
          label: `ดูรายการหมวด "${d.category}" เดือน ${formatMonth(d.month)}`,
          kind: "category",
          category: d.category,
          month: d.month,
        })),
      };
    },
  },

  // คำแนะนำ / ควรทำอะไรดี
  {
    keywords: ["แนะนำ", "ควรทำ", "ทำอะไรดี", "คำแนะนำ"],
    handle: (ctx) => {
      if (ctx.recommendations.length === 0) {
        return {
          answer: "ตอนนี้ยังไม่มีคำแนะนำที่รอดำเนินการครับ ระบบจะแจ้งทันทีที่เจอจุดที่ควรปรับปรุง",
          citations: [{ label: "ไปหน้าวิเคราะห์เชิงลึก", kind: "general" }],
        };
      }
      const top = ctx.recommendations.slice(0, 3);
      const lines = top.map((r) => `• [${r.priority}] ${r.action}`).join("\n");
      return {
        answer: `คำแนะนำที่รอดำเนินการ:\n${lines}`,
        citations: [{ label: "ดูคำแนะนำทั้งหมด", kind: "recommendation" }],
      };
    },
  },

  // เปรียบเทียบเดือนนี้กับเดือนก่อน
  {
    keywords: ["เปรียบเทียบ", "เดือนก่อน", "เทียบ"],
    handle: (ctx) => {
      const latest = ctx.months[ctx.months.length - 1];
      const prev = ctx.months[ctx.months.length - 2];
      if (!latest || !prev) {
        return {
          answer: "ข้อมูลยังไม่ครบสองเดือน เลยยังเปรียบเทียบไม่ได้ครับ",
          citations: [{ label: "ไปหน้าอัปโหลดไฟล์", kind: "general" }],
        };
      }
      const diff = latest.net - prev.net;
      const diffText = diff >= 0 ? `เพิ่มขึ้น ${formatTHB(diff)}` : `ลดลง ${formatTHB(Math.abs(diff))}`;
      return {
        answer: `${formatMonth(latest.month)}: รายรับ ${formatTHB(latest.totalIncome)}, รายจ่าย ${formatTHB(latest.totalExpense)}, สุทธิ ${formatTHB(latest.net)}\n${formatMonth(prev.month)}: รายรับ ${formatTHB(prev.totalIncome)}, รายจ่าย ${formatTHB(prev.totalExpense)}, สุทธิ ${formatTHB(prev.net)}\n\nสุทธิเดือนนี้${diffText}เมื่อเทียบกับเดือนก่อน`,
        citations: [
          { label: `ดูรายการเดือน ${formatMonth(latest.month)}`, kind: "month", month: latest.month },
          { label: `ดูรายการเดือน ${formatMonth(prev.month)}`, kind: "month", month: prev.month },
        ],
      };
    },
  },

  // สรุปภาพรวมเดือนนี้
  {
    keywords: ["สรุป", "ภาพรวม", "เดือนนี้เป็นยังไง", "รายรับรายจ่าย"],
    handle: (ctx) => {
      const latest = ctx.months[ctx.months.length - 1];
      if (!latest) {
        return {
          answer: "ยังไม่มีข้อมูลการเงินในระบบเลยครับ — อัปโหลดไฟล์ก่อนแล้วผมจะช่วยสรุปให้ได้ทันที",
          citations: [{ label: "ไปหน้าอัปโหลดไฟล์", kind: "general" }],
        };
      }
      return {
        answer: `สรุปเดือน ${formatMonth(latest.month)}: รายรับ ${formatTHB(latest.totalIncome)}, รายจ่าย ${formatTHB(latest.totalExpense)}, สุทธิ ${formatTHB(latest.net)}`,
        citations: [{ label: `ดูรายการเดือน ${formatMonth(latest.month)}`, kind: "month", month: latest.month }],
      };
    },
  },
];

const FALLBACK_REPLY = (ctx: AssistantContext): AssistantReply => {
  const latest = ctx.months[ctx.months.length - 1];
  return {
    answer: [
      "ขออภัยครับ ตอนนี้ผู้ช่วยตอบได้เฉพาะคำถามที่อยู่ในรูปแบบที่กำหนดไว้",
      "ลองถามแบบนี้ได้ครับ:",
      "• เดือนนี้ค่าใช้จ่ายผิดปกติตรงไหนบ้าง?",
      "• หมวดไหนใช้จ่ายเยอะที่สุด 3 อันดับแรก?",
      "• กระแสเงินสดเดือนหน้าน่าจะเป็นยังไง?",
      "• เงินสดที่มีพอใช้ได้อีกกี่เดือน?",
      "• สรุปภาพรวมเดือนนี้",
    ].join("\n"),
    citations: latest
      ? [{ label: `ดูรายการเดือน ${formatMonth(latest.month)}`, kind: "month", month: latest.month }]
      : [{ label: "ไปหน้าอัปโหลดไฟล์", kind: "general" }],
  };
};

/**
 * Match the user's message against keyword-based intents and render a
 * templated reply purely from the governed context. No external calls.
 */
export function generateAssistantReply(message: string, context: AssistantContext): AssistantReply {
  const text = message.toLowerCase();
  const rule = RULES.find((r) => r.keywords.some((kw) => text.includes(kw.toLowerCase())));
  return (rule ?? { handle: FALLBACK_REPLY }).handle(context);
}
