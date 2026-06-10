"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Users,
  Plus,
  Mail,
  Crown,
  Shield,
  UserCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  FolderOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceMember {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  joinedAt: string | null;
  user: { id: string; name: string; email: string; avatarUrl: string | null } | null;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  _count: { members: number; files: number };
}

interface WorkspaceData {
  owned: Workspace[];
  member: (Workspace & { role: "OWNER" | "ADMIN" | "MEMBER" })[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ROLE_LABELS: Record<string, string> = {
  OWNER:  "Owner",
  ADMIN:  "Admin",
  MEMBER: "สมาชิก",
};
const ROLE_ICONS: Record<string, React.ReactNode> = {
  OWNER:  <Crown size={12} className="text-amber-500" />,
  ADMIN:  <Shield size={12} className="text-blue-500" />,
  MEMBER: <UserCircle size={12} className="text-gray-400" />,
};

// ─── Create workspace modal ───────────────────────────────────────────────────

function CreateWorkspaceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onNameChange(v: string) {
    setName(v);
    if (!slug || slug === autoSlug(name)) {
      setSlug(autoSlug(v));
    }
  }

  function autoSlug(s: string) {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40);
  }

  async function handleCreate() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description }),
      });
      const data = await res.json() as { workspace?: unknown; message?: string; error?: string };
      if (!res.ok) {
        setError(data.message ?? "สร้าง Workspace ไม่สำเร็จ");
        setLoading(false);
        return;
      }
      onCreated();
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          สร้าง Workspace ใหม่
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ชื่อ Workspace
            </label>
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="บริษัท ABC"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slug (URL)
            </label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400 shrink-0">ouran.app/workspace/</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-company"
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/40"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">ตัวพิมพ์เล็ก ตัวเลข และ - เท่านั้น (3-40 ตัว)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              คำอธิบาย (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Workspace สำหรับทีมบัญชีของ ABC"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/40 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle size={13} />
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim() || !slug.trim()}
            className="flex-1 py-2 bg-[#7F77DD] text-white rounded-lg text-sm font-semibold hover:bg-[#534AB7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            สร้าง Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invite member panel ──────────────────────────────────────────────────────

function InvitePanel({ workspaceId, onInvited }: { workspaceId: string; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleInvite() {
    setError("");
    setLoading(true);
    setSuccess(false);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json() as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "เชิญไม่สำเร็จ");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setEmail("");
      setLoading(false);
      onInvited();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 mt-4">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="อีเมลสมาชิกใหม่"
        type="email"
        className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/40"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
        className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
      >
        <option value="MEMBER">สมาชิก</option>
        <option value="ADMIN">Admin</option>
      </select>
      <button
        onClick={handleInvite}
        disabled={loading || !email.trim()}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#7F77DD] text-white rounded-lg text-sm font-medium hover:bg-[#534AB7] disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
        ส่งคำเชิญ
      </button>
      {success && (
        <span className="flex items-center gap-1 text-green-500 text-xs">
          <CheckCircle2 size={13} />
          ส่งแล้ว
        </span>
      )}
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
}

// ─── Workspace card ───────────────────────────────────────────────────────────

function WorkspaceCard({ ws, isOwner }: { ws: Workspace; isOwner: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { data: membersData, mutate } = useSWR<{ members: WorkspaceMember[] }>(
    expanded ? `/api/workspace/${ws.id}/members` : null,
    fetcher
  );

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{ws.name}</h3>
            {isOwner && (
              <span className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <Crown size={11} />
                Owner
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            ouran.app/workspace/{ws.slug}
          </p>
          {ws.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{ws.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users size={13} />
            {ws._count.members}/5
          </span>
          <span className="flex items-center gap-1">
            <FolderOpen size={13} />
            {ws._count.files}
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded member list */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">สมาชิก</p>

          {!membersData ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <Loader2 size={14} className="animate-spin" />
              โหลดรายชื่อ…
            </div>
          ) : (
            <div className="space-y-2">
              {membersData.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#7F77DD]/20 flex items-center justify-center text-xs font-bold text-[#7F77DD]">
                      {(m.user?.name ?? m.email).slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {m.user?.name ?? m.email}
                      </p>
                      {m.user && (
                        <p className="text-xs text-gray-400">{m.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.status === "INVITED"
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {ROLE_ICONS[m.role]}
                      {m.status === "INVITED" ? "รอยืนยัน" : ROLE_LABELS[m.role]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invite panel (owners and admins) */}
          {isOwner && <InvitePanel workspaceId={ws.id} onInvited={() => void mutate()} />}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { data, isLoading, mutate } = useSWR<WorkspaceData>("/api/workspace", fetcher);
  const [showCreate, setShowCreate] = useState(false);

  const hasWorkspaces =
    (data?.owned?.length ?? 0) > 0 || (data?.member?.length ?? 0) > 0;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Team Workspace</h1>
          <p className="text-sm text-gray-500 mt-1">
            แชร์ไฟล์และ dashboard ร่วมกันในทีม — Team plan (สูงสุด 5 ที่นั่ง)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#7F77DD] text-white rounded-xl text-sm font-semibold hover:bg-[#534AB7] transition-colors"
        >
          <Plus size={14} />
          สร้าง Workspace
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
          <Loader2 size={16} className="animate-spin" />
          กำลังโหลด…
        </div>
      ) : !hasWorkspaces ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
          <Users size={40} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
          <p className="font-semibold text-gray-500 dark:text-gray-400">ยังไม่มี Workspace</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            สร้าง workspace แรกของคุณเพื่อเชิญสมาชิกทีมและแชร์ข้อมูลร่วมกัน
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#7F77DD] text-white rounded-xl text-sm font-semibold hover:bg-[#534AB7] transition-colors"
          >
            <Plus size={14} />
            สร้าง Workspace
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.owned?.map((ws) => (
            <WorkspaceCard key={ws.id} ws={ws} isOwner />
          ))}
          {data?.member?.map((ws) => (
            <WorkspaceCard key={ws.id} ws={ws} isOwner={false} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void mutate();
          }}
        />
      )}
    </div>
  );
}
