import { useState } from "react";
import { chains } from "../data/chains";
import { mealsByChain } from "../data/mealStats";
import { COLORS, FONTS, CUISINE_COLORS, label, display, parch, rgba } from "../theme";

// The Web — every chain at once. Anchors ring an inner circle, their
// follow-ups fan outward within each chain's own sector (mirroring the
// anchor→becomes flow from ChainsRoom, wrapped around a circle instead of
// laid left-to-right). Thin arcs connect meals across DIFFERENT chains that
// share a cuisine — the cross-chain "web" the rest of the app only shows
// one chapter of at a time.

const SIZE = 640;
const CENTER = SIZE / 2;
const R_ANCHOR = 130;
const R_MEAL = 250;
const N = chains.length;

function angleFor(i) {
  return (i / N) * Math.PI * 2 - Math.PI / 2;
}

function buildLayout() {
  const nodes = [];
  const spokes = [];

  chains.forEach((c, i) => {
    const baseAngle = angleFor(i);
    const meals = mealsByChain(c.id);
    const anchor = meals.find((m) => m.type === "ANCHOR") ?? meals[0];
    const followups = meals.filter((m) => m.type !== "ANCHOR");

    const ax = CENTER + R_ANCHOR * Math.cos(baseAngle);
    const ay = CENTER + R_ANCHOR * Math.sin(baseAngle);
    nodes.push({ ...anchor, x: ax, y: ay, r: 20, chainAngle: baseAngle });

    const sectorSpread = ((Math.PI * 2) / N) * 0.68;
    followups.forEach((m, j) => {
      const t = followups.length > 1 ? j / (followups.length - 1) - 0.5 : 0;
      const angle = baseAngle + t * sectorSpread;
      const x = CENTER + R_MEAL * Math.cos(angle);
      const y = CENTER + R_MEAL * Math.sin(angle);
      nodes.push({ ...m, x, y, r: 12, chainAngle: baseAngle });
      spokes.push({ chainId: c.id, x1: ax, y1: ay, x2: x, y2: y, day2: m.day });
    });
  });

  // Cross-links: same cuisine, different chains.
  const links = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (a.chainId === b.chainId || a.cuisine !== b.cuisine) continue;
      links.push({ a: a.day, b: b.day, x1: a.x, y1: a.y, x2: b.x, y2: b.y, cuisine: a.cuisine });
    }
  }

  return { nodes, spokes, links };
}

const { nodes, spokes, links } = buildLayout();

export default function WebRoom({ onOpenRecipe }) {
  const [hoverDay, setHoverDay] = useState(null);
  const hoverNode = hoverDay != null ? nodes.find((n) => n.day === hoverDay) : null;

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0, background: COLORS.page, position: "relative" }}>
      <div style={{ position: "absolute", top: 40, left: 48, maxWidth: 260 }}>
        <div style={label(10, COLORS.gold, ".3em")}>The web</div>
        <div style={{ ...display(30), color: COLORS.parchment, marginTop: 10 }}>
          Every chain, at once
        </div>
        <div style={{ fontFamily: FONTS.body, fontSize: 14, lineHeight: 1.6, color: COLORS.faint, marginTop: 10 }}>
          Ten anchors, thirty meals. Arcs connect dishes across different anchors that
          share a cuisine — hover a node to trace them.
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 36, left: 48, display: "flex", flexWrap: "wrap", gap: "8px 18px", maxWidth: 260 }}>
        {Object.entries(CUISINE_COLORS).map(([cuisine, color]) => (
          <div key={cuisine} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={label(9, parch(0.5), ".08em")}>{cuisine}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="xMidYMid meet" style={{ width: "min(100%, 84vh)", height: "min(100%, 84vh)" }}>
          {spokes.map((s, i) => {
            const active = hoverNode && (hoverNode.day === s.day2 || hoverNode.chainId === s.chainId);
            return (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke={parch(hoverNode ? (active ? 0.32 : 0.04) : 0.14)} strokeWidth={1} />
            );
          })}

          {links.map((l, i) => {
            const active = hoverNode && (hoverNode.day === l.a || hoverNode.day === l.b);
            const mx = CENTER + (l.x1 - CENTER + l.x2 - CENTER) * 0.18;
            const my = CENTER + (l.y1 - CENTER + l.y2 - CENTER) * 0.18;
            return (
              <path key={i} d={`M ${l.x1} ${l.y1} Q ${mx} ${my} ${l.x2} ${l.y2}`}
                fill="none" stroke={rgba(CUISINE_COLORS[l.cuisine], hoverNode ? (active ? 0.85 : 0.03) : 0.14)}
                strokeWidth={active ? 1.6 : 1} style={{ transition: "stroke 200ms ease" }} />
            );
          })}

          {nodes.map((n) => {
            const isAnchor = n.type === "ANCHOR";
            const dim = hoverNode && hoverNode.day !== n.day && hoverNode.chainId !== n.chainId && hoverNode.cuisine !== n.cuisine;
            return (
              <g key={n.day}
                onMouseEnter={() => setHoverDay(n.day)}
                onMouseLeave={() => setHoverDay(null)}
                onClick={() => onOpenRecipe?.(n.day)}
                style={{ cursor: "pointer", opacity: dim ? 0.35 : 1, transition: "opacity 200ms ease" }}>
                <circle cx={n.x} cy={n.y} r={n.r}
                  fill={rgba(n.color, isAnchor ? 0.5 : 0.3)}
                  stroke={isAnchor ? "rgba(232,160,32,0.6)" : rgba(n.color, 0.4)}
                  strokeWidth={isAnchor ? 1.5 : 1} />
                {isAnchor && (
                  <text x={n.x} y={n.y - n.r - 8} textAnchor="middle"
                    style={{ fontFamily: FONTS.label, fontSize: 9, fontWeight: 700, letterSpacing: ".04em", fill: parch(0.6) }}>
                    {n.emoji} {n.short}
                  </text>
                )}
                <title>{n.meal} — {n.cuisine} · day {n.day}</title>
              </g>
            );
          })}
        </svg>
      </div>

      {hoverNode && (
        <div style={{ position: "absolute", top: 40, right: 48, textAlign: "right", maxWidth: 260 }}>
          <div style={label(9, hoverNode.color, ".14em")}>{hoverNode.cuisine} · day {hoverNode.day}</div>
          <div style={{ ...display(22), color: COLORS.parchment, marginTop: 6 }}>{hoverNode.meal}</div>
          <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 13, color: COLORS.faint, marginTop: 6 }}>
            from {hoverNode.anchor}
          </div>
        </div>
      )}
    </div>
  );
}
