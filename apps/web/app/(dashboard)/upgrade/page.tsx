export default function UpgradePage() {
  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <h1 className="text-3xl font-bold mb-4">อัปเกรดเป็น Pro</h1>
      <p className="text-gray-600 mb-8">ปลดล็อคทุกฟีเจอร์ในราคา ฿299/เดือน</p>
      <a
        href="/pricing"
        className="px-8 py-3 bg-[#7F77DD] text-white rounded-lg font-semibold hover:bg-[#534AB7] transition-colors"
      >
        ดูแผนราคา
      </a>
    </div>
  );
}
