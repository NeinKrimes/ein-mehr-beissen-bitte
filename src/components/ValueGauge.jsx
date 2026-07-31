import { useEffect, useState } from "react";
import { T } from "../theme";

// Value against the month. Amber (leanest) warms into green (best value) across
// the sweep; a needle marks this dish. Range defaults to the plan's 200 → 644.
export default function ValueGauge({ value, min = 200, max = 644, label = "cal / $" }) {
  const v = Number(value);
  const ok = Number.isFinite(v) && max > min;
  const target = ok ? Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100)) : 0;
  const [pct, setPct] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setPct(target)); return () => cancelAnimationFrame(id); }, [target]);
  if (!ok) return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <span style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: T.ink2 }}>{label}</span>
        <b className="mono" style={{ fontSize: 16, color: T.frugal }}>{Math.round(v)}</b>
      </div>
      <div style={{ position: "relative", height: 8, borderRadius: T.rPill,
        background: `linear-gradient(90deg, ${T.cal} 0%, ${T.cal}aa 35%, ${T.frugal}cc 100%)` }}>
        <div style={{ position: "absolute", top: -4, left: `${pct}%`, width: 2, height: 16, background: T.ink,
          transform: "translateX(-50%)", borderRadius: 2, transition: `left 420ms ${T.ease}`,
          boxShadow: "0 0 6px rgba(0,0,0,.6)" }} />
      </div>
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: T.ink3, marginTop: 8, letterSpacing: ".08em" }}>
        <span>{Math.round(min)} · leanest</span>
        <span>{Math.round(max)} · best value</span>
      </div>
    </div>
  );
}
