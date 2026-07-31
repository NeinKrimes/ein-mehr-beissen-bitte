import { useMemo } from "react";
import { T, cuisineColor } from "../theme";
import { Eyebrow, Button } from "./Gloam";
import { StatRail } from "./DataChip";

// My Kitchen — your month, tracked. Progress, the plan's ledger, and the shopping list.
export default function MyKitchen({ flatDays, getRecipe, cooked, onOpenShopping, onSelectDay }) {
  const stats = useMemo(() => {
    const loaded = flatDays.map((d) => ({ d, r: getRecipe(d.mealId) })).filter((x) => x.r && !x.r.loading && !x.r.error);
    const costs = loaded.map((x) => Number(x.r.est_cost_usd)).filter(Number.isFinite);
    const vals = loaded.map((x) => Number(x.r.cal_per_dollar)).filter(Number.isFinite);
    const best = loaded.filter((x) => Number.isFinite(Number(x.r.cal_per_dollar))).sort((a, b) => b.r.cal_per_dollar - a.r.cal_per_dollar)[0];
    const cheapest = loaded.filter((x) => Number.isFinite(Number(x.r.est_cost_usd))).sort((a, b) => a.r.est_cost_usd - b.r.est_cost_usd)[0];
    return {
      monthCost: costs.length ? costs.reduce((a, b) => a + b, 0) : null,
      avgVal: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
      best, cheapest,
    };
  }, [flatDays, getRecipe]);

  const total = flatDays.length;
  const done = cooked.size;
  const pct = Math.round((done / total) * 100);

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 24px 96px" }}>
      <Eyebrow numeral="◆" style={{ marginBottom: 18 }}>My Kitchen</Eyebrow>
      <h1 className="serif" style={{ margin: 0, fontSize: "clamp(36px,5.4vw,58px)", lineHeight: .98, color: T.ink }}>
        Your month, <span style={{ fontStyle: "italic", color: T.gold }}>tracked.</span>
      </h1>

      {/* Ledger */}
      <StatRail style={{ marginTop: 28 }} items={[
        { label: "Cooked", value: `${done} / ${total}`, tone: T.frugal },
        stats.monthCost != null && { label: "Month cost", value: `$${stats.monthCost.toFixed(2)}` },
        stats.avgVal != null && { label: "Average value", value: `${stats.avgVal} cal/$`, tone: T.frugal },
      ]} />

      {/* Progress ribbon */}
      <div style={{ marginTop: 26, maxWidth: 620 }}>
        <div style={{ height: 6, borderRadius: T.rPill, background: T.surface, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: T.gold, borderRadius: T.rPill, transition: `width ${T.durSlow} ${T.ease}` }} />
        </div>
        <div className="mono" style={{ fontSize: 11, color: T.ink3, marginTop: 9, letterSpacing: ".06em" }}>{pct}% of the plan · mark meals cooked from any recipe page</div>
      </div>

      {/* Highlights */}
      {(stats.best || stats.cheapest) && (
        <div style={{ marginTop: 48 }}>
          <Eyebrow style={{ marginBottom: 20 }}>Highlights of the plan</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
            {stats.best && <Highlight tag="Best value" d={stats.best.d} r={stats.best.r} metric={`${Math.round(stats.best.r.cal_per_dollar)} cal/$`} onClick={() => onSelectDay(stats.best.d.day)} />}
            {stats.cheapest && <Highlight tag="Cheapest bowl" d={stats.cheapest.d} r={stats.cheapest.r} metric={`$${Number(stats.cheapest.r.est_cost_usd).toFixed(2)} / serving`} onClick={() => onSelectDay(stats.cheapest.d.day)} />}
          </div>
        </div>
      )}

      <div style={{ marginTop: 48 }}>
        <Button variant="gold" onClick={onOpenShopping}>Weekly shopping list →</Button>
      </div>
    </div>
  );
}

function Highlight({ tag, d, r, metric, onClick }) {
  const color = cuisineColor(d.cuisine);
  return (
    <div onClick={onClick} className="lift" role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      style={{ cursor: "pointer", paddingTop: 18, borderTop: `1px solid ${T.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
        <span style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: T.frugal }}>{tag}</span>
      </div>
      <div className="serif" style={{ fontSize: 26, lineHeight: 1.05, color: T.ink }}>{d.meal}</div>
      <div className="mono" style={{ fontSize: 12, color: T.ink3, marginTop: 8 }}>{d.cuisine} · <span style={{ color: T.frugal }}>{metric}</span> · {r.calories} kcal</div>
    </div>
  );
}
