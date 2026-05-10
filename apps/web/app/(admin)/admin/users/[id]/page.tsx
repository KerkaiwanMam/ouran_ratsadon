interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ข้อมูลผู้ใช้ #{id}</h1>
    </div>
  );
}
