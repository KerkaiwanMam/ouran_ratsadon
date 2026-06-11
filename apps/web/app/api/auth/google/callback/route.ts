import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { signToken, makeAuthCookie } from "@/lib/auth";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const REDIRECT_URI = `${APP_URL}/api/auth/google/callback`;

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

async function exchangeCode(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Failed to exchange code");
  return res.json();
}

async function fetchGoogleUser(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch user info");
  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_invalid`);
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  cookieStore.delete("oauth_state");

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_state_mismatch`);
  }

  try {
    const tokens = await exchangeCode(code);
    const googleUser = await fetchGoogleUser(tokens.access_token);

    if (!googleUser.email_verified) {
      return NextResponse.redirect(`${APP_URL}/login?error=email_not_verified`);
    }

    // Upsert: find by googleId → then by email → else create
    let user = await prisma.user.findUnique({ where: { googleId: googleUser.sub } });

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingByEmail) {
        // Link Google to existing email/password account
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: googleUser.sub,
            avatarUrl: existingByEmail.avatarUrl ?? googleUser.picture,
            emailVerified: existingByEmail.emailVerified ?? new Date(),
          },
        });
      } else {
        // New user via Google — start 14-day Pro trial
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            googleId: googleUser.sub,
            avatarUrl: googleUser.picture,
            emailVerified: new Date(),
            subscription: {
              create: { plan: "PRO", status: "TRIAL", trialEndsAt },
            },
          },
        });
      }
    }

    if (user.banned) {
      return NextResponse.redirect(`${APP_URL}/login?error=account_banned`);
    }

    const token = await signToken({ sub: user.id, email: user.email, role: user.role });
    const cookie = makeAuthCookie(token);

    // Return to the page that required login (set by /api/auth/google from
    // /login?next=…) — relative paths only, validated again here.
    const savedNext = cookieStore.get("oauth_next")?.value;
    cookieStore.delete("oauth_next");
    const dest =
      savedNext && savedNext.startsWith("/") && !savedNext.startsWith("//")
        ? savedNext
        : "/dashboard";

    const res = NextResponse.redirect(`${APP_URL}${dest}`);
    res.cookies.set(cookie);
    return res;
  } catch (err) {
    console.error("[google-callback]", err);
    return NextResponse.redirect(`${APP_URL}/login?error=oauth_failed`);
  }
}
