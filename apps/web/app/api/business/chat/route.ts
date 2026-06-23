import { NextRequest, NextResponse } from "next/server";
import { verifyTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assembleAssistantContext } from "@/lib/assistant/context";
import { generateAssistantReply, toHrefCitations } from "@/lib/assistant/rules";

// POST /api/business/chat — Phase 3 conversational assistant (Pro).
//
// 3-layer "AI-on-Top" model, server side of Layer 3:
//   • Layer 1 (Shared Truth) — replies are generated ONLY from governed
//     aggregates assembled in lib/assistant/context.ts. No raw Transaction
//     rows are ever touched here (PDPA + anti-hallucination).
//   • Layer 2 (Evidence) — every reply carries citations turned into
//     drill-down hrefs to /transactions (or /analytics for forecasts), so
//     every claim is verifiable against the real rows.
//
// Replies are produced by a zero-cost rule-based engine (lib/assistant/rules.ts)
// — no external LLM call, no API key, no token cost. A free-tier LLM for
// free-form Q&A is a possible later phase (see docs/roadmap.md).

export const runtime = "nodejs";

const MAX_MESSAGE_CHARS = 1000;

export async function POST(req: NextRequest) {
  const payload = await verifyTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" },
      { status: 401 }
    );
  }

  // Pro-only feature gate (same shape as /api/business/vendors)
  const sub = await prisma.subscription.findUnique({ where: { userId: payload.sub } });
  const isPro =
    sub &&
    (sub.plan === "PRO" || sub.plan === "TEAM") &&
    (sub.status === "ACTIVE" || sub.status === "TRIAL");

  if (!isPro) {
    return NextResponse.json(
      { error: "PLAN_REQUIRED", message: "ผู้ช่วย AI สำหรับสมาชิก Pro ขึ้นไปเท่านั้น" },
      { status: 403 }
    );
  }

  let body: { message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "กรุณาพิมพ์คำถาม" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: `คำถามยาวเกินไป (สูงสุด ${MAX_MESSAGE_CHARS} ตัวอักษร)` },
      { status: 400 }
    );
  }

  const context = await assembleAssistantContext(payload.sub);

  // No data yet → answer deterministically.
  if (context.months.length === 0) {
    return NextResponse.json({
      answer:
        "ยังไม่มีข้อมูลการเงินในระบบเลยครับ — อัปโหลดไฟล์รายรับรายจ่ายก่อน แล้วผมจะช่วยวิเคราะห์ให้ได้ทันที",
      citations: [{ label: "ไปหน้าอัปโหลดไฟล์", href: "/upload" }],
    });
  }

  const reply = generateAssistantReply(message, context);
  return NextResponse.json({ answer: reply.answer, citations: toHrefCitations(reply.citations) });
}
