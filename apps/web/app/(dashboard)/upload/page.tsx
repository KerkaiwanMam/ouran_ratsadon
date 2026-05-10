export default function UploadPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">อัปโหลดไฟล์</h1>
      <div className="border-2 border-dashed border-[#7F77DD] rounded-lg p-16 flex flex-col items-center justify-center text-center">
        <p className="text-lg font-medium mb-2">ลากไฟล์มาวางที่นี่</p>
        <p className="text-sm text-gray-500 mb-4">รองรับ PDF และ Excel (.xlsx, .xls) ขนาดไม่เกิน 50MB</p>
        <button className="px-6 py-2 bg-[#7F77DD] text-white rounded-md hover:bg-[#534AB7] transition-colors">
          เลือกไฟล์
        </button>
      </div>
    </div>
  );
}
