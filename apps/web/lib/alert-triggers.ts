// Alert trigger helpers — called from API routes after data-changing operations.
// Creates both in-app Alert records and (for CRITICAL/WARNING) sends email via
// Resend when RESEND_API_KEY is configured. Email is best-effort: failures are
// logged but never propagate to the caller.

import type { AlertType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendAlertEmail } from "@/lib/email";
import { sendAlertLineNotify } from "@/lib/line-notify";

interface AlertInput {
  userId: string;
  type: AlertType;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  fileId?: string;
  transactionId?: string;
  context?: Record<string, unknown>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function createAlert(input: AlertInput): Promise<void> {
  await prisma.alert.create({
    data: {
      userId: input.userId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      fileId: input.fileId,
      transactionId: input.transactionId,
      context: input.context ? JSON.stringify(input.context) : undefined,
    },
  });

  // Send email + LINE Notify for CRITICAL and WARNING alerts (best-effort)
  if (input.severity === "CRITICAL" || input.severity === "WARNING") {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, lineNotifyToken: true },
    }).catch(() => null);

    if (user?.email) {
      void sendAlertEmail({
        to: user.email,
        subject: `[ouran] ${input.title}`,
        title: input.title,
        message: input.message,
        severity: input.severity,
        ctaUrl: `${APP_URL}/dashboard`,
        ctaLabel: "ไปที่แดชบอร์ด",
      });
    }

    if (user?.lineNotifyToken) {
      void sendAlertLineNotify({
        token: user.lineNotifyToken,
        title: input.title,
        message: input.message,
        severity: input.severity,
        ctaUrl: `${APP_URL}/dashboard`,
      });
    }
  }
}

/** Called after upload completes — creates alerts for critical leaks found. */
export async function triggerLeakAlerts(
  userId: string,
  fileId: string,
  criticalCount: number,
  warningCount: number
): Promise<void> {
  if (criticalCount > 0) {
    await createAlert({
      userId,
      fileId,
      type: "NEW_LEAK",
      severity: "CRITICAL",
      title: "พบรายการผิดปกติระดับวิกฤต",
      message: `พบ ${criticalCount} รายการที่ต้องตรวจสอบด่วน หลังจากอัปโหลดไฟล์ใหม่`,
      context: { criticalCount, warningCount },
    });
  } else if (warningCount > 0) {
    await createAlert({
      userId,
      fileId,
      type: "NEW_LEAK",
      severity: "WARNING",
      title: "พบรายการที่ควรตรวจสอบ",
      message: `พบ ${warningCount} รายการที่อาจผิดปกติ หลังจากอัปโหลดไฟล์ใหม่`,
      context: { criticalCount, warningCount },
    });
  }
}

/** Called after forecast — creates alert if runway is low. */
export async function triggerRunwayAlert(
  userId: string,
  runway: number
): Promise<void> {
  if (runway > 3) return;

  // Don't create a duplicate if we already alerted about low runway recently
  const recent = await prisma.alert.findFirst({
    where: {
      userId,
      type: "LOW_RUNWAY",
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) return;

  await createAlert({
    userId,
    type: "LOW_RUNWAY",
    severity: runway <= 1 ? "CRITICAL" : "WARNING",
    title: `Cash Runway เหลือ ${runway} เดือน`,
    message:
      runway <= 1
        ? "เงินสดกำลังจะหมดภายใน 1 เดือน — ดำเนินการโดยด่วน"
        : `คาดว่าเงินสดจะเพียงพอสำหรับ ${runway} เดือน — ควรวางแผนรายรับเพิ่มเติม`,
    context: { runway },
  });
}

/** Called when a category exceeds its budget target. */
export async function triggerOverBudgetAlert(
  userId: string,
  category: string,
  actual: number,
  budget: number
): Promise<void> {
  const overPct = Math.round(((actual - budget) / budget) * 100);

  // Deduplicate: skip if we already alerted for this category this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const recent = await prisma.alert.findFirst({
    where: {
      userId,
      type: "OVER_BUDGET",
      createdAt: { gte: monthStart },
      message: { contains: category },
    },
  });
  if (recent) return;

  await createAlert({
    userId,
    type: "OVER_BUDGET",
    severity: overPct > 30 ? "CRITICAL" : "WARNING",
    title: `เกินงบหมวด${category}`,
    message: `ค่าใช้จ่ายหมวด${category} เกินงบที่ตั้งไว้ ${overPct}%`,
    context: { category, actual, budget, overPct },
  });
}

/**
 * Compares the current month's category spend against the user's Budget
 * targets (month-specific overrides the standing/all-months budget, same
 * precedence as /api/business/dashboard) and fires triggerOverBudgetAlert
 * for every category that's over. Safe to call repeatedly — dedup happens
 * inside triggerOverBudgetAlert.
 */
export async function checkOverBudgetAlerts(userId: string): Promise<void> {
  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [transactions, budgets] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, transactionType: "EXPENSE", date: { gte: monthStart, lt: monthEnd } },
      select: { category: true, amount: true },
    }),
    prisma.budget.findMany({ where: { userId, OR: [{ month: monthKey }, { month: null }] } }),
  ]);
  if (transactions.length === 0 || budgets.length === 0) return;

  const totals = new Map<string, number>();
  for (const t of transactions) {
    totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(Number(t.amount)));
  }

  // Standing (month: null) budgets first, month-specific overrides win.
  const budgetMap = new Map<string, number>();
  for (const b of budgets.filter((b) => b.month === null)) budgetMap.set(b.category, Number(b.amount));
  for (const b of budgets.filter((b) => b.month !== null)) budgetMap.set(b.category, Number(b.amount));

  for (const [category, actual] of totals) {
    const budget = budgetMap.get(category);
    if (budget && actual > budget) {
      await triggerOverBudgetAlert(userId, category, actual, budget);
    }
  }
}
