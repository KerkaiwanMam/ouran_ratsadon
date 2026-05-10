export default function PricingPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-6 text-center">ราคา</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Free</h2>
          <p className="text-3xl font-bold mb-4">฿0</p>
          <ul className="space-y-2 text-gray-600">
            <li>3 ไฟล์/เดือน</li>
            <li>กราฟ Bar และ Pie</li>
            <li>Export CSV</li>
          </ul>
        </div>
        <div className="border-2 border-[#7F77DD] rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Pro</h2>
          <p className="text-3xl font-bold mb-4">฿299<span className="text-base font-normal">/เดือน</span></p>
          <ul className="space-y-2 text-gray-600">
            <li>ไฟล์ไม่จำกัด</li>
            <li>ตรวจจับความผิดปกติ</li>
            <li>เปรียบเทียบไฟล์</li>
            <li>Export PDF</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
