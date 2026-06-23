# Design System — Budget Intelligence

Read this before writing Tailwind classes or components. The goal is a calm, professional,
data-dense-but-breathable look. "Less is more": show fewer things, with more space around them.

## Typography

- Font stack (Thai-first): `font-['IBM_Plex_Sans_Thai_Looped',system-ui,sans-serif]`. Monospace for
  numbers/codes/scores: `font-['IBM_Plex_Mono',monospace]`.
- Body text `text-[13px] leading-relaxed`. Headings: page `text-lg font-bold`, section
  `text-sm font-semibold`, card title `text-[13px] font-bold`.
- Numbers in tables and KPIs use the mono stack and are **right-aligned** with `tabular-nums`.

## Color tokens (semantic)

Use a small, consistent palette. Suggested Tailwind values (adjust to the project's theme vars if
they exist; prefer existing CSS variables over hard-coded hex):

| Role            | Token / class                          |
|-----------------|----------------------------------------|
| Ink / primary   | `text-slate-900`                       |
| Ink soft        | `text-slate-600`                       |
| Muted           | `text-slate-400`                       |
| Surface / paper | `bg-slate-50`                          |
| Card            | `bg-white border border-slate-200`     |
| Brand           | `text-blue-700` / `bg-blue-50`         |
| OK              | `text-green-700` / `bg-green-50`       |
| Warn            | `text-amber-700` / `bg-amber-50`       |
| Risk            | `text-red-700` / `bg-red-50`           |

Tier colors (match the existing badges):
- Free → cyan (`bg-cyan-50 text-cyan-700`)
- Pro ฿299 → purple (`bg-purple-50 text-purple-700`)
- Team ฿799 → amber (`bg-amber-100 text-amber-800`)

## Spacing scale (the "Less is More" rules)

- **Page container:** `max-w-7xl mx-auto px-6 lg:px-8 py-8`. Never let content reach the viewport edge.
- **Vertical rhythm between sections:** wrap the page body in `space-y-8` (or `gap-8` grid). Sections
  should feel separated, not stacked tight.
- **Card padding:** `p-6` (never less than `p-4`). Card title to body: `mb-4`.
- **Card grids:** `grid gap-6` (e.g. KPI row `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`).
- **Tables:** header `px-4 py-3`, cells `px-4 py-3 leading-relaxed`, row separators
  `divide-y divide-slate-100`. Give the table its own card with `overflow-hidden rounded-xl`.
- **Inputs / filter controls:** `h-10 px-3` with `rounded-lg border border-slate-200`. Gap between
  controls in a toolbar: `gap-3`.
- **Radius:** cards `rounded-xl`, controls/badges `rounded-lg`/`rounded-full`.

Anti-patterns to fix on sight: content flush to card edge, KPIs crammed with `gap-1`, tables with
`py-1` rows, headings with no margin below them, full-width text blocks with no max-width.

## Shared component skeletons

Reuse these across all four pages so the product feels coherent. They are skeletons — adapt props to
the real data layer, but keep the structure and the layer semantics.

### NarrativeInsight (Layer 3 — top of every page)

```tsx
// Layer 3 · Narrative · Phase 1 (rule-based, fed from server props)
type NarrativeProps = {
  // 1–3 short Thai sentences, pre-generated server-side from DiagnosticInsight/Recommendation
  sentences: string[];
  // optional: link that lets the user verify the claim (Layer 2 anti-hallucination guard)
  verifyHref?: string;
};

export function NarrativeInsight({ sentences, verifyHref }: NarrativeProps) {
  if (!sentences.length) return null;
  return (
    <section
      aria-label="สรุปเชิงลึก"
      className="rounded-xl border border-blue-100 bg-blue-50/60 p-6"
    >
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-blue-700">
        สรุปเชิงลึก
      </div>
      <div className="space-y-1.5 text-[13px] leading-relaxed text-slate-800">
        {sentences.map((s, i) => (
          <p key={i}>{s}</p>
        ))}
      </div>
      {verifyHref && <DrillDownLink href={verifyHref} label="ดูข้อมูลจริง" />}
    </section>
  );
}
```

### DrillDownLink (Layer 2 — verification path)

```tsx
// Layer 2 · Evidence · every narrative claim must offer one of these
export function DrillDownLink({ href, label = "ดูข้อมูลจริง" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      className="mt-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px]
                 font-semibold text-blue-700 hover:bg-blue-100 focus:outline-none
                 focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      {label} →
    </a>
  );
}
```

### EvidenceToolbar (Layer 2 — filter / search controls)

```tsx
// Layer 2 · Evidence · how the user re-checks the narrative
export function EvidenceToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      {children}
    </div>
  );
}

// example controls placed inside the toolbar:
// <input className="h-10 w-64 rounded-lg border border-slate-200 px-3 text-[13px]
//                   focus-visible:ring-2 focus-visible:ring-blue-400" placeholder="ค้นหา…" />
// <select className="h-10 rounded-lg border border-slate-200 px-3 text-[13px]">…หมวด…</select>
```

### KpiCard (Layer 1 source → Layer 2 display)

```tsx
// Reads a governed value (MonthlyFinancialSummary / ForecastSnapshot) — never computed ad hoc here.
export function KpiCard({
  label, value, hint, tone = "default",
}: { label: string; value: string; hint?: string; tone?: "default" | "ok" | "warn" | "risk" }) {
  const toneMap = {
    default: "text-slate-900",
    ok: "text-green-700",
    warn: "text-amber-700",
    risk: "text-red-700",
  } as const;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 font-['IBM_Plex_Mono',monospace] text-2xl font-semibold tabular-nums ${toneMap[tone]}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}
```

### TierBadge

```tsx
export function TierBadge({ tier }: { tier: "FREE" | "PRO" | "TEAM" }) {
  const map = {
    FREE: "bg-cyan-50 text-cyan-700",
    PRO: "bg-purple-50 text-purple-700",
    TEAM: "bg-amber-100 text-amber-800",
  } as const;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${map[tier]}`}>{tier}</span>
  );
}
```

## Page shell pattern

```tsx
export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50 font-['IBM_Plex_Sans_Thai_Looped',system-ui,sans-serif]">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 lg:px-8">
        {/* 1. NarrativeInsight (Layer 3) */}
        {/* 2. EvidenceToolbar (Layer 2) */}
        {/* 3. KPIs / charts / table (Layer 2, fed by Layer 1) */}
      </div>
    </main>
  );
}
```
