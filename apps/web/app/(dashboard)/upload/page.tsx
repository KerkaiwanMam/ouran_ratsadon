"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Info,
} from "lucide-react";

type UploadStatus = "idle" | "dragging" | "uploading" | "done" | "error";

interface FormatOption {
  value: string;
  label: string;
  hint: string;
  accept: string;
  icon: React.ReactNode;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: "EXCEL_TEMPLATE",
    label: "Excel Template",
    hint: "แนะนำ — ดาวน์โหลด template แล้วกรอกข้อมูล",
    accept: ".xlsx,.xls,.csv",
    icon: <FileSpreadsheet size={14} />,
  },
  {
    value: "BANK_SCB",
    label: "SCB Statement",
    hint: "export CSV จาก SCB Easy App หรือสาขา",
    accept: ".csv,.xlsx",
    icon: <Building2 size={14} />,
  },
  {
    value: "BANK_KBANK",
    label: "KBANK Statement",
    hint: "export CSV จาก K PLUS หรือสาขา",
    accept: ".csv,.xlsx",
    icon: <Building2 size={14} />,
  },
  {
    value: "BANK_BBL",
    label: "BBL Statement",
    hint: "export CSV จาก Bualuang ibanking หรือสาขา",
    accept: ".csv,.xlsx",
    icon: <Building2 size={14} />,
  },
  {
    value: "ACCOUNTING_PEAK",
    label: "PEAK Accounting",
    hint: "export CSV/XLSX จากโปรแกรม PEAK บัญชี",
    accept: ".csv,.xlsx",
    icon: <FileSpreadsheet size={14} />,
  },
  {
    value: "ACCOUNTING_FLOWACCOUNT",
    label: "FlowAccount",
    hint: "export CSV/XLSX จาก FlowAccount",
    accept: ".csv,.xlsx",
    icon: <FileSpreadsheet size={14} />,
  },
];

function bankCode(fmt: string): string | null {
  if (fmt === "BANK_SCB")   return "SCB";
  if (fmt === "BANK_KBANK") return "KBANK";
  if (fmt === "BANK_BBL")   return "BBL";
  return null;
}

function accountingCode(fmt: string): string | null {
  if (fmt === "ACCOUNTING_PEAK")        return "PEAK";
  if (fmt === "ACCOUNTING_FLOWACCOUNT") return "FLOWACCOUNT";
  return null;
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceFormat, setSourceFormat] = useState("EXCEL_TEMPLATE");

  const activeFormat = FORMAT_OPTIONS.find((f) => f.value === sourceFormat)!;

  function onDragOver(e: DragEvent) { e.preventDefault(); setStatus("dragging"); }
  function onDragLeave() { setStatus("idle"); }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
    setStatus("idle");
  }
  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setError("");
    setStatus("uploading");

    try {
      const bank = bankCode(sourceFormat);
      const accounting = accountingCode(sourceFormat);
      let fileId: string;

      if (accounting) {
        // Accounting export: call parser, then upload parsed entries
        const parserForm = new FormData();
        parserForm.append("file", selectedFile);
        parserForm.append("software", accounting);

        const parserUrl = process.env.NEXT_PUBLIC_PARSER_URL ?? "http://localhost:8000";
        const parserRes = await fetch(`${parserUrl}/parse/accounting-export`, {
          method: "POST",
          body: parserForm,
        });

        if (!parserRes.ok) {
          const err = await parserRes.json().catch(() => ({}));
          setError(
            (err as { detail?: string }).detail ??
            "ไม่สามารถประมวลผล accounting export ได้"
          );
          setStatus("error");
          return;
        }

        const parsed = await parserRes.json() as {
          entryCount: number;
          entries: unknown[];
          warnings: string[];
        };

        if (parsed.warnings.length > 0) {
          console.warn("[upload] accounting parser warnings:", parsed.warnings);
        }

        const uploadForm = new FormData();
        uploadForm.append("file", selectedFile);
        uploadForm.append("source_format", sourceFormat);
        uploadForm.append("parsed_transactions", JSON.stringify(parsed.entries));

        const uploadRes = await fetch("/api/files/upload", {
          method: "POST",
          body: uploadForm,
        });
        const uploadData = await uploadRes.json() as { file?: { id: string }; message?: string };
        if (!uploadRes.ok) {
          setError(uploadData.message ?? "อัปโหลดไม่สำเร็จ");
          setStatus("error");
          return;
        }
        fileId = uploadData.file!.id;
      } else if (bank) {
        // Bank statement: call parser first, then pass parsed transactions to upload API
        const parserForm = new FormData();
        parserForm.append("file", selectedFile);
        parserForm.append("bank", bank);

        const parserUrl = process.env.NEXT_PUBLIC_PARSER_URL ?? "http://localhost:8000";
        const parserRes = await fetch(`${parserUrl}/parse/bank-statement`, {
          method: "POST",
          body: parserForm,
        });

        if (!parserRes.ok) {
          const err = await parserRes.json().catch(() => ({}));
          setError(
            (err as { detail?: string }).detail ??
            "ไม่สามารถประมวลผล bank statement ได้"
          );
          setStatus("error");
          return;
        }

        const parsed = await parserRes.json() as {
          transactionCount: number;
          transactions: unknown[];
          warnings: string[];
        };

        if (parsed.warnings.length > 0) {
          console.warn("[upload] parser warnings:", parsed.warnings);
        }

        // Upload normalised transactions to the Next.js API
        const uploadForm = new FormData();
        uploadForm.append("file", selectedFile);
        uploadForm.append("source_format", sourceFormat);
        uploadForm.append("parsed_transactions", JSON.stringify(parsed.transactions));

        const uploadRes = await fetch("/api/files/upload", {
          method: "POST",
          body: uploadForm,
        });
        const uploadData = await uploadRes.json() as { file?: { id: string }; message?: string };
        if (!uploadRes.ok) {
          setError(uploadData.message ?? "อัปโหลดไม่สำเร็จ");
          setStatus("error");
          return;
        }
        fileId = uploadData.file!.id;
      } else {
        // Excel template: direct-to-storage upload (presign → PUT → confirm)
        const presignRes = await fetch("/api/files/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: selectedFile.name,
            fileSize: selectedFile.size,
            contentType: selectedFile.type,
            source_format: sourceFormat,
          }),
        });
        const presignData = await presignRes.json() as {
          mode?: "r2" | "local";
          fileId?: string;
          url?: string;
          fields?: Record<string, string>;
          uploadUrl?: string;
          message?: string;
        };
        if (!presignRes.ok) {
          setError(presignData.message ?? "อัปโหลดไม่สำเร็จ");
          setStatus("error");
          return;
        }

        if (presignData.mode === "r2") {
          const r2Form = new FormData();
          Object.entries(presignData.fields ?? {}).forEach(([k, v]) => r2Form.append(k, v));
          r2Form.append("file", selectedFile);
          const r2Res = await fetch(presignData.url!, { method: "POST", body: r2Form });
          if (!r2Res.ok) {
            setError("อัปโหลดไฟล์ไปยัง storage ไม่สำเร็จ");
            setStatus("error");
            return;
          }
        } else {
          const putRes = await fetch(presignData.uploadUrl!, {
            method: "PUT",
            body: selectedFile,
          });
          if (!putRes.ok) {
            const err = await putRes.json().catch(() => ({})) as { message?: string };
            setError(err.message ?? "อัปโหลดไฟล์ไม่สำเร็จ");
            setStatus("error");
            return;
          }
        }

        const confirmRes = await fetch(`/api/files/${presignData.fileId}/confirm`, { method: "POST" });
        const confirmData = await confirmRes.json() as { file?: { id: string }; message?: string };
        if (!confirmRes.ok) {
          setError(confirmData.message ?? "อัปโหลดไม่สำเร็จ");
          setStatus("error");
          return;
        }
        fileId = confirmData.file!.id;
      }

      setStatus("done");
      setTimeout(() => router.push(`/report/${fileId}/overview`), 1500);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">อัปโหลดไฟล์</h1>
        <p className="text-sm text-gray-500 mt-1">
          รองรับ Excel template, bank statement (SCB · KBANK · BBL) และ accounting export (PEAK · FlowAccount)
        </p>
      </div>

      {/* ── Format tabs ── */}
      <div className="mb-5">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">รูปแบบไฟล์</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSourceFormat(opt.value); setSelectedFile(null); setStatus("idle"); }}
              className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition-all ${
                sourceFormat === opt.value
                  ? "border-[#7F77DD] bg-[#7F77DD]/5 text-[#7F77DD] dark:bg-[#7F77DD]/10"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-[#7F77DD]/50"
              }`}
            >
              <span className="flex items-center gap-1 text-xs font-semibold">
                {opt.icon}
                {opt.label}
              </span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                {opt.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Bank statement instructions ── */}
      {bankCode(sourceFormat) && (
        <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">
          <Info size={13} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-0.5">วิธี export {bankCode(sourceFormat)} statement</p>
            {bankCode(sourceFormat) === "SCB" && (
              <p>SCB Easy App → บัญชีและบัตร → เลือกบัญชี → ประวัติรายการ → Export → CSV</p>
            )}
            {bankCode(sourceFormat) === "KBANK" && (
              <p>K PLUS → บัญชี → เลือกบัญชี → ประวัติรายการ → ส่งออกไฟล์ → CSV</p>
            )}
            {bankCode(sourceFormat) === "BBL" && (
              <p>Bualuang ibanking → Account Summary → Statement → Export as CSV</p>
            )}
          </div>
        </div>
      )}

      {/* ── Drop zone ── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => status !== "uploading" && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors text-center ${
          status === "dragging"
            ? "border-[#7F77DD] bg-purple-50 dark:bg-purple-900/10"
            : status === "done"
            ? "border-green-400 bg-green-50 dark:bg-green-900/10"
            : status === "error"
            ? "border-red-300 bg-red-50 dark:bg-red-900/10"
            : "border-gray-200 dark:border-gray-700 hover:border-[#7F77DD] hover:bg-purple-50/50 dark:hover:bg-purple-900/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={activeFormat.accept}
          onChange={onFileChange}
          className="hidden"
        />

        {status === "uploading" ? (
          <>
            <Loader2 size={36} className="text-[#7F77DD] animate-spin mb-3" />
            <p className="font-medium text-gray-700 dark:text-gray-300">กำลังประมวลผล…</p>
            <p className="text-xs text-gray-400 mt-1">จัดหมวดหมู่รายการและตรวจจับ anomaly</p>
          </>
        ) : status === "done" ? (
          <>
            <CheckCircle2 size={36} className="text-green-500 mb-3" />
            <p className="font-medium text-green-700 dark:text-green-400">ประมวลผลสำเร็จ!</p>
            <p className="text-xs text-gray-400 mt-1">กำลังไปที่ Dashboard…</p>
          </>
        ) : status === "error" ? (
          <>
            <AlertCircle size={36} className="text-red-500 mb-3" />
            <p className="font-medium text-red-700 dark:text-red-400">{error}</p>
            <p
              className="text-xs text-[#7F77DD] mt-2 hover:underline"
              onClick={(e) => { e.stopPropagation(); setStatus("idle"); setError(""); }}
            >
              ลองใหม่
            </p>
          </>
        ) : selectedFile ? (
          <>
            <FileSpreadsheet size={36} className="text-[#7F77DD] mb-3" />
            <p className="font-medium text-gray-800 dark:text-gray-200">{selectedFile.name}</p>
            <p className="text-xs text-gray-400 mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB ·{" "}
              <span
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                className="text-red-400 hover:underline cursor-pointer"
              >
                เปลี่ยนไฟล์
              </span>
            </p>
          </>
        ) : (
          <>
            <Upload size={36} className="text-gray-300 mb-3" />
            <p className="font-medium text-gray-600 dark:text-gray-400">
              วางไฟล์ที่นี่ หรือคลิกเพื่อเลือก
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {activeFormat.accept.toUpperCase().replace(/\./g, "").replace(/,/g, " / ")} · สูงสุด 10 MB
            </p>
          </>
        )}
      </div>

      {/* ── Upload button ── */}
      {selectedFile && status === "idle" && (
        <button
          onClick={handleUpload}
          className="mt-4 w-full py-3 bg-[#7F77DD] text-white font-semibold rounded-xl hover:bg-[#534AB7] transition-colors"
        >
          อัปโหลดและวิเคราะห์
        </button>
      )}

      {/* ── Template download (Excel only) ── */}
      {sourceFormat === "EXCEL_TEMPLATE" && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">
            ดาวน์โหลด Excel Template
          </p>
          <p className="text-blue-600 dark:text-blue-400 text-xs mb-2">
            Columns: วันที่ · รายการ · หมวดหมู่ (optional) · จำนวนเงิน · ประเภท (income/expense)
          </p>
          <a
            href="/templates/sme-template.csv"
            download
            className="text-blue-700 dark:text-blue-400 font-medium hover:underline"
          >
            📥 ดาวน์โหลด Template (.csv)
          </a>
        </div>
      )}
    </div>
  );
}
