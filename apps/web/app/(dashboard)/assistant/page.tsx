"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Loader2,
  ArrowUpRight,
  Zap,
  ShieldCheck,
} from "lucide-react";

// Phase 3 — Conversational AI assistant (Pro). The user-facing top of the
// 3-layer model: ask in natural Thai, get an answer grounded in governed data
// with drill-down citations (Layer 2 verification). The page never touches raw
// data or the model directly — it POSTs the question to /api/business/chat.

interface Citation {
  label: string;
  href: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isWelcome?: boolean;
  isError?: boolean;
}

type Gate = "ok" | "upsell";

const WELCOME: ChatMsg = {
  role: "assistant",
  isWelcome: true,
  content:
    "สวัสดีครับ ผมคือผู้ช่วยวิเคราะห์การเงินของคุณ ถามได้เลยเกี่ยวกับรายรับ-รายจ่าย แนวโน้ม หรือจุดที่ควรระวัง — ทุกคำตอบอ้างอิงข้อมูลที่คุณอัปโหลดไว้จริง และมีลิงก์ให้กดตรวจสอบได้",
};

const SUGGESTIONS = [
  "เดือนนี้ค่าใช้จ่ายผิดปกติตรงไหนบ้าง?",
  "หมวดไหนใช้จ่ายเยอะที่สุด 3 อันดับแรก?",
  "กระแสเงินสดเดือนหน้าน่าจะเป็นยังไง?",
  "เงินสดที่มีพอใช้ได้อีกกี่เดือน?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [gate, setGate] = useState<Gate>("ok");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;

    const nextMsgs: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(nextMsgs);
    setInput("");
    setLoading(true);

    // Only real conversation turns become history — skip the static welcome and
    // any prior error bubbles so the model gets a clean transcript.
    const history = messages
      .filter((m) => !m.isWelcome && !m.isError)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/business/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) setGate("upsell");
        setMessages([
          ...nextMsgs,
          { role: "assistant", content: data?.message ?? "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง", isError: true },
        ]);
        return;
      }

      setMessages([
        ...nextMsgs,
        { role: "assistant", content: data.answer, citations: data.citations ?? [] },
      ]);
    } catch {
      setMessages([
        ...nextMsgs,
        { role: "assistant", content: "เชื่อมต่อไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่", isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const showSuggestions = messages.length === 1 && gate === "ok";

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-3rem)]">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="shrink-0 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-accent text-white shrink-0">
            <Sparkles size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">ผู้ช่วย AI</h1>
              <span className="text-[10px] font-bold bg-[#7F77DD] text-white px-1.5 py-0.5 rounded-full leading-none">
                PRO
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ถามเรื่องการเงินธุรกิจของคุณ — คำตอบอ้างอิงข้อมูลจริง ตรวจสอบได้
            </p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
          <ShieldCheck size={13} className="shrink-0 text-emerald-500" aria-hidden="true" />
          ใช้เฉพาะข้อมูลสรุปที่อยู่ในระบบ (ไม่ส่งรายการดิบออกนอกเซิร์ฟเวอร์) · พยากรณ์ใช้ค่าเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ AI ทำนาย
        </p>
      </header>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-5 space-y-5">
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}

        {loading && (
          <div className="flex items-start gap-2.5">
            <AssistantAvatar />
            <div className="surface-glass rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={16} className="animate-spin text-accent" aria-hidden="true" />
            </div>
          </div>
        )}

        {showSuggestions && (
          <div className="flex flex-wrap gap-2 pl-10">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="text-xs text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 hover:border-accent hover:text-accent transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Composer / gates ─────────────────────────────────────────────── */}
      <div className="shrink-0 pt-3 border-t border-gray-100 dark:border-gray-800">
        {gate === "upsell" ? (
          <UpsellCard />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="พิมพ์คำถามเกี่ยวกับการเงินของคุณ..."
              className="flex-1 resize-none max-h-32 px-4 py-3 text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/30 placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="ส่งคำถาม"
              className="flex items-center justify-center w-11 h-11 shrink-0 rounded-2xl bg-gradient-accent text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity cursor-pointer"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <Send size={18} aria-hidden="true" />
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────

function AssistantAvatar() {
  return (
    <span
      className="flex items-center justify-center w-7 h-7 shrink-0 rounded-lg bg-gradient-accent text-white mt-0.5"
      aria-hidden="true"
    >
      <Sparkles size={15} />
    </span>
  );
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-[#7F77DD] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <AssistantAvatar />
      <div className="max-w-[85%] min-w-0">
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
            msg.isError
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              : "surface-glass text-gray-800 dark:text-gray-100"
          }`}
        >
          {msg.content}
        </div>

        {msg.citations && msg.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {msg.citations.map((c, i) => (
              <Link
                key={i}
                href={c.href}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-accent border border-accent/30 hover:bg-accent/10 rounded-full px-2.5 py-1 transition-colors"
              >
                {c.label}
                <ArrowUpRight size={11} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UpsellCard() {
  return (
    <div className="relative overflow-hidden surface-glass rounded-2xl px-5 py-4">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-accent" aria-hidden="true" />
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-accent/10 text-accent">
          <Zap size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            ผู้ช่วย AI เป็นฟีเจอร์สำหรับสมาชิก Pro
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
            อัปเกรดเพื่อถาม-ตอบข้อมูลการเงินของคุณแบบเจาะลึก พร้อมลิงก์ตรวจสอบทุกคำตอบ
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-accent rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
          >
            อัปเกรดเป็น Pro
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
