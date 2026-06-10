import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getBudgetYear,
  getAvailableYears,
  findProject,
  getRelatedProjects,
} from "@/lib/civic-cache";
import RedFlagBadge from "@/components/civic/RedFlagBadge";
import RatingWidget from "@/components/civic/RatingWidget";
import CommentThread from "@/components/civic/CommentThread";
import ProjectHistoryChart from "./ProjectHistoryChart";
import ShareButtons from "./ShareButtons";
import { ChevronRight, Share2, Download, ExternalLink } from "lucide-react";
import { getOptionalAuthFromCookies } from "@/lib/auth-helpers";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  // Next.js 15+ may pass the path segment still percent-encoded; decodeURIComponent
  // is idempotent when the string is already decoded (Thai chars are left unchanged).
  const id = decodeURIComponent(rawId);
  const { year } = await searchParams;
  const latestYear = getAvailableYears().at(-1) ?? "2568";
  const resolvedYear = year ?? latestYear;
  const data = getBudgetYear(resolvedYear);
  const found = data ? findProject(data, id) : null;
  if (!found) return { title: "ไม่พบโครงการ" };
  return {
    title: `${found.project.name} — ouran_ratsadon`,
    description: `วงเงิน ฿${(found.project.amount / 1e9).toFixed(2)} พันล้านบาท ปีงบประมาณ ${resolvedYear}`,
  };
}

const BUDGET_TYPE_LABELS: Record<string, string> = {
  personnel: "บุคลากร",
  operating: "ดำเนินงาน",
  investment: "ลงทุน",
  other: "อื่นๆ",
};

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  // Next.js 15+ may pass the path segment still percent-encoded; decodeURIComponent
  // is idempotent when the string is already decoded (Thai chars are left unchanged).
  const id = decodeURIComponent(rawId);
  const { year } = await searchParams;
  const latestYear = getAvailableYears().at(-1) ?? "2568";
  const resolvedYear = year ?? latestYear;

  const data = getBudgetYear(resolvedYear);
  if (!data) notFound();

  const found = findProject(data, id);
  if (!found) notFound();

  const { project, ministry, department } = found;
  const related = getRelatedProjects(data, project, ministry.id);
  const hasFlag = project.flags.length > 0;

  const currentUser = await getOptionalAuthFromCookies();
  const isLoggedIn = !!currentUser;

  const changeAbs = project.amount - project.previous_amount;
  const prevYear = String(Number(resolvedYear) - 1);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4 flex-wrap">
        <Link href="/explore" className="hover:text-[#7F77DD] transition-colors">
          ภาพรวม
        </Link>
        <ChevronRight size={14} />
        <Link
          href={`/explore?year=${resolvedYear}`}
          className="hover:text-[#7F77DD] transition-colors"
        >
          {ministry.name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 dark:text-gray-100 font-medium line-clamp-1">
          {project.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Main content */}
        <div className="space-y-5">
          {/* Header */}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
                ปีงบประมาณ {resolvedYear}
              </span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
                {BUDGET_TYPE_LABELS[project.budget_type] ?? project.budget_type}
              </span>
              {hasFlag &&
                project.flags.map((f, i) => (
                  <RedFlagBadge key={i} severity={f.severity} label={f.label} size="md" />
                ))}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-snug">
              {project.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {ministry.name} › {department.name}
            </p>
          </div>

          {/* Red flag explanation */}
          {hasFlag && (
            <div className="space-y-3">
              {project.flags.map((flag, i) => {
                const ctx = flag.statistical_context;
                // Reference-value label differs per rule — "ค่าเฉลี่ย 5 ปี" was
                // misleading for Rule 2 which stores the category mean, not 5-yr avg.
                const refLabel =
                  flag.rule === "statistical_outlier" ? "ค่าเฉลี่ยหมวด" :
                  flag.rule === "unusual_increase" ? "งบปีก่อน" : null;
                const refValue =
                  ctx?.previous_avg_5yr && ctx.previous_avg_5yr > 0
                    ? `฿${(ctx.previous_avg_5yr / 1e6).toFixed(1)}M`
                    : null;
                return (
                  <div
                    key={i}
                    className={`border-l-4 rounded-r-lg p-4 ${
                      flag.severity === "critical"
                        ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                        : "border-amber-500 bg-amber-50 dark:bg-amber-900/10"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base leading-none mt-0.5">
                        {flag.severity === "critical" ? "🚨" : "⚠️"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold mb-1 ${
                            flag.severity === "critical"
                              ? "text-red-700 dark:text-red-400"
                              : "text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {flag.label}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {flag.description}
                        </p>
                        {ctx && (
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            {refLabel && refValue && (
                              <span>{refLabel}: <strong className="text-gray-700 dark:text-gray-200">{refValue}</strong></span>
                            )}
                            {ctx.std_deviations != null && (
                              <span>ค่าเบี่ยงเบน: <strong className="text-gray-700 dark:text-gray-200">{ctx.std_deviations.toFixed(1)} SD</strong></span>
                            )}
                            {ctx.category_avg_multiple != null && ctx.category_avg_multiple > 0 && (
                              <span>สูงกว่าค่าเฉลี่ย: <strong className="text-gray-700 dark:text-gray-200">{ctx.category_avg_multiple.toFixed(1)} เท่า</strong></span>
                            )}
                            {ctx.match_score != null && (
                              <span>ความคล้าย: <strong className="text-gray-700 dark:text-gray-200">{Math.round(ctx.match_score * 100)}%</strong></span>
                            )}
                            {ctx.matched_project_name && (
                              <span className="w-full">โครงการที่ซ้ำ: <strong className="text-gray-700 dark:text-gray-200 break-words">{ctx.matched_project_name}</strong></span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Project info table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                ข้อมูลงบประมาณ
              </h2>
            </div>
            <dl className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                {
                  label: "วงเงินปี " + resolvedYear,
                  value: (
                    <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                      ฿{project.amount.toLocaleString()}
                    </span>
                  ),
                },
                {
                  label: "วงเงินปี " + prevYear,
                  value: (
                    <span className="font-mono text-gray-600">
                      ฿{project.previous_amount.toLocaleString()}
                    </span>
                  ),
                },
                {
                  label: "เปลี่ยนแปลง",
                  value: (
                    <span
                      className={`font-medium ${
                        changeAbs > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {changeAbs >= 0 ? "+" : ""}
                      {changeAbs.toLocaleString()} บาท ({project.change_pct >= 0 ? "+" : ""}
                      {project.change_pct.toFixed(1)}%)
                    </span>
                  ),
                },
                {
                  label: "ประเภทงบ",
                  value: project.category_name
                    ? `${project.category_name} (${BUDGET_TYPE_LABELS[project.budget_type] ?? project.budget_type})`
                    : BUDGET_TYPE_LABELS[project.budget_type] ?? project.budget_type,
                },
                { label: "แผนงาน", value: project.plan_name },
                ...(project.province ? [{ label: "จังหวัด", value: project.province }] : []),
                { label: "กระทรวง", value: ministry.name },
                { label: "กรม/สำนัก", value: department.name },
                { label: "รหัสโครงการ", value: project.id },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between px-4 py-3 text-sm gap-4"
                >
                  <dt className="text-gray-500 dark:text-gray-400 flex-shrink-0 w-32">
                    {row.label}
                  </dt>
                  <dd className="text-right text-gray-900 dark:text-gray-100">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* 5-year history chart */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              ประวัติงบประมาณ 5 ปี
            </h2>
            <ProjectHistoryChart
              history={project.history}
              currentYear={resolvedYear}
              hasFlag={hasFlag}
            />
          </div>

          {/* Source citation */}
          <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm">
            <ExternalLink size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                แหล่งข้อมูล
              </p>
              <p className="text-gray-500 mt-0.5">
                {data.metadata.source} • เผยแพร่โดยสำนักงบประมาณ (bb.go.th)
              </p>
            </div>
          </div>
        </div>

        {/* Comment thread — full-width below main + sidebar columns */}
        {/* rendered separately via a wrapper below */}

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Rating widget */}
          <RatingWidget projectId={id} />

          {/* Share & export */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Share2 size={14} />
              แชร์
            </h3>
            <ShareButtons
              projectId={id}
              projectName={project.name}
              amount={project.amount}
              changePct={project.change_pct}
              year={resolvedYear}
            />
          </div>

          {/* Download */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Download size={14} />
              ดาวน์โหลด
            </h3>
            <div className="flex flex-col gap-2">
              <a
                href={`/api/civic/project/${project.id}?year=${resolvedYear}`}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                📄 JSON (โครงการเดียว)
              </a>
              <a
                href={`/api/civic/export/json?year=${resolvedYear}`}
                className="w-full text-sm px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                📦 JSON (ทั้งปี {resolvedYear})
              </a>
            </div>
          </div>

          {/* Related projects */}
          {related.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                โครงการที่เกี่ยวข้อง
              </h3>
              <div className="flex flex-col gap-2">
                {related.map((r, i) => (
                  <Link
                    key={`${r.id}-${i}`}
                    href={`/project/${r.id}?year=${resolvedYear}`}
                    className="flex flex-col gap-0.5 text-sm hover:text-[#7F77DD] transition-colors group"
                  >
                    <span className="group-hover:text-[#7F77DD] line-clamp-2 leading-snug">
                      {r.flags.length > 0 && (
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 flex-shrink-0 mt-1" />
                      )}
                      {r.name}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      ฿{(r.amount / 1e9).toFixed(2)}B
                      {r.changePct >= 50 && (
                        <span className="ml-1 text-red-500">
                          (+{r.changePct.toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Comment thread */}
      <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
        <CommentThread
          projectId={id}
          isLoggedIn={isLoggedIn}
          currentUserName={currentUser?.name}
        />
      </div>
    </div>
  );
}
