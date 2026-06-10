import { getBudgetYear, computeMinistryList, getAvailableYears } from "@/lib/civic-cache";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; theme?: string }>;
}

// Minimal embeddable ministry budget card
// Usage: <iframe src="https://ouran.app/embed/ministry/moe?year=2568" width="400" height="200" />

export default async function EmbedMinistryPage({ params, searchParams }: Props) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { year: yearParam, theme = "light" } = await searchParams;
  const year = yearParam ?? getAvailableYears().at(-1) ?? "2568";

  const data = getBudgetYear(year);
  if (!data) notFound();

  const ministries = computeMinistryList(data);
  const ministry = ministries.find((m) => m.id === id);
  if (!ministry) notFound();

  const isDark = theme === "dark";
  const bg = isDark ? "#111827" : "#ffffff";
  const text = isDark ? "#f3f4f6" : "#111827";
  const muted = isDark ? "#9ca3af" : "#6b7280";
  const accent = "#7F77DD";
  const barBg = isDark ? "#374151" : "#f3f4f6";
  const flagColor = "#ef4444";

  const barWidth = Math.min(ministry.percentage, 100);

  return (
    <html lang="th">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{ministry.name} — งบประมาณ พ.ศ. {year}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, 'Sarabun', sans-serif; background: ${bg}; color: ${text}; }
        `}</style>
      </head>
      <body>
        <div style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          minHeight: "100vh",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "11px", color: muted, marginBottom: "2px" }}>
                งบประมาณ พ.ศ. {year}
              </p>
              <h1 style={{ fontSize: "15px", fontWeight: "700", lineHeight: "1.3" }}>
                {ministry.name}
              </h1>
            </div>
            {ministry.redFlagCount > 0 && (
              <span style={{
                fontSize: "11px",
                color: flagColor,
                background: isDark ? "#450a0a" : "#fef2f2",
                border: `1px solid ${isDark ? "#991b1b" : "#fecaca"}`,
                borderRadius: "6px",
                padding: "2px 8px",
                whiteSpace: "nowrap",
              }}>
                🚩 {ministry.redFlagCount} ธง
              </span>
            )}
          </div>

          {/* Budget amount */}
          <div>
            <p style={{ fontSize: "22px", fontWeight: "800", color: accent, letterSpacing: "-0.5px" }}>
              ฿{(ministry.budget / 1e9).toFixed(2)}<span style={{ fontSize: "13px", fontWeight: "500", color: muted }}> พันล้าน</span>
            </p>
            <p style={{ fontSize: "12px", color: muted, marginTop: "2px" }}>
              {ministry.percentage.toFixed(2)}% ของงบประมาณรวม
            </p>
          </div>

          {/* Budget bar */}
          <div style={{ background: barBg, borderRadius: "99px", height: "8px", overflow: "hidden" }}>
            <div style={{
              width: `${barWidth}%`,
              height: "100%",
              background: accent,
              borderRadius: "99px",
              transition: "width 0.5s ease",
            }} />
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "11px", color: muted }}>หน่วยงาน</p>
              <p style={{ fontSize: "14px", fontWeight: "600" }}>{ministry.departmentCount}</p>
            </div>
            <div>
              <p style={{ fontSize: "11px", color: muted }}>โครงการ</p>
              <p style={{ fontSize: "14px", fontWeight: "600" }}>{ministry.projectCount.toLocaleString()}</p>
            </div>
          </div>

          {/* Footer link */}
          <div style={{
            marginTop: "auto",
            paddingTop: "8px",
            borderTop: `1px solid ${isDark ? "#374151" : "#f3f4f6"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "10px", color: muted }}>ข้อมูล: งบประมาณแผ่นดิน</span>
            <a
              href={`/explore?year=${year}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "10px", color: accent, textDecoration: "none" }}
            >
              ouran.app →
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
