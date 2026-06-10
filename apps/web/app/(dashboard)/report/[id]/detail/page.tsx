interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">รายละเอียด — รายงาน #{id}</h1>
    </div>
  );
}
