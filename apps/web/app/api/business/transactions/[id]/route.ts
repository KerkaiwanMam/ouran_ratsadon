import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { recomputeMonthlySummary } from "@/lib/analytics/summary";
import { recomputeDiagnosticInsights } from "@/lib/analytics/diagnose";
import { recomputeRecommendations } from "@/lib/analytics/recommend";

// Strip digits (dates, ref numbers) and collapse whitespace so the rule
// matches the same vendor/description across months, not just this exact row.
function deriveKeyword(description: string): string {
  const stripped = description.replace(/[0-9]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  // Too short to be a useful pattern (would match almost everything) — fall
  // back to the full normalized description.
  if (stripped.length < 3) return description.trim().toLowerCase();
  return stripped;
}

// PATCH /api/business/transactions/[id]
// Override a transaction's category. The new category is also learned as a
// CategoryRule (keyword derived from the description) so future uploads
// auto-categorize this vendor/description correctly — see
// docs/business_model_features_roadmap_v2.html "Category override + CategoryRule".
// Body: { category: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const category = typeof body?.category === "string" ? body.category.trim() : "";

  if (!category) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "กรุณาระบุหมวดหมู่" },
      { status: 400 }
    );
  }

  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx || tx.userId !== auth.userId) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "ไม่พบรายการนี้" },
      { status: 404 }
    );
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: { category, userOverrode: true, autoCategorized: false },
  });

  // Learn this correction: upsert a CategoryRule keyed on a normalized
  // keyword from the description. No @@unique([userId, keyword]) exists, so
  // find-then-write rather than prisma upsert.
  const keyword = deriveKeyword(tx.description);
  const existingRule = await prisma.categoryRule.findFirst({
    where: { userId: auth.userId, keyword },
  });
  if (existingRule) {
    await prisma.categoryRule.update({
      where: { id: existingRule.id },
      data: { category, usageCount: existingRule.usageCount + 1, priority: existingRule.priority + 1 },
    });
  } else {
    await prisma.categoryRule.create({
      data: { userId: auth.userId, keyword, category, usageCount: 1, priority: 1 },
    });
  }

  // Refresh dependent analytics — non-fatal if it fails, the response below
  // already reflects the change and dashboards lazily recompute on read.
  try {
    await recomputeMonthlySummary(auth.userId);
    await recomputeDiagnosticInsights(auth.userId);
    await recomputeRecommendations(auth.userId);
  } catch (err) {
    console.error("analytics recompute failed after category override:", err);
  }

  return NextResponse.json({
    transaction: {
      ...updated,
      amount: Number(updated.amount),
      date: updated.date.toISOString().slice(0, 10),
    },
  });
}
