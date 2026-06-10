import { NextResponse } from "next/server";
import { getBudgetYear, getDeptProjects } from "@/lib/civic-cache";

/**
 * GET /api/civic/dept-projects?year=2569&ministryId=M&deptId=D
 *
 * Returns top-50 named projects for a specific department.
 * Lazy-loaded by MinistryTreemap when the user drills to level 3 (projects).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = url.searchParams.get("year") ?? "";
  const ministryId = url.searchParams.get("ministryId") ?? "";
  const deptId = url.searchParams.get("deptId") ?? "";

  if (!year || !ministryId || !deptId) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "year, ministryId และ deptId จำเป็น" },
      { status: 400 }
    );
  }

  const data = getBudgetYear(year);
  if (!data) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: `ไม่พบข้อมูลปีงบประมาณ ${year}` },
      { status: 404 }
    );
  }

  const projects = getDeptProjects(data, ministryId, deptId, 50);

  // Also surface the dept name and budget for the treemap header
  const ministry = data.ministries.find((m) => m.id === ministryId);
  const dept = ministry?.departments.find((d) => d.id === deptId);

  return NextResponse.json({
    deptId,
    deptName: dept?.name ?? "",
    totalBudget: dept?.budget ?? 0,
    totalProjectCount: dept?.projects.length ?? 0,
    shownCount: projects.length,
    projects,
  });
}
