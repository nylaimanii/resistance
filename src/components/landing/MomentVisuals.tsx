// Static, hand-drawn SVG previews for the landing's three signature moments.
// These are NOT live — frozen snapshot drawings using the same palette as
// the live app so the landing previews look like the same family of charts.

const SAFE = "oklch(0.696 0.17 162.48)"; // emerald-500, same as in-app safe color
const DANGER = "var(--color-destructive)";
const NEUTRAL = "var(--color-foreground)";
const MUTED = "var(--color-muted-foreground)";
const BORDER = "var(--color-border)";

const SVG_CLASS = "h-auto w-full max-w-[360px] rounded-md border bg-card";

// ─── Moment 1: finish-vs-stop divergence ─────────────────────────────────
// two population trajectories from the same starting point: one rides the
// drug down to zero (cleared), the other drops, then rebounds as resistant
// survivors regrow.
export function MomentOneChart() {
  return (
    <svg viewBox="0 0 320 180" className={SVG_CLASS} role="img" aria-label="population trajectory: finish-vs-stop">
      {/* axes */}
      <line x1="30" y1="20" x2="30" y2="155" stroke={BORDER} />
      <line x1="30" y1="155" x2="310" y2="155" stroke={BORDER} />
      <text x="30" y="14" fontSize="9" fill={MUTED}>population</text>
      <text x="305" y="170" fontSize="9" fill={MUTED} textAnchor="end">time →</text>

      {/* dotted vertical: "drug deployed" moment, where the two paths share history */}
      <line x1="85" y1="25" x2="85" y2="155" stroke={MUTED} strokeDasharray="2 3" opacity="0.45" />
      <text x="89" y="32" fontSize="8" fill={MUTED}>drug deployed</text>

      {/* CLEARED trajectory — finish the course, drops to 0 and stays there */}
      <polyline
        fill="none"
        stroke={SAFE}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points="30,40 60,40 85,42 110,75 140,115 170,140 200,150 235,154 270,155 305,155"
      />
      <text x="305" y="148" fontSize="9.5" fill={SAFE} textAnchor="end" fontWeight="500">
        course finished → cleared
      </text>

      {/* RESISTANT trajectory — stop early, dip then rebound */}
      <polyline
        fill="none"
        stroke={DANGER}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points="30,40 60,40 85,42 105,80 125,95 145,85 175,65 210,48 250,38 305,33"
      />
      <text x="305" y="27" fontSize="9.5" fill={DANGER} textAnchor="end" fontWeight="500">
        stopped early → resistance
      </text>

      {/* "course stopped early" marker on the red trajectory */}
      <circle cx="125" cy="95" r="2.5" fill={DANGER} />
      <text x="130" y="100" fontSize="8" fill={MUTED}>stopped here</text>
    </svg>
  );
}

// ─── Moment 2: surveillance spread map ───────────────────────────────────
// frozen snapshot of the surveillance map at peak spread: Gamma (the treated
// hub) is red, its direct neighbors caught it, the lateral nodes are still
// catching up.
export function MomentTwoMap() {
  // node fill from emerald → destructive based on resistance level (0..1)
  const fill = (t: number) =>
    `color-mix(in oklab, ${SAFE} ${(1 - t) * 100}%, ${DANGER})`;

  const nodes = [
    { name: "Alpha", x: 80, y: 50, t: 0.55 },
    { name: "Beta", x: 240, y: 50, t: 0.55 },
    { name: "Gamma", x: 160, y: 95, t: 0.95 }, // the treated source
    { name: "Delta", x: 80, y: 145, t: 0.3 },
    { name: "Epsilon", x: 240, y: 145, t: 0.3 },
  ];
  const edges: [number, number][] = [
    [0, 2], [1, 2], [3, 2], [4, 2], // hub spokes
    [0, 3], [1, 4],                 // lateral
  ];

  return (
    <svg viewBox="0 0 320 180" className={SVG_CLASS} role="img" aria-label="surveillance: spread from one treated source">
      {/* edges */}
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke={MUTED}
          strokeWidth="1.2"
          opacity="0.45"
        />
      ))}

      {/* nodes */}
      {nodes.map((n) => (
        <g key={n.name}>
          <circle
            cx={n.x}
            cy={n.y}
            r={n.t > 0.9 ? 16 : 13}
            fill={fill(n.t)}
            stroke={n.t > 0.9 ? DANGER : BORDER}
            strokeWidth={n.t > 0.9 ? 2.5 : 1.5}
          />
          <text x={n.x} y={n.y + 4} fontSize="8.5" fill="#ffffff" textAnchor="middle" fontWeight="500">
            {n.name}
          </text>
        </g>
      ))}

      <text x="160" y="14" fontSize="9" fill={MUTED} textAnchor="middle">
        treat Gamma → resistance spreads outward along connections
      </text>
    </svg>
  );
}

// ─── Moment 3: economics failure trajectory ──────────────────────────────
// dual-axis line: cash climbs (the rational underinvestment payoff) while
// societal resistance climbs to the crisis line — the "you won at money,
// society lost" outcome.
export function MomentThreeChart() {
  return (
    <svg viewBox="0 0 320 180" className={SVG_CLASS} role="img" aria-label="economics: cash up, resistance up to crisis">
      {/* axes */}
      <line x1="30" y1="20" x2="30" y2="155" stroke={BORDER} />
      <line x1="30" y1="155" x2="305" y2="155" stroke={BORDER} />
      <line x1="305" y1="20" x2="305" y2="155" stroke={BORDER} />

      <text x="30" y="14" fontSize="9" fill={MUTED}>cash ($M)</text>
      <text x="305" y="14" fontSize="9" fill={MUTED} textAnchor="end">resistance</text>
      <text x="300" y="170" fontSize="9" fill={MUTED} textAnchor="end">years →</text>

      {/* crisis threshold dashed line near the top */}
      <line x1="30" y1="35" x2="305" y2="35" stroke={DANGER} strokeDasharray="3 3" opacity="0.55" />
      <text x="305" y="32" fontSize="8" fill={DANGER} textAnchor="end">crisis @ 100%</text>

      {/* cash line — climbs steadily, profit-optimizer doing fine */}
      <polyline
        fill="none"
        stroke={NEUTRAL}
        strokeWidth="2.5"
        strokeLinejoin="round"
        points="30,140 60,132 90,125 120,117 150,108 180,98 210,86 240,72 270,57 300,42"
      />
      <text x="300" y="50" fontSize="9.5" fill={NEUTRAL} textAnchor="end" fontWeight="500">
        cash ↑
      </text>

      {/* resistance line — climbs alongside, hits the crisis line */}
      <polyline
        fill="none"
        stroke={DANGER}
        strokeWidth="2.5"
        strokeLinejoin="round"
        points="30,145 60,138 90,130 120,118 150,103 180,87 210,72 240,58 270,46 300,37"
      />
      <text x="300" y="125" fontSize="9.5" fill={DANGER} textAnchor="end" fontWeight="500">
        resistance ↑
      </text>
    </svg>
  );
}

// ─── system diagram for the how-it-works section ─────────────────────────
// one center engine box with spokes to the six views. matches the README's
// mental model but rendered as inline SVG so next.js renders it natively.
export function SystemDiagram() {
  const engine = { x: 360, y: 40, w: 320, h: 60 };
  const views = [
    { x: 30, y: 180, w: 140, h: 56, title: "evolution", sub: "controls + charts" },
    { x: 195, y: 180, w: 140, h: 56, title: "diagnosis", sub: "lagged lab result" },
    { x: 360, y: 180, w: 140, h: 56, title: "surveillance", sub: "N engines + transfer" },
    { x: 525, y: 180, w: 140, h: 56, title: "explain", sub: "groq tutor" },
    { x: 690, y: 180, w: 140, h: 56, title: "export", sub: "google docs" },
    { x: 870, y: 180, w: 140, h: 56, title: "economics", sub: "separate model" },
  ];
  const cx = (b: { x: number; w: number }) => b.x + b.w / 2;
  const cy = (b: { y: number; h: number }) => b.y + b.h / 2;

  return (
    <svg
      viewBox="0 0 1040 270"
      className="h-auto w-full max-w-[1040px] rounded-md border bg-card"
      role="img"
      aria-label="one engine, six views — system diagram"
    >
      {/* engine box */}
      <rect
        x={engine.x}
        y={engine.y}
        width={engine.w}
        height={engine.h}
        rx="10"
        fill="var(--color-card)"
        stroke={NEUTRAL}
        strokeWidth="2"
      />
      <text x={cx(engine)} y={engine.y + 24} fontSize="14" fontWeight="600" textAnchor="middle" fill={NEUTRAL}>
        evolution engine
      </text>
      <text x={cx(engine)} y={engine.y + 44} fontSize="11" textAnchor="middle" fill={MUTED}>
        growth · mutation · selection · dose decay
      </text>

      {/* connectors */}
      {views.map((v, i) => {
        const dashed = v.title === "economics";
        return (
          <line
            key={`line-${i}`}
            x1={cx(engine)}
            y1={engine.y + engine.h}
            x2={cx(v)}
            y2={v.y}
            stroke={dashed ? MUTED : NEUTRAL}
            strokeDasharray={dashed ? "4 4" : undefined}
            strokeOpacity={dashed ? 0.55 : 0.45}
            strokeWidth="1.5"
          />
        );
      })}

      {/* view boxes */}
      {views.map((v) => {
        const isEcon = v.title === "economics";
        return (
          <g key={v.title}>
            <rect
              x={v.x}
              y={v.y}
              width={v.w}
              height={v.h}
              rx="8"
              fill="var(--color-card)"
              stroke={isEcon ? MUTED : NEUTRAL}
              strokeDasharray={isEcon ? "4 4" : undefined}
              strokeWidth="1.5"
            />
            <text x={cx(v)} y={v.y + 22} fontSize="12" fontWeight="500" textAnchor="middle" fill={NEUTRAL}>
              {v.title}
            </text>
            <text x={cx(v)} y={v.y + 38} fontSize="10" textAnchor="middle" fill={MUTED}>
              {v.sub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
