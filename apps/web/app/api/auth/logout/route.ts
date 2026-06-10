import { NextResponse } from "next/server";
import { makeLogoutCookie } from "@/lib/auth";

export function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(makeLogoutCookie());
  return res;
}
