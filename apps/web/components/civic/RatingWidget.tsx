"use client";

import { useState } from "react";
import useSWR from "swr";
import { ThumbsUp, ThumbsDown, Minus, Loader2 } from "lucide-react";

type Vote = "too_high" | "appropriate" | "too_low";

interface RatingResponse {
  projectId: string;
  total: number;
  counts: { too_high: number; appropriate: number; too_low: number };
  myVote?: Vote;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const VOTE_OPTIONS: { value: Vote; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "too_high", label: "งบสูงเกินไป", icon: <ThumbsDown size={14} />, color: "text-red-500" },
  { value: "appropriate", label: "เหมาะสม", icon: <ThumbsUp size={14} />, color: "text-emerald-500" },
  { value: "too_low", label: "งบน้อยเกินไป", icon: <Minus size={14} />, color: "text-amber-500" },
];

interface Props {
  projectId: string;
}

export default function RatingWidget({ projectId }: Props) {
  const [myVote, setMyVote] = useState<Vote | null>(null);
  const [voting, setVoting] = useState(false);

  const { data, mutate } = useSWR<RatingResponse>(
    `/api/civic/project/${projectId}/rating`,
    fetcher
  );

  async function handleVote(vote: Vote) {
    if (voting) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/civic/project/${projectId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMyVote(vote);
        mutate(updated, false);
      }
    } finally {
      setVoting(false);
    }
  }

  const total = data?.total ?? 0;
  const counts = data?.counts ?? { too_high: 0, appropriate: 0, too_low: 0 };

  // Dominant opinion for the summary text
  const dominant = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
  const dominantPct = total > 0 ? Math.round((dominant[1] / total) * 100) : 0;
  const dominantLabel = VOTE_OPTIONS.find((o) => o.value === dominant[0])?.label ?? "";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
        ให้คะแนนโครงการนี้
      </h3>
      <p className="text-xs text-gray-400 mb-3">
        คุณคิดว่าโครงการนี้ควรได้รับงบประมาณนี้หรือไม่?
      </p>

      {/* Vote buttons */}
      <div className="flex gap-2 mb-4">
        {VOTE_OPTIONS.map((opt) => {
          const isSelected = myVote === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleVote(opt.value)}
              disabled={voting}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                isSelected
                  ? "border-[#7F77DD] bg-[#7F77DD]/10 text-[#7F77DD]"
                  : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400"
              } disabled:opacity-60`}
            >
              {voting && isSelected ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <span className={isSelected ? "text-[#7F77DD]" : opt.color}>{opt.icon}</span>
              )}
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Result bars */}
      {total > 0 && (
        <div className="space-y-2">
          {VOTE_OPTIONS.map((opt) => {
            const count = counts[opt.value] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={opt.value}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-500">{opt.label}</span>
                  <span className="text-gray-400">{pct}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-[#7F77DD] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-gray-400 mt-2 text-center">
            {dominantPct}% ของผู้โหวต ({total.toLocaleString()} คน) เห็นว่า{dominantLabel}
          </p>
        </div>
      )}

      {total === 0 && (
        <p className="text-xs text-center text-gray-400">
          ยังไม่มีการโหวต — เป็นคนแรกที่แสดงความเห็น
        </p>
      )}
    </div>
  );
}
