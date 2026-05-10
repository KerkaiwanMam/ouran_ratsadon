import Sidebar from "@/components/layout/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar role="admin" />
      <main className="flex-1 ml-[200px] p-6">{children}</main>
    </div>
  );
}
