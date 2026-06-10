"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, RefreshCw, AlertTriangle, CheckCircle2, Clock, XCircle, Database, Pencil, Check, X } from "lucide-react";

interface CivicDataVersion {
  id: string;
  fiscalYear: string;
  version: number;
  uploadedBy: string;
  filename: string;
  sourceFormat: string;
  status: "PROCESSING" | "ACTIVE" | "REPLACED" | "FAILED" | "DELETED";
  replacesVersionId: string | null;
  errorLog: string | null;
  ministryCount: number;
  projectCount: number;
  redFlagCount: number;
  isActive: boolean;
  uploadedAt: string;
  notes: string | null;
}

type UploadMode = "add" | "replace" | "delete";

const STATUS_BADGE: Record<CivicDataVersion["status"], { label: string; cls: string }> = {
  PROCESSING: { label: "กำลังประมวลผล", cls: "bg-yellow-100 text-yellow-800" },
  ACTIVE:     { label: "ใช้งานอยู่",   cls: "bg-green-100 text-green-800" },
  REPLACED:   { label: "ถูกแทนที่",   cls: "bg-gray-100 text-gray-600" },
  FAILED:     { label: "ล้มเหลว",     cls: "bg-red-100 text-red-700" },
  DELETED:    { label: "ถูกลบแล้ว",  cls: "bg-gray-100 text-gray-500 line-through" },
};

const FORMAT_LABEL: Record<string, string> = { xlsx: "Excel", csv: "CSV", html: "HTML" };

export default function CivicDataPage() {
  const [versions, setVersions] = useState<CivicDataVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{
    fiscalYear: string;
    mode: UploadMode;
    file: File | null;
    notes: string;
  }>({ fiscalYear: "", mode: "add", file: null, notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string; warnings?: string[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ id: string; value: string } | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchVersions() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/civic-data");
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchVersions(); }, []);

  // Poll while any version is in PROCESSING state
  useEffect(() => {
    const hasProcessing = versions.some((v) => v.status === "PROCESSING");
    if (!hasProcessing) return;
    const timer = setTimeout(fetchVersions, 4000);
    return () => clearTimeout(timer);
  }, [versions]);

  function openModal(prefillYear?: string, mode: UploadMode = "add") {
    setForm({ fiscalYear: prefillYear ?? "", mode, file: null, notes: "" });
    setResult(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const fd = new FormData();
    fd.append("fiscalYear", form.fiscalYear);
    fd.append("mode", form.mode);
    if (form.notes) fd.append("notes", form.notes);
    if (form.file && form.mode !== "delete") fd.append("file", form.file);

    try {
      const res = await fetch("/api/admin/civic-data/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        const stats = data.stats;
        const msg = form.mode === "delete"
          ? data.message
          : `อัปโหลดสำเร็จ — ${stats.totalRows.toLocaleString()} แถว | ${stats.ministryCount} กระทรวง | ${stats.projectCount} โครงการ | ${stats.redFlagCount} red flags`;
        setResult({ type: "success", message: msg, warnings: data.warnings });
        await fetchVersions();
        if (!data.warnings?.length) {
          setTimeout(() => setShowModal(false), 1800);
        }
      } else {
        setResult({ type: "error", message: data.message ?? data.error ?? "เกิดข้อผิดพลาด" });
      }
    } catch {
      setResult({ type: "error", message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setConfirmDelete(null);
    const res = await fetch(`/api/admin/civic-data/${id}`, { method: "DELETE" });
    if (res.ok) await fetchVersions();
  }

  async function handleSaveNotes() {
    if (!editingNotes) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/civic-data/${editingNotes.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: editingNotes.value }),
      });
      if (res.ok) {
        setVersions((vs) =>
          vs.map((v) => (v.id === editingNotes.id ? { ...v, notes: editingNotes.value || null } : v))
        );
        setEditingNotes(null);
      }
    } finally {
      setSavingNotes(false);
    }
  }

  const groupedByYear = versions.reduce<Record<string, CivicDataVersion[]>>((acc, v) => {
    (acc[v.fiscalYear] ??= []).push(v);
    return acc;
  }, {});
  const sortedYears = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">ชุดข้อมูลงบประมาณภาครัฐ</h1>
          <p className="text-sm text-gray-500 mt-1">อัปโหลด เพิ่ม แทนที่ หรือลบข้อมูลงบประมาณรายปี (Civic Layer)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchVersions}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            รีเฟรช
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#7F77DD] text-white rounded-lg hover:bg-[#6e67cc] transition-colors"
          >
            <Upload size={14} />
            เพิ่มไฟล์ใหม่
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">กำลังโหลดข้อมูล…</div>
      ) : sortedYears.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl text-gray-400">
          <Database size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">ยังไม่มีชุดข้อมูล</p>
          <p className="text-sm mt-1">กดปุ่ม "เพิ่มไฟล์ใหม่" เพื่ออัปโหลดข้อมูลงบประมาณชุดแรก</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedYears.map((year) => {
            const yearVersions = groupedByYear[year];
            const active = yearVersions.find((v) => v.status === "ACTIVE");
            return (
              <div key={year} className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden">
                {/* Year header */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 border-b">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base">ปีงบประมาณ พ.ศ. {year}</span>
                    {active && (
                      <span className="text-xs text-gray-500">
                        {active.ministryCount} กระทรวง · {active.projectCount.toLocaleString()} โครงการ · {active.redFlagCount} red flags
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(year, "replace")}
                      className="text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      แทนที่
                    </button>
                    <button
                      onClick={() =>
                        setConfirmDelete({
                          id: `year-${year}`,
                          label: `ลบข้อมูลทั้งหมดของปี ${year}`,
                        })
                      }
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      ลบปีนี้
                    </button>
                  </div>
                </div>

                {/* Version rows */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b bg-gray-50/50">
                      <th className="px-5 py-2 font-medium">เวอร์ชัน</th>
                      <th className="px-5 py-2 font-medium">ไฟล์ต้นฉบับ</th>
                      <th className="px-5 py-2 font-medium">ฟอร์แมต</th>
                      <th className="px-5 py-2 font-medium">สถานะ</th>
                      <th className="px-5 py-2 font-medium">อัปโหลดเมื่อ</th>
                      <th className="px-5 py-2 font-medium">หมายเหตุ</th>
                      <th className="px-5 py-2 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {yearVersions.map((v) => {
                      const badge = STATUS_BADGE[v.status];
                      return (
                        <tr key={v.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-5 py-3 font-mono text-gray-500">v{v.version}</td>
                          <td className="px-5 py-3 max-w-[220px] truncate" title={v.filename}>
                            {v.filename}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                              {FORMAT_LABEL[v.sourceFormat] ?? v.sourceFormat.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              {v.status === "ACTIVE" && <CheckCircle2 size={13} className="text-green-600" />}
                              {v.status === "PROCESSING" && <Clock size={13} className="text-yellow-600 animate-pulse" />}
                              {v.status === "FAILED" && <XCircle size={13} className="text-red-600" />}
                              {(v.status === "REPLACED" || v.status === "DELETED") && <RefreshCw size={13} className="text-gray-400" />}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </div>
                            {v.status === "FAILED" && v.errorLog && (
                              <p className="text-xs text-red-500 mt-0.5 max-w-[280px] truncate" title={v.errorLog}>
                                {v.errorLog}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(v.uploadedAt).toLocaleString("th-TH", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </td>
                          {/* Notes — inline editable */}
                          <td className="px-5 py-3 max-w-[200px]">
                            {editingNotes?.id === v.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  autoFocus
                                  value={editingNotes.value}
                                  onChange={(e) => setEditingNotes({ id: v.id, value: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveNotes();
                                    if (e.key === "Escape") setEditingNotes(null);
                                  }}
                                  placeholder="ใส่หมายเหตุ…"
                                  className="flex-1 min-w-0 text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-[#7F77DD] dark:bg-gray-800"
                                />
                                <button
                                  onClick={handleSaveNotes}
                                  disabled={savingNotes}
                                  className="p-1 rounded text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                                  title="บันทึก"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  onClick={() => setEditingNotes(null)}
                                  className="p-1 rounded text-gray-400 hover:bg-gray-100 transition-colors"
                                  title="ยกเลิก"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group">
                                <span className="text-xs text-gray-500 truncate" title={v.notes ?? ""}>
                                  {v.notes || <span className="text-gray-300">—</span>}
                                </span>
                                {v.status !== "DELETED" && (
                                  <button
                                    onClick={() => setEditingNotes({ id: v.id, value: v.notes ?? "" })}
                                    className="p-1 rounded text-gray-300 hover:text-[#7F77DD] opacity-0 group-hover:opacity-100 transition-all"
                                    title="แก้ไขหมายเหตุ"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {v.status !== "DELETED" && (
                              <button
                                onClick={() =>
                                  setConfirmDelete({ id: v.id, label: `ลบเวอร์ชัน v${v.version} ของปี ${v.fiscalYear}` })
                                }
                                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                title="ลบเวอร์ชันนี้"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-base">
                {form.mode === "add" ? "เพิ่มชุดข้อมูลใหม่" : form.mode === "replace" ? "แทนที่ชุดข้อมูล" : "ลบชุดข้อมูล"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Fiscal year */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  ปีงบประมาณ (พ.ศ.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={2500}
                  max={2700}
                  value={form.fiscalYear}
                  onChange={(e) => setForm((f) => ({ ...f, fiscalYear: e.target.value }))}
                  placeholder="เช่น 2568"
                  required
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#7F77DD] dark:bg-gray-800"
                />
              </div>

              {/* Mode selector */}
              <div>
                <label className="block text-sm font-medium mb-1.5">โหมด</label>
                <div className="flex gap-2">
                  {(["add", "replace", "delete"] as UploadMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, mode: m }))}
                      className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${
                        form.mode === m
                          ? m === "delete"
                            ? "bg-red-50 border-red-400 text-red-700"
                            : "bg-purple-50 border-[#7F77DD] text-[#7F77DD]"
                          : "border-gray-200 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {m === "add" ? "เพิ่ม" : m === "replace" ? "แทนที่" : "ลบ"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  {form.mode === "add" && "เพิ่มแถวใหม่เข้าปีที่เลือก (ข้อมูลเดิมยังคงอยู่)"}
                  {form.mode === "replace" && "ลบข้อมูลเดิมของปีนั้นแล้วแทนด้วยไฟล์ใหม่ (เก็บประวัติ)"}
                  {form.mode === "delete" && "ลบข้อมูลและ JSON ของปีที่เลือกออกจากระบบ (ไม่ต้องแนบไฟล์)"}
                </p>
              </div>

              {/* File input (hidden for delete mode) */}
              {form.mode !== "delete" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    ไฟล์ต้นฉบับ (.xlsx / .csv / .html) <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                      form.file ? "border-[#7F77DD] bg-purple-50/30" : "border-gray-200 hover:border-gray-400"
                    }`}
                    onClick={() => fileRef.current?.click()}
                  >
                    {form.file ? (
                      <div>
                        <CheckCircle2 size={20} className="mx-auto mb-1 text-[#7F77DD]" />
                        <p className="text-sm font-medium">{form.file.name}</p>
                        <p className="text-xs text-gray-500">{(form.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <Upload size={20} className="mx-auto mb-1 text-gray-400" />
                        <p className="text-sm text-gray-500">คลิกหรือลากไฟล์มาวางที่นี่</p>
                        <p className="text-xs text-gray-400 mt-0.5">xlsx / csv / html — สูงสุด 150 MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.html,.htm"
                    className="hidden"
                    onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5">หมายเหตุ (ไม่บังคับ)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="เช่น แก้ไขตัวเลขกระทรวงศึกษาธิการ"
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7F77DD] dark:bg-gray-800"
                />
              </div>

              {/* Result message */}
              {result && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm ${
                    result.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {result.type === "success" ? (
                      <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p>{result.message}</p>
                      {result.warnings && result.warnings.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-medium">
                            คำเตือน {result.warnings.length} รายการ (คลิกดู)
                          </summary>
                          <ul className="mt-1 space-y-0.5 text-xs list-disc list-inside">
                            {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-sm rounded-lg font-medium text-white transition-colors disabled:opacity-50 ${
                    form.mode === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-[#7F77DD] hover:bg-[#6e67cc]"
                  }`}
                >
                  {submitting
                    ? "กำลังประมวลผล…"
                    : form.mode === "add"
                    ? "อัปโหลดและประมวลผล"
                    : form.mode === "replace"
                    ? "แทนที่และประมวลผล"
                    : "ยืนยันการลบ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={22} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">ยืนยันการลบ?</p>
                <p className="text-sm text-gray-500 mt-1">{confirmDelete.label}</p>
                {confirmDelete.id.startsWith("year-") && (
                  <p className="text-xs text-red-500 mt-1">
                    การลบจะกระทบข้อมูลสาธารณะทั้งหมดของปีนั้นทันที
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.id.startsWith("year-")) {
                    const year = confirmDelete.id.replace("year-", "");
                    const fd = new FormData();
                    fd.append("fiscalYear", year);
                    fd.append("mode", "delete");
                    fetch("/api/admin/civic-data/upload", { method: "POST", body: fd }).then(fetchVersions);
                  } else {
                    handleDelete(confirmDelete.id);
                  }
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
