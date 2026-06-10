export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">ตั้งรหัสผ่านใหม่</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่านใหม่</label>
            <input
              type="password"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ยืนยันรหัสผ่าน</label>
            <input
              type="password"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-[#7F77DD] text-white rounded-md font-semibold hover:bg-[#534AB7] transition-colors"
          >
            บันทึกรหัสผ่านใหม่
          </button>
        </form>
      </div>
    </main>
  );
}
