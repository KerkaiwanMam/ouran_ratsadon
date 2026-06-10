/**
 * LINE Notify integration for Business Layer alerts.
 *
 * LINE Notify lets users connect their personal LINE account and receive
 * messages directly from the platform. Each user stores their own
 * LINE Notify access token in the `lineNotifyToken` column on the User model.
 *
 * Gracefully no-ops when:
 *  - The user has no lineNotifyToken stored
 *  - The LINE Notify API returns any error (token revoked, rate limit, etc.)
 *
 * LINE Notify API docs: https://notify-bot.line.me/doc/en/
 *
 * Environment variables: none required — each user supplies their own token.
 */

export interface LineNotifyInput {
  /** The user's personal LINE Notify access token */
  token: string;
  /** Message body (max 1000 chars) */
  message: string;
  /** Optional image URL — appended as an image sticker in chat */
  imageUrl?: string;
}

/**
 * Send a LINE Notify message to a user.
 * Returns true on success, false on any error (silently).
 */
export async function sendLineNotify(input: LineNotifyInput): Promise<boolean> {
  const { token, message } = input;
  if (!token?.trim()) return false;

  // Truncate to LINE Notify's 1000-char limit
  const body = message.slice(0, 1000);

  const params = new URLSearchParams({ message: body });
  if (input.imageUrl) {
    params.set("imageFullsize", input.imageUrl);
    params.set("imageThumbnail", input.imageUrl);
  }

  try {
    const res = await fetch("https://notify-api.line.me/api/notify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[line-notify] API error ${res.status}: ${text}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[line-notify] Network error:", err);
    return false;
  }
}


// ─── Alert helpers ────────────────────────────────────────────────────────────

export interface AlertLineInput {
  token: string;
  title: string;
  message: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  ctaUrl?: string;
}

/**
 * Send a formatted alert via LINE Notify.
 *
 * Format:
 *   🚨 [CRITICAL] Cash flow warning
 *   ยอดเงินสดต่ำกว่าเกณฑ์...
 *   → ดูรายละเอียด: https://...
 */
export async function sendAlertLineNotify(input: AlertLineInput): Promise<boolean> {
  const icon =
    input.severity === "CRITICAL" ? "🚨" :
    input.severity === "WARNING"  ? "⚠️" : "ℹ️";

  const severityLabel =
    input.severity === "CRITICAL" ? "วิกฤต" :
    input.severity === "WARNING"  ? "แจ้งเตือน" : "ข้อมูล";

  let msg = `${icon} [${severityLabel}] ${input.title}\n${input.message}`;
  if (input.ctaUrl) {
    msg += `\n→ ดูรายละเอียด: ${input.ctaUrl}`;
  }

  return sendLineNotify({ token: input.token, message: msg });
}
