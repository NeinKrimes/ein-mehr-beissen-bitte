import { T } from "../theme";

const TONES = { neutral: T.ink2, frugal: T.frugal, cal: T.cal, gold: T.gold };

// Hairline pill. Numbers are mono; the label is a small sans caption.
export default function DataChip({ label, value, tone = "neutral", title }) {
  const fg = TONES[tone] ?? T.ink2;
  return (
    <span title={title} style={{
      display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
      padding: "4px 11px", borderRadius: T.rPill, border: `1px solid ${T.line}`,
    }}>
      {label && <span style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: T.ink3 }}>{label}</span>}
      <b className="mono" style={{ fontWeight: 600, fontSize: 12, color: fg }}>{value}</b>
    </span>
  );
}

// Stat rail — the printed cookbook's servings bar. Ruled, not boxed.
export function StatRail({ items, style }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", ...style }}>
      {items.filter(Boolean).map((it, i) => (
        <div key={it.label} style={{
          padding: "2px 22px 2px 0", marginRight: 22,
          borderRight: i < items.length - 1 ? `1px solid ${T.line}` : "none",
        }}>
          <div style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase", color: T.ink3, marginBottom: 5 }}>{it.label}</div>
          <div className="mono" style={{ fontSize: 15, color: it.tone || T.ink }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}
