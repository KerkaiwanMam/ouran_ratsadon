import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="business" className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[200px] p-6">{children}</main>
    </div>
  );
}
