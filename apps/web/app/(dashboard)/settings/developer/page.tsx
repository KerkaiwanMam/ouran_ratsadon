"use client";

import { useState, useEffect } from "react";
import { Code2, Plus, Trash2, Copy, CheckCircle2, Loader2, Eye, EyeOff, Shield } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface NewKeyData extends ApiKey {
  plaintext: string;
}

const SCOPE_LABELS: Record<string, string> = {
  "read:files":   "อ่าน Files",
  "read:reports": "อ่าน Reports",
  "read:alerts":  "อ่าน Alerts",
  "write:files":  "อัปโหลด Files",
};

const ALL_SCOPES = Object.keys(SCOPE_LABELS);

export default function DeveloperSettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read:files", "read:reports"]);
  const [creating, setCreating] = useState(false);

  // New key reveal
  const [newKey, setNewKey] = useState<NewKeyData | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealKey, setRevealKey] = useState(false);

  // Revoke
  const [revoking, setRevoking] = useState<string | null>(null);

  // Error/success
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/developer/keys")
      .then((r) => r.json())
      .then((d) => { setKeys(d.keys ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function createKey() {
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/developer/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), scopes: selectedScopes }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(json.message ?? "เกิดข้อผิดพลาด");
      return;
    }
    setNewKey(json.key as NewKeyData);
    setKeys((prev) => [json.key, ...prev]);
    setShowCreate(false);
    setName("");
    setSelectedScopes(["read:files", "read:reports"]);
  }

  async function revokeKey(id: string) {
    setRevoking(id);
    await fetch(`/api/developer/keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setRevoking(null);
  }

  async function copyKey(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(s: string | null) {
    if (!s) return null;
    return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Code2 size={22} />
            API Access
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            สร้าง API key เพื่อเชื่อมต่อกับระบบภายนอก (ต้องการแผน Pro หรือ Team)
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 bg-[#7F77DD] text-white rounded-lg hover:bg-[#6B63CC] transition-colors"
          >
            <Plus size={14} />
            สร้าง Key
          </button>
        )}
      </div>

      {/* New key banner */}
      {newKey && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-600 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={18} className="text-green-600" />
            <p className="font-semibold text-green-800 dark:text-green-300">
              สร้าง API key &quot;{newKey.name}&quot; สำเร็จ
            </p>
          </div>
          <p className="text-xs text-green-700 dark:text-green-400 mb-3">
            คัดลอก key นี้ไว้ทันที — จะไม่แสดงอีกครั้ง
          </p>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-green-300 rounded-xl px-3 py-2">
            <code className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-200 truncate">
              {revealKey ? newKey.plaintext : "•".repeat(48)}
            </code>
            <button onClick={() => setRevealKey((v) => !v)} className="text-gray-400 hover:text-gray-600 shrink-0">
              {revealKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button onClick={() => copyKey(newKey.plaintext)} className="shrink-0 text-[#7F77DD] hover:text-[#6B63CC]">
              {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-3 text-xs text-green-600 hover:underline"
          >
            รับทราบและปิด
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">สร้าง API Key ใหม่</h2>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">ชื่อ Key</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น My Integration, Zapier, n8n"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
              onKeyDown={(e) => e.key === "Enter" && name && createKey()}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-2">Scopes (สิทธิ์)</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded text-[#7F77DD] focus:ring-[#7F77DD]"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Shield size={11} className="text-gray-400" />
                    {SCOPE_LABELS[scope]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={createKey}
              disabled={creating || !name.trim()}
              className="flex-1 py-2 px-4 text-sm bg-[#7F77DD] text-white rounded-lg hover:bg-[#6B63CC] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              สร้าง API Key
            </button>
            <button onClick={() => { setShowCreate(false); setError(""); }} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Key list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-[#7F77DD]" size={28} />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <Code2 size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">ยังไม่มี API key</p>
          <p className="text-xs mt-1">คลิก &quot;สร้าง Key&quot; เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                <Code2 size={15} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{key.name}</p>
                </div>
                <code className="text-xs text-gray-400 font-mono">{key.keyPrefix}••••••••</code>
                <div className="flex flex-wrap gap-1 mt-2">
                  {key.scopes.map((s) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 bg-[#7F77DD]/10 text-[#7F77DD] rounded-full">
                      {SCOPE_LABELS[s] ?? s}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  สร้างเมื่อ {formatDate(key.createdAt)}
                  {key.lastUsedAt && ` · ใช้ล่าสุด ${formatDate(key.lastUsedAt)}`}
                  {key.expiresAt && ` · หมดอายุ ${formatDate(key.expiresAt)}`}
                </p>
              </div>
              <button
                onClick={() => revokeKey(key.id)}
                disabled={revoking === key.id}
                className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                title="ยกเลิก key"
              >
                {revoking === key.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Docs hint */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">วิธีใช้ API key</p>
        <p>ส่ง header: <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">Authorization: Bearer &lt;your_key&gt;</code></p>
        <p className="mt-1">Base URL: <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">https://ouran.app/api/v1</code></p>
      </div>
    </div>
  );
}
