"use client";

import { useState } from "react";
import useSWR from "swr";
import { MessageSquare, Send, Loader2, AlertCircle, CheckCircle2, UserCircle } from "lucide-react";

interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  isGuest: boolean;
}

interface CommentsResponse {
  total: number;
  page: number;
  hasMore: boolean;
  comments: CommentItem[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "เมื่อกี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
  return `${Math.floor(hrs / 24)} วันที่แล้ว`;
}

export default function CommentThread({
  projectId,
  isLoggedIn,
  currentUserName,
}: {
  projectId: string;
  isLoggedIn: boolean;
  currentUserName?: string;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading, mutate } = useSWR<CommentsResponse>(
    `/api/civic/comments?projectId=${encodeURIComponent(projectId)}&page=${page}`,
    fetcher
  );

  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit() {
    if (!body.trim()) return;
    setSubmitMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/civic/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, body, guestName: isLoggedIn ? undefined : guestName }),
      });
      const data = await res.json() as { comment?: { message?: string }; message?: string };

      if (!res.ok) {
        setSubmitMsg({ type: "error", text: data.message ?? "เกิดข้อผิดพลาด" });
      } else {
        setSubmitMsg({ type: "success", text: data.comment?.message ?? "ส่งความคิดเห็นแล้ว" });
        setBody("");
        setGuestName("");
        void mutate();
      }
    } catch {
      setSubmitMsg({ type: "error", text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-[#7F77DD]" />
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
          ความคิดเห็นสาธารณะ
          {data?.total ? (
            <span className="ml-1.5 text-xs font-normal text-gray-400">({data.total})</span>
          ) : null}
        </h3>
      </div>

      {/* Comment form */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-6">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          แสดงความคิดเห็นเกี่ยวกับโครงการนี้ — ความคิดเห็นจะถูกตรวจสอบก่อนเผยแพร่
        </p>

        {/* Guest name field */}
        {!isLoggedIn && (
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="ชื่อของคุณ"
            maxLength={50}
            className="w-full mb-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/40"
          />
        )}

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="คุณคิดว่าโครงการนี้เหมาะสมกับงบประมาณที่ได้รับหรือไม่?..."
          rows={3}
          maxLength={1000}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/40 resize-none"
        />

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{body.length}/1000</span>
          <button
            onClick={handleSubmit}
            disabled={submitting || !body.trim() || (!isLoggedIn && !guestName.trim())}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#7F77DD] text-white rounded-lg text-sm font-medium hover:bg-[#534AB7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            ส่งความคิดเห็น
          </button>
        </div>

        {submitMsg && (
          <div
            className={`flex items-center gap-1.5 mt-2 text-xs ${
              submitMsg.type === "success"
                ? "text-green-600 dark:text-green-400"
                : "text-red-500"
            }`}
          >
            {submitMsg.type === "success" ? (
              <CheckCircle2 size={13} />
            ) : (
              <AlertCircle size={13} />
            )}
            {submitMsg.text}
          </div>
        )}
      </div>

      {/* Comment list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <Loader2 size={14} className="animate-spin" />
          โหลดความคิดเห็น…
        </div>
      ) : !data?.comments?.length ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
          ยังไม่มีความคิดเห็น — เป็นคนแรกที่แสดงความคิดเห็น
        </p>
      ) : (
        <div className="space-y-4">
          {data.comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              {/* Avatar */}
              <div className="shrink-0 w-8 h-8 rounded-full bg-[#7F77DD]/15 flex items-center justify-center text-xs font-bold text-[#7F77DD]">
                {c.authorAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.authorAvatar} alt={c.authorName} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  c.authorName.slice(0, 1).toUpperCase()
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {c.authorName}
                  </span>
                  {c.isGuest && (
                    <span className="text-[10px] text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5">
                      Guest
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                  {c.body}
                </p>
              </div>
            </div>
          ))}

          {/* Load more */}
          {data.hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-2.5 text-sm text-[#7F77DD] hover:underline font-medium"
            >
              โหลดความคิดเห็นเพิ่มเติม ↓
            </button>
          )}
        </div>
      )}
    </div>
  );
}
