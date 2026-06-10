"use client";

import { useEffect, useState } from "react";

interface ShareButtonsProps {
  projectId: string;
  projectName: string;
  amount: number;
  changePct: number;
  year?: string;
}

export default function ShareButtons({ projectId, projectName, amount, changePct, year = "2568" }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [showEmbed, setShowEmbed] = useState(false);

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — silently ignore
    }
  }

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://ouran.app";
  const embedSrc = `${appUrl}/embed/project/${projectId}?year=${year}`;
  const embedCode = `<iframe src="${embedSrc}" width="400" height="220" style="border:none;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);" title="${projectName}"></iframe>`;

  async function handleEmbedCopy() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      // clipboard not available — silently ignore
    }
  }

  const tweetText = `โครงการ: ${projectName} วงเงิน ฿${(amount / 1e9).toFixed(2)}B (${changePct > 0 ? "+" : ""}${changePct.toFixed(0)}%) #งบประมาณไทย`;
  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(pageUrl)}`;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCopy}
        className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
      >
        {copied ? "✅ คัดลอกแล้ว!" : "📋 คัดลอก URL"}
      </button>
      <a
        href={tweetHref}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left flex items-center gap-2"
      >
        𝕏 แชร์บน X / Twitter
      </a>

      {/* Embed widget */}
      <button
        onClick={() => setShowEmbed((v) => !v)}
        className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
      >
        {"</>"} Embed widget
      </button>
      {showEmbed && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 space-y-2">
          <p className="text-xs text-gray-500">วาง code นี้ในเว็บของคุณ:</p>
          <textarea
            readOnly
            value={embedCode}
            rows={3}
            className="w-full text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 resize-none focus:outline-none"
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
          <button
            onClick={handleEmbedCopy}
            className="w-full text-xs py-1.5 bg-[#7F77DD] text-white rounded-lg hover:bg-[#534AB7] transition-colors"
          >
            {embedCopied ? "✅ คัดลอกแล้ว!" : "คัดลอก Embed Code"}
          </button>
        </div>
      )}
    </div>
  );
}
