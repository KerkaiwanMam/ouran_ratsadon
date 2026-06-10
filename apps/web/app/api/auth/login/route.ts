import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, makeAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "กรุณากรอกอีเมลและรหัสผ่าน" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // TEMP DEBUG — remove after diagnosing 401 issue
    console.log("[login][debug] DATABASE_URL =", process.env.DATABASE_URL);
    console.log("[login][debug] received email =", JSON.stringify(email));
    console.log("[login][debug] user found =", user ? { id: user.id, email: user.email, hasHash: !!user.passwordHash } : null);
    if (user) {
      const cmp = await bcrypt.compare(password, user.passwordHash ?? "");
      console.log("[login][debug] bcrypt.compare result =", cmp, "received password =", JSON.stringify(password));
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    if (user.banned) {
      return NextResponse.json(
        { error: "ACCOUNT_BANNED", message: "บัญชีนี้ถูกระงับการใช้งาน" },
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const token = await signToken({ sub: user.id, email: user.email, role: user.role });
    const cookie = makeAuthCookie(token);

    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        organization: user.organization,
        createdAt: user.createdAt,
      },
      subscription: sub
        ? {
            plan: sub.plan,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          }
        : null,
    });
    res.cookies.set(cookie);
    return res;
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}
