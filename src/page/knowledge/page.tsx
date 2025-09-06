import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function DistrictPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 px-8">
        <h1 className="text-3xl font-bold mb-6">ข่าว ส.ส. เขต</h1>
        <p>ใส่เนื้อหาข่าวที่นี่...</p>
      </main>
      <Footer />
    </>
  );
}