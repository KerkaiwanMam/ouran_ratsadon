export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2">ลืมรหัสผ่าน</h1>
        <p className="text-center text-gray-600 text-sm mb-6">
          ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณ
        </p>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">อีเมล</label>
            <input
              type="email"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]"
              placeholder="email@example.com"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-[#7F77DD] text-white rounded-md font-semibold hover:bg-[#534AB7] transition-colors"
          >
            ส่งลิงก์รีเซ็ต
          </button>
        </form>
      </div>
    </main>
  );
}
