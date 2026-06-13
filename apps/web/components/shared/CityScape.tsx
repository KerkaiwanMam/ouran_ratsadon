/**
 * Animated cyberpunk city panorama — pure SVG + CSS keyframes (no JS).
 * Every motion is transform/opacity only; the global prefers-reduced-motion
 * kill-switch in globals.css freezes the whole scene to a static skyline.
 * Scene: skyline → road (lamps, trees, people, cars) → neon river, with
 * budget "฿" particles rising from towers.
 */
export default function CityScape({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 400"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="cs-river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1a3f" />
          <stop offset="100%" stopColor="#0b2447" />
        </linearGradient>
        <linearGradient id="cs-sky-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A0E27" stopOpacity="0" />
          <stop offset="100%" stopColor="#0A0E27" stopOpacity="0.6" />
        </linearGradient>
        {/* static lit-window texture (cool blue) */}
        <pattern id="cs-win" width="18" height="22" patternUnits="userSpaceOnUse">
          <rect x="4" y="6" width="7" height="9" rx="1" fill="#7dd3fc" opacity="0.2" />
        </pattern>
        <pattern id="cs-win-warm" width="20" height="24" patternUnits="userSpaceOnUse">
          <rect x="5" y="7" width="7" height="9" rx="1" fill="#fcd34d" opacity="0.16" />
        </pattern>
      </defs>

      {/* ── Back skyline silhouettes ── */}
      <g fill="#10173a">
        <rect x="-20" y="150" width="100" height="170" />
        <rect x="80" y="205" width="62" height="115" />
        <rect x="142" y="125" width="104" height="195" />
        <rect x="246" y="185" width="72" height="135" />
        <rect x="318" y="155" width="96" height="165" />
        <rect x="414" y="210" width="60" height="110" />
        <rect x="560" y="140" width="92" height="180" />
        <rect x="652" y="195" width="64" height="125" />
        <rect x="810" y="160" width="86" height="160" />
        <rect x="896" y="120" width="70" height="200" />
        <rect x="1080" y="175" width="96" height="145" />
        <rect x="1176" y="140" width="64" height="180" />
        <rect x="1320" y="165" width="90" height="155" />
        <rect x="1404" y="130" width="60" height="190" />
      </g>

      {/* ── Mid towers with neon rooflines + windows ── */}
      <g>
        {/* Tower 1 — cyan crown */}
        <rect x="60" y="140" width="120" height="180" fill="#1a2150" />
        <rect x="68" y="150" width="104" height="162" fill="url(#cs-win)" />
        <line x1="60" y1="140" x2="180" y2="140" stroke="#22d3ee" strokeWidth="2.5" opacity="0.9" />
        <line x1="60" y1="140" x2="180" y2="140" stroke="#22d3ee" strokeWidth="7" opacity="0.25" />
        <rect className="cs-flicker-a" x="84" y="178" width="7" height="9" rx="1" fill="#fbbf24" />
        <rect className="cs-flicker-c" x="138" y="240" width="7" height="9" rx="1" fill="#f472b6" />

        {/* Tower 2 — amber crown */}
        <rect x="260" y="190" width="90" height="130" fill="#1c234e" />
        <rect x="266" y="198" width="78" height="116" fill="url(#cs-win-warm)" />
        <line x1="260" y1="190" x2="350" y2="190" stroke="#fbbf24" strokeWidth="2.5" opacity="0.9" />
        <line x1="260" y1="190" x2="350" y2="190" stroke="#fbbf24" strokeWidth="7" opacity="0.22" />
        <rect className="cs-flicker-b" x="286" y="222" width="7" height="9" rx="1" fill="#22d3ee" />

        {/* Tower 3 — tallest, teal crown + antenna */}
        <rect x="430" y="110" width="140" height="210" fill="#1a2150" />
        <rect x="440" y="122" width="120" height="190" fill="url(#cs-win)" />
        <line x1="430" y1="110" x2="570" y2="110" stroke="#2dd4bf" strokeWidth="2.5" opacity="0.9" />
        <line x1="430" y1="110" x2="570" y2="110" stroke="#2dd4bf" strokeWidth="8" opacity="0.25" />
        <line x1="500" y1="110" x2="500" y2="78" stroke="#334155" strokeWidth="2.5" />
        <circle className="cs-blink" cx="500" cy="76" r="3" fill="#f87171" />
        <rect className="cs-flicker-a" x="458" y="160" width="7" height="9" rx="1" fill="#fbbf24" />
        <rect className="cs-flicker-b" x="530" y="210" width="7" height="9" rx="1" fill="#f472b6" />
        <rect className="cs-flicker-c" x="490" y="262" width="7" height="9" rx="1" fill="#fbbf24" />

        {/* Tower 4 — pink crown */}
        <rect x="720" y="170" width="100" height="150" fill="#1c234e" />
        <rect x="727" y="180" width="86" height="132" fill="url(#cs-win-warm)" />
        <line x1="720" y1="170" x2="820" y2="170" stroke="#f472b6" strokeWidth="2.5" opacity="0.9" />
        <line x1="720" y1="170" x2="820" y2="170" stroke="#f472b6" strokeWidth="7" opacity="0.22" />
        <rect className="cs-flicker-c" x="748" y="206" width="7" height="9" rx="1" fill="#22d3ee" />

        {/* Tower 5 — cyan crown + antenna */}
        <rect x="950" y="130" width="150" height="190" fill="#1a2150" />
        <rect x="960" y="142" width="130" height="170" fill="url(#cs-win)" />
        <line x1="950" y1="130" x2="1100" y2="130" stroke="#22d3ee" strokeWidth="2.5" opacity="0.9" />
        <line x1="950" y1="130" x2="1100" y2="130" stroke="#22d3ee" strokeWidth="8" opacity="0.25" />
        <line x1="1025" y1="130" x2="1025" y2="100" stroke="#334155" strokeWidth="2.5" />
        <circle className="cs-blink-b" cx="1025" cy="98" r="3" fill="#f87171" />
        <rect className="cs-flicker-b" x="985" y="175" width="7" height="9" rx="1" fill="#fbbf24" />
        <rect className="cs-flicker-a" x="1060" y="235" width="7" height="9" rx="1" fill="#f472b6" />

        {/* Tower 6 — amber crown */}
        <rect x="1200" y="180" width="110" height="140" fill="#1c234e" />
        <rect x="1208" y="190" width="94" height="122" fill="url(#cs-win)" />
        <line x1="1200" y1="180" x2="1310" y2="180" stroke="#fbbf24" strokeWidth="2.5" opacity="0.9" />
        <line x1="1200" y1="180" x2="1310" y2="180" stroke="#fbbf24" strokeWidth="7" opacity="0.22" />
        <rect className="cs-flicker-a" x="1230" y="214" width="7" height="9" rx="1" fill="#22d3ee" />
      </g>

      {/* ── Budget particles rising from towers ── */}
      <g fontSize="14" fontWeight="700" fill="#fbbf24">
        <text className="cs-rise-a" x="470" y="106">฿</text>
        <text className="cs-rise-b" x="520" y="106">฿</text>
        <text className="cs-rise-c" x="995" y="126">฿</text>
        <text className="cs-rise-d" x="1050" y="126">฿</text>
        <text className="cs-rise-e" x="760" y="166">฿</text>
      </g>
      <g fill="#fcd34d">
        <circle className="cs-rise-b" cx="448" cy="104" r="2.5" />
        <circle className="cs-rise-d" cx="1075" cy="124" r="2.5" />
        <circle className="cs-rise-a" cx="790" cy="164" r="2.5" />
      </g>

      {/* ── Road ── */}
      <rect x="0" y="320" width="1440" height="26" fill="#0d1230" />
      {/* lane dashes — group slides one 96px period for a seamless loop */}
      <g className="cs-drift" fill="#475569">
        {Array.from({ length: 18 }).map((_, i) => (
          <rect key={i} x={-96 + i * 96} y="332" width="30" height="2.5" rx="1.25" />
        ))}
      </g>

      {/* cars */}
      <g className="cs-drive-a">
        <g transform="translate(0 322)">
          <rect x="0" y="2" width="36" height="10" rx="4" fill="#111827" stroke="#22d3ee" strokeWidth="1" />
          <rect x="7" y="4" width="9" height="4" rx="1" fill="#22d3ee" opacity="0.5" />
          <rect x="19" y="4" width="9" height="4" rx="1" fill="#22d3ee" opacity="0.5" />
          <polygon points="36,5 58,2 58,11 36,9" fill="#fde68a" opacity="0.18" />
          <circle cx="2" cy="9" r="1.6" fill="#f87171" />
        </g>
      </g>
      <g className="cs-drive-b">
        <g transform="translate(0 308)">
          <rect x="22" y="2" width="36" height="10" rx="4" fill="#111827" stroke="#f472b6" strokeWidth="1" />
          <rect x="29" y="4" width="9" height="4" rx="1" fill="#f472b6" opacity="0.5" />
          <rect x="41" y="4" width="9" height="4" rx="1" fill="#f472b6" opacity="0.5" />
          <polygon points="22,5 0,2 0,11 22,9" fill="#fde68a" opacity="0.18" />
          <circle cx="56" cy="9" r="1.6" fill="#f87171" />
        </g>
      </g>

      {/* ── Street lamps ── */}
      {[200, 560, 920, 1280].map((x, i) => (
        <g key={x}>
          <rect x={x} y="276" width="3" height="44" fill="#2a3160" />
          <rect x={x - 10} y="274" width="23" height="3" rx="1.5" fill="#2a3160" />
          <circle cx={x - 8} cy="280" r="3.5" fill="#fcd34d" />
          <circle
            className={i % 2 === 0 ? "cs-pulse-a" : "cs-pulse-b"}
            cx={x - 8}
            cy="280"
            r="13"
            fill="#fcd34d"
            opacity="0.16"
          />
        </g>
      ))}

      {/* ── Trees (sway) ── */}
      {[
        { x: 340, d: "cs-sway-a" },
        { x: 680, d: "cs-sway-b" },
        { x: 1050, d: "cs-sway-a" },
        { x: 1390, d: "cs-sway-b" },
      ].map(({ x, d }) => (
        <g key={x} className={d}>
          <rect x={x - 2} y="304" width="4" height="16" fill="#1e293b" />
          <circle cx={x} cy="296" r="12" fill="#0e4d45" />
          <circle cx={x - 8} cy="302" r="8" fill="#0e4d45" />
          <circle cx={x + 8} cy="302" r="8" fill="#0e4d45" />
          <circle cx={x - 3} cy="293" r="5" fill="#14b8a6" opacity="0.3" />
        </g>
      ))}

      {/* ── People walking along the road ── */}
      <g className="cs-walk-a">
        <g transform="translate(240 308)">
          <circle cx="0" cy="2" r="3" fill="#cbd5e1" />
          <rect x="-2.5" y="5" width="5" height="9" rx="2.5" fill="#94a3b8" />
        </g>
      </g>
      <g className="cs-walk-b">
        <g transform="translate(820 308)">
          <circle cx="0" cy="2" r="3" fill="#cbd5e1" />
          <rect x="-2.5" y="5" width="5" height="9" rx="2.5" fill="#f472b6" opacity="0.85" />
        </g>
      </g>
      <g className="cs-walk-c">
        <g transform="translate(1120 308)">
          <circle cx="0" cy="2" r="3" fill="#cbd5e1" />
          <rect x="-2.5" y="5" width="5" height="9" rx="2.5" fill="#22d3ee" opacity="0.85" />
        </g>
      </g>

      {/* ── River ── */}
      <rect x="0" y="346" width="1440" height="54" fill="url(#cs-river)" />
      {/* neon reflections from the towers */}
      <ellipse cx="500" cy="372" rx="60" ry="20" fill="#2dd4bf" opacity="0.07" />
      <ellipse cx="1025" cy="372" rx="64" ry="20" fill="#22d3ee" opacity="0.07" />
      <ellipse cx="770" cy="376" rx="44" ry="16" fill="#f472b6" opacity="0.06" />
      <ellipse cx="300" cy="376" rx="44" ry="16" fill="#fbbf24" opacity="0.06" />
      {/* drifting shimmer lines */}
      <g className="cs-shimmer-a">
        {[
          { x: 80, y: 356, w: 70 }, { x: 320, y: 366, w: 50 }, { x: 540, y: 358, w: 90 },
          { x: 760, y: 372, w: 60 }, { x: 1000, y: 360, w: 80 }, { x: 1240, y: 370, w: 55 },
        ].map(({ x, y, w }, i) => (
          <rect key={i} x={x} y={y} width={w} height="2" rx="1" fill="#22d3ee" opacity="0.14" />
        ))}
      </g>
      <g className="cs-shimmer-b">
        {[
          { x: 180, y: 382, w: 55 }, { x: 460, y: 388, w: 70 }, { x: 700, y: 384, w: 45 },
          { x: 940, y: 390, w: 65 }, { x: 1180, y: 384, w: 50 }, { x: 1380, y: 390, w: 60 },
        ].map(({ x, y, w }, i) => (
          <rect key={i} x={x} y={y} width={w} height="2" rx="1" fill="#fbbf24" opacity="0.1" />
        ))}
      </g>

      {/* soft fade where the city meets the page below */}
      <rect x="0" y="340" width="1440" height="60" fill="url(#cs-sky-fade)" opacity="0.3" />
    </svg>
  );
}
