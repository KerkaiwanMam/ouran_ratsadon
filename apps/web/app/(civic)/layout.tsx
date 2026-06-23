import Navbar from "@/components/layout/Navbar";

export default function CivicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="civic">
      <Navbar />
      <main className="pt-16 min-h-screen bg-gray-50 dark:bg-gray-950 bg-blueprint-grid">
        {children}
      </main>
    </div>
  );
}
