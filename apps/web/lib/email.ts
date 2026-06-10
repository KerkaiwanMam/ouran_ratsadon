// Email delivery via Resend (https://resend.com).
// Gracefully no-ops when RESEND_API_KEY is unset so dev/CI environments
// don't need the key configured.
//
// Install: npm install resend  (in apps/web)

let ResendClass: typeof import("resend").Resend | null = null;

async function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!ResendClass) {
    try {
      const mod = await import("resend");
      ResendClass = mod.Resend;
    } catch {
      // resend package not installed — skip silently
      return null;
    }
  }
  return new ResendClass(process.env.RESEND_API_KEY);
}

const FROM_ADDRESS =
  process.env.ALERT_FROM_EMAIL ?? "alerts@ouran.app";

export interface AlertEmailInput {
  to: string;
  subject: string;
  title: string;
  message: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  ctaUrl?: string;
  ctaLabel?: string;
}

function severityColor(severity: AlertEmailInput["severity"]) {
  if (severity === "CRITICAL") return "#DC2626";
  if (severity === "WARNING") return "#D97706";
  return "#2563EB";
}

function buildHtml(input: AlertEmailInput): string {
  const color = severityColor(input.severity);
  const badge =
    input.severity === "CRITICAL"
      ? "🚨 วิกฤต"
      : input.severity === "WARNING"
      ? "⚠️ แจ้งเตือน"
      : "ℹ️ ข้อมูล";

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family: -apple-system, 'Sarabun', sans-serif; background: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .header { background: ${color}; padding: 20px 24px; }
    .header h1 { color: #fff; margin: 0; font-size: 18px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px; }
    .body { padding: 24px; }
    .message { font-size: 15px; color: #374151; line-height: 1.6; margin: 0 0 20px; }
    .cta { display: inline-block; background: ${color}; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${badge} ${input.title}</h1>
      <p>ouran_ratsadon — Business Intelligence Platform</p>
    </div>
    <div class="body">
      <p class="message">${input.message}</p>
      ${
        input.ctaUrl
          ? `<a href="${input.ctaUrl}" class="cta">${input.ctaLabel ?? "ดูรายละเอียด"}</a>`
          : ""
      }
    </div>
    <div class="footer">
      คุณได้รับอีเมลนี้เพราะเปิดใช้งานการแจ้งเตือน · <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings/notifications" style="color:#7F77DD">จัดการการแจ้งเตือน</a>
    </div>
  </div>
</body>
</html>`;
}

// ─── Workspace invite email ───────────────────────────────────────────────────

export interface WorkspaceInviteInput {
  toEmail:       string;
  workspaceName: string;
  inviteToken:   string;
  inviterName:   string;
}

export async function sendWorkspaceInviteEmail(input: WorkspaceInviteInput): Promise<void> {
  const resend = await getResend();
  if (!resend) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const acceptUrl = `${appUrl}/workspace/join?token=${input.inviteToken}`;

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family: -apple-system, 'Sarabun', sans-serif; background: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .header { background: #7F77DD; padding: 20px 24px; }
    .header h1 { color: #fff; margin: 0; font-size: 18px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 13px; }
    .body { padding: 24px; font-size: 15px; color: #374151; line-height: 1.6; }
    .cta { display: inline-block; background: #7F77DD; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 16px; }
    .footer { padding: 16px 24px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤝 คุณได้รับเชิญเข้า Workspace</h1>
      <p>ouran_ratsadon — Business Intelligence Platform</p>
    </div>
    <div class="body">
      <p><strong>${input.inviterName}</strong> ได้เชิญคุณเข้าร่วม Workspace <strong>${input.workspaceName}</strong></p>
      <p>คลิกปุ่มด้านล่างเพื่อยอมรับคำเชิญ (ลิงก์หมดอายุใน 7 วัน)</p>
      <a href="${acceptUrl}" class="cta">ยอมรับคำเชิญ</a>
      <p style="margin-top:16px;font-size:13px;color:#6b7280;">หากไม่คาดว่าจะได้รับอีเมลนี้ สามารถเพิกเฉยได้เลย</p>
    </div>
    <div class="footer">ouran_ratsadon · <a href="${appUrl}" style="color:#7F77DD">ouran.app</a></div>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.toEmail,
      subject: `คำเชิญเข้า Workspace "${input.workspaceName}" บน ouran_ratsadon`,
      html,
    });
  } catch (err) {
    console.error("[email] Failed to send workspace invite:", err);
  }
}

// ─── Alert email ──────────────────────────────────────────────────────────────

/** Send a transactional alert email.
 *  Silently returns without error when RESEND_API_KEY is absent or the
 *  resend package is not installed (e.g. local dev, CI, portfolio review).
 */
export async function sendAlertEmail(input: AlertEmailInput): Promise<void> {
  const resend = await getResend();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: buildHtml(input),
    });
  } catch (err) {
    // Email failures must never crash the main request — log and continue.
    console.error("[email] Failed to send alert email:", err);
  }
}
