interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportAnomaliesPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ความผิดปกติ — รายงาน #{id}</h1>
      <p className="text-sm text-[#7F77DD] bg-purple-50 rounded-md px-3 py-2 inline-block">
        ฟีเจอร์นี้สำหรับสมาชิก Pro เท่านั้น
      </p>
    </div>
  );
}
