import { getBudgetYear, findProject, getAvailableYears } from "@/lib/civic-cache";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; theme?: string }>;
}

// Minimal embeddable project budget card
// Usage: <iframe src="https://ouran.app/embed/project/proj-123?year=2568" width="400" height="220" />

export default async function EmbedProjectPage({ params, searchParams }: Props) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { year: yearParam, theme = "light" } = await searchParams;
  const year = yearParam ?? getAvailableYears().at(-1) ?? "2568";

  const data = getBudgetYear(year);
  if (!data) notFound();

  const found = findProject(data, id);
  if (!found) notFound();

  const { project, ministry, department } = found;

  const isDark = theme === "dark";
  const bg = isDark ? "#111827" : "#ffffff";
  const text = isDark ? "#f3f4f6" : "#111827";
  const muted = isDark ? "#9ca3af" : "#6b7280";
  const accent = "#7F77DD";
  const flagRed = "#ef4444";
  const flagBg = isDark ? "#450a0a" : "#fef2f2";
  const flagBorder = isDark ? "#991b1b" : "#fecaca";
  const divider = isDark ? "#374151" : "#f3f4f6";

  const hasFlag = project.flags.length > 0;
  const topFlag = project.flags[0];
  const changePct = project.change_pct;
  const changeIsPositive = changePct > 0;

  return (
    <html lang="th">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{project.name} — งบประมาณ พ.ศ. {year}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, 'Sarabun', sans-serif; background: ${bg}; color: ${text}; }
        `}</style>
      </head>
      <body>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px", minHeight: "100vh" }}>
          {/* Red flag banner */}
          {hasFlag && (
            <div style={{
              background: flagBg,
              border: `1px solid ${flagBorder}`,
              borderRadius: "8px",
              padding: "8px 10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}>
              <span style={{ fontSize: "12px" }}>🚩</span>
              <div>
                <p style={{ fontSize: "11px", fontWeight: "700", color: flagRed }}>
                  {topFlag.label}
                </p>
                <p style={{ fontSize: "10px", color: isDark ? "#fca5a5" : "#991b1b", marginTop: "1px" }}>
                  {topFlag.description}
                </p>
              </div>
            </div>
          )}

          {/* Project name */}
          <div>
            <p style={{ fontSize: "10px", color: muted, marginBottom: "3px" }}>
              {ministry.name} › {department.name}
            </p>
            <h1 style={{ fontSize: "14px", fontWeight: "700", lineHeight: "1.4" }}>
              {project.name}
            </h1>
          </div>

          {/* Amount + change */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <p style={{ fontSize: "24px", fontWeight: "800", color: accent, letterSpacing: "-0.5px" }}>
              ฿{(project.amount / 1e6).toFixed(1)}
              <span style={{ fontSize: "12px", fontWeight: "500", color: muted }}> ล้าน</span>
            </p>
            {project.previous_amount > 0 && (
              <span style={{
                fontSize: "12px",
                fontWeight: "600",
                color: changeIsPositive ? flagRed : "#10b981",
              }}>
                {changeIsPositive ? "▲" : "▼"} {Math.abs(changePct).toFixed(1)}%
              </span>
            )}
          </div>

          {/* Info row */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {project.province && (
              <div>
                <p style={{ fontSize: "10px", color: muted }}>จังหวัด</p>
                <p style={{ fontSize: "12px", fontWeight: "600" }}>{project.province}</p>
              </div>
            )}
            <div>
              <p style={{ fontSize: "10px", color: muted }}>ประเภทงบ</p>
              <p style={{ fontSize: "12px", fontWeight: "600" }}>
                {{ personnel: "บุคลากร", operating: "ดำเนินงาน", investment: "ลงทุน", other: "อื่นๆ" }[project.budget_type]}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: "auto",
            paddingTop: "8px",
            borderTop: `1px solid ${divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "10px", color: muted }}>ข้อมูล: งบประมาณแผ่นดิน พ.ศ. {year}</span>
            <a
              href={`/project/${id}?year=${year}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "10px", color: accent, textDecoration: "none" }}
            >
              ดูรายละเอียด →
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
