import { useState, useMemo } from "react";
import { T, cuisineColor, LENSES } from "../theme";
import { Eyebrow } from "./Gloam";

// The contents page: thirty nights as dotted leaders, re-ordered by one lens at a time.
export default function CalendarView({ flatDays, getRecipe, onSelectDay, isCooked, selectedMealId }) {
  const [lensKey, setLensKey] = useState("value");
  const lens = LENSES.find((l) => l.key === lensKey);

  const rows = useMemo(() => {
    const withVal = flatDays.map((d) => {
      const rec = getRecipe(d.mealId);
      const r = rec && !rec.loading && !rec.error ? rec : null;
      return { ...d, r, val: lens.field(r) };
    });
    return withVal.sort((a, b) => {
      if (a.val == null) return 1;
      if (b.val == null) return -1;
      return lens.better === "low" ? a.val - b.val : b.val - a.val;
    });
  }, [flatDays, getRecipe, lens]);

  const maxVal = useMemo(() => Math.max(...rows.map((r) => r.val || 0), 1), [rows]);
  const fmt = (v) => (lens.key === "cost" ? `$${Number(v).toFixed(2)}` : Math.round(v));

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 24px 96px" }}>
      <Eyebrow numeral="◆" style={{ marginBottom: 18 }}>Contents · thirty nights</Eyebrow>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        <h1 className="serif" style={{ margin: 0, fontSize: "clamp(34px,5vw,54px)", lineHeight: .98, color: T.ink, maxWidth: "16ch" }}>
          Thirty nights, one <span style={{ fontStyle: "italic", color: T.gold }}>lens</span> at a time.
        </h1>
        <div>
          <div style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 9, letterSpacing: ".2em", textTransform: "uppercase", color: T.ink3, marginBottom: 9, textAlign: "right" }}>Ordered by</div>
          <div style={{ display: "flex", gap: 4, background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rPill, padding: 4 }}>
            {LENSES.map((l) => {
              const on = lensKey === l.key;
              return (
                <button key={l.key} onClick={() => setLensKey(l.key)} style={{
                  cursor: "pointer", border: "none", borderRadius: T.rPill, padding: "7px 15px",
                  fontFamily: T.sans, fontWeight: on ? 700 : 500, fontSize: 12, letterSpacing: ".02em",
                  color: on ? T.bg : T.ink2, background: on ? T.gold : "transparent",
                  transition: `background ${T.durBase} ${T.ease}, color ${T.durBase} ${T.ease}`,
                }}>{l.label}</button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 56, marginTop: 44, alignItems: "start" }}>
        {/* Contents list — dotted leaders */}
        <div>
          {rows.map((d, i) => {
            const color = cuisineColor(d.cuisine);
            const cooked = isCooked(d.mealId);
            const selected = selectedMealId === d.mealId;
            return (
              <div key={d.mealId} className="leader" onClick={() => onSelectDay(d.day)} role="button" tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectDay(d.day)}
                style={{ padding: "12px 0", borderTop: i ? `1px solid ${T.lineSoft}` : "none", color: selected ? T.ink : T.ink2 }}>
                <span className="mono" style={{ fontSize: 12, color: T.ink3, minWidth: 26 }}>{i + 1 < 10 ? "0" : ""}{i + 1}</span>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, alignSelf: "center" }} />
                <span className="serif" style={{ fontSize: 20, color: cooked ? T.ink3 : (selected ? T.gold : T.ink), textDecoration: cooked ? "line-through" : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.meal}</span>
                <span className="leader-fill" />
                {d.val != null
                  ? <span className="mono" style={{ fontSize: 15, color: lens.color }}>{fmt(d.val)}<span style={{ fontSize: 9.5, color: T.ink3, marginLeft: 5 }}>{lens.unit}</span></span>
                  : <span className="mono" style={{ fontSize: 12, color: T.ink3 }}>{d.cost}</span>}
              </div>
            );
          })}
        </div>

        {/* Value-against-the-month rail */}
        <aside style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rMd, padding: 22, position: "sticky", top: 88 }}>
          <div style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 9, letterSpacing: ".2em", textTransform: "uppercase", color: T.ink3, marginBottom: 4 }}>{lens.label} against the month</div>
          {lens.key === "value" && <div className="mono" style={{ fontSize: 11, color: T.ink3, marginBottom: 16 }}>200 → 644 cal/$</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 12 }}>
            {rows.slice(0, 6).map((d) => (
              <div key={d.mealId} onClick={() => onSelectDay(d.day)} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
                  <span className="serif" style={{ fontSize: 14, color: T.ink2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.meal}</span>
                  <span className="mono" style={{ fontSize: 12, color: lens.color, flexShrink: 0 }}>{d.val != null ? fmt(d.val) : "—"}</span>
                </div>
                <div style={{ height: 4, borderRadius: T.rPill, background: T.bg, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${d.val ? Math.max(5, (d.val / maxVal) * 100) : 0}%`, background: lens.color, borderRadius: T.rPill }} />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
