import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <section className="flex flex-col items-center justify-center text-center min-h-screen px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            วิเคราะห์งบประมาณ<br />ด้วย AI
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mb-8">
            แปลงเอกสารงบประมาณ PDF/Excel เป็น Dashboard แบบ Real-time
            ตรวจจับความผิดปกติ และลดต้นทุนได้ง่ายขึ้น
          </p>
          <a
            href="/register"
            className="px-8 py-3 bg-[#7F77DD] text-white rounded-lg font-semibold hover:bg-[#534AB7] transition-colors"
          >
            เริ่มต้นฟรี
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
