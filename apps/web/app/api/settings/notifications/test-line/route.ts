import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { sendLineNotify } from "@/lib/line-notify";

/**
 * POST /api/settings/notifications/test-line
 * Sends a test LINE Notify message to the authenticated user.
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { lineNotifyToken: true },
  });

  if (!user?.lineNotifyToken) {
    return NextResponse.json(
      { error: "NOT_CONFIGURED", message: "ยังไม่ได้ตั้งค่า LINE Notify Token" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const ok = await sendLineNotify({
    token: user.lineNotifyToken,
    message: [
      "✅ ทดสอบการแจ้งเตือน — ouran_ratsadon",
      `สวัสดี ${auth.name} 👋`,
      "การเชื่อมต่อ LINE Notify ทำงานปกติแล้ว",
      `→ ไปที่แดชบอร์ด: ${appUrl}/dashboard`,
    ].join("\n"),
  });

  if (!ok) {
    return NextResponse.json(
      { error: "SEND_FAILED", message: "ส่งข้อความไม่สำเร็จ — กรุณาตรวจสอบ Token แล้วลองใหม่" },
      { status: 502 }
    );
  }

  return NextResponse.json({ message: "ส่งข้อความทดสอบสำเร็จ — ตรวจสอบใน LINE ของคุณ" });
}
