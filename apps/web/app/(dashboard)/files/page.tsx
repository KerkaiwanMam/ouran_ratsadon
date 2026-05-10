import { MOCK_BUDGET } from "@/lib/mock-data";
import { formatDate } from "@/utils/format";
import StatusBadge from "@/components/shared/StatusBadge";

const MOCK_FILES = [
  MOCK_BUDGET.metadata,
  {
    ...MOCK_BUDGET.metadata,
    id: "mock-file-002",
    filename: "งบประมาณ_Q1_2567.xlsx",
    fileType: "xlsx" as const,
    status: "done" as const,
    uploadedAt: "2024-08-15T10:30:00.000Z",
    fiscalYear: "2567",
  },
  {
    ...MOCK_BUDGET.metadata,
    id: "mock-file-003",
    filename: "งบประมาณ_2566.pdf",
    fileType: "pdf" as const,
    status: "processing" as const,
    uploadedAt: "2024-07-01T09:00:00.000Z",
    fiscalYear: "2566",
  },
];

export default function FilesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">ไฟล์ของฉัน</h1>
        <a
          href="/upload"
          className="px-4 py-2 bg-[#7F77DD] text-white text-sm rounded-md hover:bg-[#534AB7] transition-colors"
        >
          อัปโหลดไฟล์ใหม่
        </a>
      </div>

      {/* Quota bar (Free plan) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">โควต้าไฟล์เดือนนี้ (แผน Free)</span>
          <span className="font-medium">1 / 3 ไฟล์</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-[#7F77DD] h-2 rounded-full" style={{ width: "33%" }} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700 text-left">
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">ชื่อไฟล์</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">ปีงบประมาณ</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">วันที่อัปโหลด</th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">สถานะ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {MOCK_FILES.map((file) => (
              <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded font-mono uppercase">
                      {file.fileType}
                    </span>
                    <span>{file.filename}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{file.fiscalYear ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(file.uploadedAt)}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={
                      file.status === "done"
                        ? "ปกติ"
                        : file.status === "error"
                        ? "ผิดปกติ"
                        : "ตรวจสอบ"
                    }
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  {file.status === "done" && (
                    <a
                      href={`/report/${file.id}`}
                      className="text-[#7F77DD] hover:underline text-xs"
                    >
                      ดูรายงาน →
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
