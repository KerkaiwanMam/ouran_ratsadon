import { NextResponse } from "next/server";
import {
  getBudgetYear,
  findProject,
  getRelatedProjects,
  getAvailableYears,
} from "@/lib/civic-cache";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const url = new URL(req.url);
  const year = url.searchParams.get("year") ?? getAvailableYears().at(-1) ?? "2568";

  const data = getBudgetYear(year);
  if (!data) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `ไม่พบข้อมูลปีงบประมาณ ${year}` },
      { status: 404 }
    );
  }

  const found = findProject(data, id);
  if (!found) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `ไม่พบโครงการ ${id}` },
      { status: 404 }
    );
  }

  const { project, ministry, department } = found;
  const related = getRelatedProjects(data, project, ministry.id);

  return NextResponse.json({
    ...project,
    ministry: { id: ministry.id, name: ministry.name },
    department: { id: department.id, name: department.name },
    relatedProjects: related,
    source: {
      name: data.metadata.source,
      section: "พ.ร.บ. งบประมาณรายจ่าย",
    },
  });
}
