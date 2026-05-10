interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReportExportPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ส่งออก — รายงาน #{id}</h1>
      <div className="space-y-3">
        <button className="block w-full max-w-xs px-4 py-2 border rounded-md hover:bg-gray-50">
          Export CSV
        </button>
        <button className="block w-full max-w-xs px-4 py-2 border rounded-md text-gray-400 cursor-not-allowed">
          Export PDF (Pro เท่านั้น)
        </button>
      </div>
    </div>
  );
}
