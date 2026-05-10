interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportOverviewPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ภาพรวม — รายงาน #{id}</h1>
    </div>
  );
}
