"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Eye,
  Loader2,
} from "lucide-react";

interface CommentRow {
  id: string;
  projectId: string;
  body: string;
  status: "VISIBLE" | "PENDING_REVIEW" | "REJECTED";
  createdAt: string;
  authorName: string;
  isGuest: boolean;
}

interface CommentsAdminResponse {
  total: number;
  pending: number;
  comments: CommentRow[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const STATUS_LABELS = {
  VISIBLE:        { label: "เผยแพร่", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  PENDING_REVIEW: { label: "รอตรวจ",  color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
  REJECTED:       { label: "ปฏิเสธ", color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
};

export default function AdminCommentsPage() {
  const [filter, setFilter] = useState<"ALL" | "PENDING_REVIEW" | "VISIBLE" | "REJECTED">("PENDING_REVIEW");
  const [page, setPage] = useState(1);

  const { data, isLoading, mutate } = useSWR<CommentsAdminResponse>(
    `/api/admin/comments?status=${filter}&page=${page}`,
    fetcher
  );

  async function moderate(id: string, action: "approve" | "reject") {
    await fetch(`/api/admin/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    void mutate();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Comment Moderation
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.pending ?? 0} รายการรอตรวจสอบ
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
        {(["PENDING_REVIEW", "VISIBLE", "REJECTED", "ALL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {f === "PENDING_REVIEW" ? "รอตรวจ" : f === "VISIBLE" ? "เผยแพร่" : f === "REJECTED" ? "ปฏิเสธ" : "ทั้งหมด"}
            {f === "PENDING_REVIEW" && data?.pending ? (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {data.pending > 99 ? "99+" : data.pending}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
          <Loader2 size={16} className="animate-spin" />
          โหลด…
        </div>
      ) : !data?.comments?.length ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare size={32} className="mx-auto mb-3 opacity-40" />
          <p>ไม่มีความคิดเห็นในหมวดนี้</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                {["ผู้แสดงความคิดเห็น", "ความคิดเห็น", "โครงการ", "สถานะ", "เวลา", "การดำเนินการ"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.comments.map((c) => {
                const s = STATUS_LABELS[c.status];
                return (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {c.authorName}
                      {c.isGuest && (
                        <span className="ml-1 text-[10px] text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1">Guest</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="line-clamp-2 text-gray-600 dark:text-gray-300">{c.body}</p>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/project/${encodeURIComponent(c.projectId)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#7F77DD] hover:underline flex items-center gap-0.5 text-xs"
                      >
                        <Eye size={11} />
                        ดูโครงการ
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      <Clock size={11} className="inline mr-0.5" />
                      {timeAgo(c.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.status !== "VISIBLE" && (
                          <button
                            onClick={() => moderate(c.id, "approve")}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                          >
                            <CheckCircle2 size={13} />
                            อนุมัติ
                          </button>
                        )}
                        {c.status !== "REJECTED" && (
                          <button
                            onClick={() => moderate(c.id, "reject")}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
                          >
                            <XCircle size={13} />
                            ปฏิเสธ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
