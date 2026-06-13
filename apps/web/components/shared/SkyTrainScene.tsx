/**
 * Animated BTS-style skytrain crossing the city — pure SVG + CSS (no JS).
 * Two trains on parallel tracks: the near train stops at the central station
 * (dwell, then departs), the far train passes through nonstop in the opposite
 * direction — their loops are tuned so they regularly cross mid-scene.
 * Reduced-motion users get a static scene (global kill-switch).
 */

function TrainCar({ x, tint }: { x: number; tint: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="0" y="0" width="86" height="26" rx="5" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      {/* window strip */}
      <rect x="6" y="5" width="74" height="9" rx="2" fill={tint} opacity="0.55" />
      {/* door seams */}
      <line x1="28" y1="3" x2="28" y2="23" stroke="#0f172a" strokeWidth="1.5" />
      <line x1="58" y1="3" x2="58" y2="23" stroke="#0f172a" strokeWidth="1.5" />
      {/* accent stripe */}
      <rect x="0" y="17" width="86" height="3" fill={tint} opacity="0.8" />
      {/* bogies */}
      <rect x="10" y="26" width="16" height="5" rx="2" fill="#0f172a" />
      <rect x="60" y="26" width="16" height="5" rx="2" fill="#0f172a" />
    </g>
  );
}

function Train({
  className,
  tint,
  flip = false,
}: {
  className: string;
  tint: string;
  flip?: boolean;
}) {
  // 3 cars + tapered head cab ≈ 365px long, drawn with the head at the right.
  return (
    <g className={className}>
      <g transform={flip ? "scale(-1 1)" : undefined}>
        <TrainCar x={-352} tint={tint} />
        <TrainCar x={-262} tint={tint} />
        <TrainCar x={-172} tint={tint} />
        {/* head cab */}
        <g transform="translate(-82 0)">
          <path
            d="M0 5 Q0 0 5 0 H62 Q78 0 84 12 L86 18 Q87 24 80 26 H5 Q0 26 0 21 Z"
            fill="#1e293b"
            stroke="#334155"
            strokeWidth="1"
          />
          <rect x="6" y="5" width="50" height="9" rx="2" fill={tint} opacity="0.55" />
          <path d="M60 5 Q72 6 78 14 L79 16 Q70 15 60 14 Z" fill={tint} opacity="0.45" />
          <rect x="0" y="17" width="84" height="3" fill={tint} opacity="0.8" />
          <rect x="10" y="26" width="16" height="5" rx="2" fill="#0f172a" />
          <rect x="58" y="26" width="16" height="5" rx="2" fill="#0f172a" />
          {/* headlight + beam */}
          <circle cx="84" cy="20" r="2" fill="#fef9c3" />
          <polygon points="85,17 130,12 130,26 85,23" fill="#fde68a" opacity="0.14" />
        </g>
      </g>
    </g>
  );
}

export default function SkyTrainScene({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 190"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* distant skyline */}
      <g fill="#10173a">
        <rect x="30" y="40" width="70" height="100" />
        <rect x="130" y="64" width="50" height="76" />
        <rect x="250" y="30" width="84" height="110" />
        <rect x="400" y="58" width="60" height="82" />
        <rect x="930" y="46" width="74" height="94" />
        <rect x="1060" y="66" width="52" height="74" />
        <rect x="1180" y="36" width="86" height="104" />
        <rect x="1330" y="58" width="64" height="82" />
      </g>
      <g fill="#fbbf24" opacity="0.35">
        <rect x="46" y="56" width="5" height="6" />
        <rect x="272" y="48" width="5" height="6" />
        <rect x="1198" y="52" width="5" height="6" />
        <rect x="1352" y="72" width="5" height="6" />
      </g>
      <g fill="#22d3ee" opacity="0.3">
        <rect x="150" y="80" width="5" height="6" />
        <rect x="418" y="74" width="5" height="6" />
        <rect x="950" y="62" width="5" height="6" />
        <rect x="1080" y="82" width="5" height="6" />
      </g>

      {/* ── far track (behind viaduct beam) — train B passes nonstop ──
           outer <g> sets track height; CSS animation owns the inner transform */}
      <g transform="translate(0 97)" opacity="0.7">
        <Train className="st-train-pass" tint="#f472b6" flip />
      </g>

      {/* ── viaduct ── */}
      {/* guardrail of far track */}
      <rect x="0" y="128" width="1440" height="3" fill="#1e2a52" />
      {/* main beam */}
      <rect x="0" y="140" width="1440" height="12" rx="2" fill="#1b2347" />
      <rect x="0" y="140" width="1440" height="2" fill="#2dd4bf" opacity="0.5" />
      {/* pylons */}
      {[90, 330, 570, 870, 1110, 1350].map((x) => (
        <g key={x}>
          <path d={`M${x - 14} 190 L${x - 8} 152 H${x + 8} L${x + 14} 190 Z`} fill="#161d40" />
          <circle className={x % 2 ? "cs-blink" : "cs-blink-b"} cx={x} cy="158" r="2" fill="#f87171" />
        </g>
      ))}

      {/* ── central station ── */}
      <g>
        {/* roof */}
        <path d="M620 92 Q720 74 820 92 L820 100 Q720 84 620 100 Z" fill="#1e2a52" />
        <rect x="620" y="98" width="200" height="3" fill="#22d3ee" opacity="0.5" />
        {/* columns */}
        <rect x="630" y="100" width="4" height="40" fill="#26305c" />
        <rect x="806" y="100" width="4" height="40" fill="#26305c" />
        {/* sign board */}
        <rect x="688" y="104" width="64" height="13" rx="3" fill="#0f172a" stroke="#2dd4bf" strokeWidth="1" />
        <text
          x="720"
          y="113.5"
          textAnchor="middle"
          fontSize="8"
          fontWeight="700"
          fill="#2dd4bf"
          letterSpacing="1"
        >
          OURAN STN
        </text>
        {/* platform glow */}
        <rect x="624" y="136" width="192" height="4" rx="2" fill="#fcd34d" opacity="0.25" />
        {/* waiting passengers */}
        <g fill="#cbd5e1">
          <circle cx="668" cy="124" r="2.5" />
          <rect x="666" y="127" width="4" height="9" rx="2" fill="#94a3b8" />
          <circle cx="762" cy="124" r="2.5" />
          <rect x="760" y="127" width="4" height="9" rx="2" fill="#f472b6" opacity="0.85" />
          <circle cx="700" cy="124" r="2.5" />
          <rect x="698" y="127" width="4" height="9" rx="2" fill="#22d3ee" opacity="0.85" />
        </g>
      </g>

      {/* ── near track — train A stops at the station ── */}
      <g transform="translate(0 109)">
        <Train className="st-train-stop" tint="#22d3ee" />
      </g>
      {/* near track rail line */}
      <rect x="0" y="152" width="1440" height="2" fill="#0f172a" />
    </svg>
  );
}
