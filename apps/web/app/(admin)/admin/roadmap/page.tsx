import {
  CheckCircle2,
  Wrench,
  Rocket,
  Globe,
  Database,
  ShieldCheck,
  Sparkles,
  Compass,
  ListChecks,
  Layers,
  Clock,
  Flag,
} from "lucide-react";

// Admin-only "Roadmap & Plan" board. Reads like a project-tracking dashboard:
// an overview hero (overall progress) + KPI chips + per-workstream cards with
// progress bars and เสร็จ/ทำอยู่/รอทำ breakdowns. Static content — the source of
// truth is docs/roadmap.md; update both together.

type State = "done" | "doing" | "todo";
type Status = "done" | "active" | "planned";

interface Task {
  label: string;
  state: State;
}

interface Workstream {
  name: string;
  desc: string;
  status: Status;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tasks: Task[];
}

const WORKSTREAMS: Workstream[] = [
  {
    name: "Civic Layer",
    desc: "สำรวจ ค้นหา และวิเคราะห์งบประมาณภาครัฐ (สาธารณะ)",
    status: "done",
    icon: Globe,
    tasks: [
      { label: "Treemap/Sunburst สำรวจงบ + drill-down กระทรวง → กรม → โครงการ", state: "done" },
      { label: "ค้นหาขั้นสูง + ตัวกรองหลายมิติ + ส่งออก CSV", state: "done" },
      { label: "หน้ารายละเอียดโครงการ + ประวัติย้อนหลัง 5 ปี", state: "done" },
      { label: "Red Flag ครบ 4 กฎ พร้อม fallback", state: "done" },
      { label: "ภาพรวมการคลังประเทศ (/fiscal-overview)", state: "done" },
      { label: "Embed widget + ระบบให้คะแนน/ความเห็นโครงการ", state: "done" },
    ],
  },
  {
    name: "Business Layer",
    desc: "วิเคราะห์การเงินและกระแสเงินสดสำหรับ SME",
    status: "done",
    icon: Database,
    tasks: [
      { label: "อัปโหลด Excel/bank statement/accounting + จัดหมวดอัตโนมัติ", state: "done" },
      { label: "แดชบอร์ดกระแสเงินสด + Burn Rate + Cash Runway", state: "done" },
      { label: "วิเคราะห์เชิงลึก 4 ระดับ (สรุป → วินิจฉัย → พยากรณ์ → คำแนะนำ)", state: "done" },
      { label: "Leak detection ครบ 4 กฎ", state: "done" },
      { label: "พยากรณ์ WMA + ดัชนีฤดูกาล (ไม่ใช่ AI/ML)", state: "done" },
      { label: "ผู้ช่วย AI แบบ rule-based (ไม่มีค่าใช้จ่าย)", state: "done" },
    ],
  },
  {
    name: "Infra & Security",
    desc: "ความปลอดภัยและระบบพื้นฐานระดับ production",
    status: "done",
    icon: ShieldCheck,
    tasks: [
      { label: "Rate limiting ที่ Edge — ขั้นแรกของทุก request", state: "done" },
      { label: "File sanitization (CSV injection + XLSX macro detection)", state: "done" },
      { label: "Auth coverage ครบทุกหน้า + orphan cleanup cron", state: "done" },
      { label: "Stripe + trial 14 วัน · alerts (email/LINE) · team workspace · API keys", state: "done" },
    ],
  },
  {
    name: "UX Polish — โมเดล 3 ชั้น",
    desc: "Narrative → Evidence → Shared Truth ให้ครบทุกหน้า",
    status: "active",
    icon: Wrench,
    tasks: [
      { label: "บทสรุปภาษาคน + ลิงก์ตรวจสอบที่มาของตัวเลขทุกหน้า", state: "done" },
      { label: "ขัดเกลา Business Layer ตามโมเดล 3 ชั้น", state: "doing" },
      { label: "เก็บข้อมูลใช้งานจริงเพื่อปรับกฎตรวจจับความผิดปกติ", state: "doing" },
      { label: "เพิ่มภาพหน้าจอ + live demo link ใน README ก่อน deploy", state: "todo" },
    ],
  },
  {
    name: "เฟสถัดไป 1 — Free-tier LLM",
    desc: "ผู้ช่วย AI ตอบคำถามแบบอิสระ บนข้อมูลที่ตรวจสอบแล้ว",
    status: "planned",
    icon: Rocket,
    tasks: [
      { label: "เชื่อมต่อ Google Gemini (free tier) ต่อยอด rule-based เดิม", state: "todo" },
      { label: "อ้างอิงข้อมูลที่ตรวจสอบแล้วเท่านั้น ไม่แตะข้อมูลดิบ", state: "todo" },
      { label: "รองรับ streaming response + เก็บประวัติแชท", state: "todo" },
      { label: "Deploy ขึ้น Vercel + Railway/Render พร้อม live demo", state: "todo" },
    ],
  },
  {
    name: "เฟสถัดไป 2 — Fiscal Intelligence+",
    desc: "ขยายไปถึงระดับผู้รับเหมา/คู่สัญญาภาครัฐ",
    status: "planned",
    icon: Compass,
    tasks: [
      { label: "Red Flag รายผู้รับเหมา (concentration + ถูกตั้งข้อสังเกตซ้ำ)", state: "todo" },
      { label: "โปรไฟล์บริษัท (/recipient/[id]) เชื่อม e-GP ↔ งบ ↔ งบการเงิน", state: "todo" },
      { label: "Vendor/counterparty pattern detection (Pro)", state: "todo" },
    ],
  },
];

const STATUS_META: Record<
  Status,
  { label: string; badge: string; bar: string; ring: string }
> = {
  done: {
    label: "เสร็จสมบูรณ์",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    bar: "bg-emerald-500",
    ring: "border-l-emerald-500",
  },
  active: {
    label: "กำลังพัฒนา",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    bar: "bg-amber-500",
    ring: "border-l-amber-500",
  },
  planned: {
    label: "วางแผนไว้",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    bar: "bg-indigo-400",
    ring: "border-l-indigo-400",
  },
};

const STATE_DOT: Record<State, string> = {
  done: "bg-emerald-500",
  doing: "bg-amber-500",
  todo: "bg-gray-300 dark:bg-gray-600",
};

function countTasks(tasks: Task[]) {
  const done = tasks.filter((t) => t.state === "done").length;
  const doing = tasks.filter((t) => t.state === "doing").length;
  const todo = tasks.filter((t) => t.state === "todo").length;
  return { done, doing, todo, total: tasks.length };
}

export default function AdminRoadmapPage() {
  const allTasks = WORKSTREAMS.flatMap((w) => w.tasks);
  const totals = countTasks(allTasks);
  const overallPct = Math.round((totals.done / totals.total) * 100);

  const doneStreams = WORKSTREAMS.filter((w) => w.status === "done").length;
  const activeStreams = WORKSTREAMS.filter((w) => w.status === "active").length;
  const plannedStreams = WORKSTREAMS.filter((w) => w.status === "planned").length;

  const updatedAt = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Roadmap &amp; Plan
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            ภาพรวมสถานะการพัฒนาแพลตฟอร์ม — ติดตามได้ว่าแต่ละส่วนถึงไหนแล้ว · ดูเฉพาะผู้ดูแลระบบ
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <Clock size={13} aria-hidden="true" />
          อัปเดตล่าสุด · {updatedAt}
        </span>
      </div>

      {/* ── Overview hero ──────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-[#4b42a6] via-[#5b51c9] to-[#7F77DD] text-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/15">
          {/* Overall progress */}
          <div className="p-6">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/70 font-semibold mb-2">
              <ListChecks size={14} aria-hidden="true" />
              ความคืบหน้ารวม
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black leading-none tabular-nums">{overallPct}%</span>
              <span className="text-sm text-white/70">
                {totals.done}/{totals.total} งาน
              </span>
            </div>
            <div
              className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden"
              role="progressbar"
              aria-valuenow={overallPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="ความคืบหน้ารวมของโปรเจกต์"
            >
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>

          {/* Core system status */}
          <div className="p-6">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/70 font-semibold mb-2">
              <Layers size={14} aria-hidden="true" />
              ระบบหลัก
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black leading-none tabular-nums">100%</span>
              <span className="text-sm text-white/70">พร้อมใช้งาน</span>
            </div>
            <p className="mt-3 text-xs text-white/70 leading-relaxed">
              Civic Layer · Business Layer · Infra &amp; Security ส่งมอบครบแล้ว
            </p>
          </div>

          {/* Workstreams snapshot */}
          <div className="p-6">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/70 font-semibold mb-2">
              <Sparkles size={14} aria-hidden="true" />
              สายงานทั้งหมด
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black leading-none tabular-nums">
                {WORKSTREAMS.length}
              </span>
              <span className="text-sm text-white/70">สายงาน</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80">
              <span>เสร็จ {doneStreams}</span>
              <span>กำลังทำ {activeStreams}</span>
              <span>วางแผน {plannedStreams}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI chips ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiChip
          icon={<CheckCircle2 size={15} className="text-emerald-500" />}
          label="ส่งมอบแล้ว"
          value={doneStreams}
          unit="สายงาน"
          valueClass="text-emerald-600 dark:text-emerald-400"
        />
        <KpiChip
          icon={<Wrench size={15} className="text-amber-500" />}
          label="กำลังพัฒนา"
          value={activeStreams}
          unit="สายงาน"
          valueClass="text-amber-600 dark:text-amber-400"
        />
        <KpiChip
          icon={<Rocket size={15} className="text-indigo-500" />}
          label="วางแผนต่อไป"
          value={plannedStreams}
          unit="สายงาน"
          valueClass="text-indigo-600 dark:text-indigo-400"
        />
        <KpiChip
          icon={<Flag size={15} className="text-[#7F77DD]" />}
          label="งานที่ติดตาม"
          value={totals.total}
          unit="งาน"
          valueClass="text-[#7F77DD]"
        />
      </div>

      {/* ── Workstream cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {WORKSTREAMS.map((w) => {
          const c = countTasks(w.tasks);
          const pct = Math.round((c.done / c.total) * 100);
          const meta = STATUS_META[w.status];
          const Icon = w.icon;
          return (
            <div
              key={w.name}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 ${meta.ring} p-5`}
            >
              {/* header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <Icon size={18} className="" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {w.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {w.desc}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.badge}`}
                >
                  {meta.label}
                </span>
              </div>

              {/* progress */}
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-500 dark:text-gray-400">ความคืบหน้า</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                  {pct}% · {c.done}/{c.total} เสร็จ
                </span>
              </div>
              <div
                className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`ความคืบหน้า ${w.name}`}
              >
                <div
                  className={`h-full rounded-full ${meta.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* status counts */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <Count dot={STATE_DOT.done} label="เสร็จ" n={c.done} />
                <Count dot={STATE_DOT.doing} label="ทำอยู่" n={c.doing} />
                <Count dot={STATE_DOT.todo} label="รอทำ" n={c.todo} />
              </div>

              {/* task list */}
              <ul className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/70 space-y-2">
                {w.tasks.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span
                      className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${STATE_DOT[t.state]}`}
                      aria-hidden="true"
                    />
                    <span
                      className={
                        t.state === "done"
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-gray-700 dark:text-gray-200"
                      }
                    >
                      {t.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ── Footnote ───────────────────────────────────────────────────── */}
      <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
        <ListChecks size={13} aria-hidden="true" />
        แหล่งอ้างอิง: <code className="font-mono">docs/roadmap.md</code> — ปรับสองที่ให้ตรงกันเสมอ
      </p>
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────

function KpiChip({
  icon,
  label,
  value,
  unit,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
  valueClass: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
        {icon}
        {label}
      </p>
      <p className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">{unit}</span>
      </p>
    </div>
  );
}

function Count({ dot, label, n }: { dot: string; label: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />
      {label} <span className="font-semibold tabular-nums text-gray-700 dark:text-gray-300">{n}</span>
    </span>
  );
}
