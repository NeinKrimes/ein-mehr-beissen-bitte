import { T, cuisineColor } from "../theme";
import { chains, mealId } from "../data/chains";
import { Eyebrow, Button, Plate } from "./Gloam";
import { StatRail } from "./DataChip";

const num2 = (n) => String(n).padStart(2, "0");
const firstSentence = (t) => (t ? String(t).split(/\.\s/)[0].replace(/\.$/, "") + "." : "");

// The chapter spread: anchor on the left page, the chain it becomes on the right.
export default function ChainsView({ getRecipe, onSelectDay, isCooked, selectedMealId }) {
  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 24px 96px" }}>
      <header style={{ marginBottom: 40 }}>
        <Eyebrow numeral="◆" style={{ marginBottom: 18 }}>Chains · 10 anchors · 30 nights</Eyebrow>
        <h1 className="serif" style={{ margin: 0, fontSize: "clamp(40px,7vw,74px)", lineHeight: .96, color: T.ink, letterSpacing: "-.01em" }}>
          Cook once. <span style={{ fontStyle: "italic", color: T.gold }}>Eat worldly.</span>
        </h1>
        <p style={{ fontFamily: T.body, fontSize: 17, lineHeight: 1.7, color: T.ink2, maxWidth: "46ch", marginTop: 18 }}>
          One anchor ingredient, cooked once on a quiet afternoon, becomes a week of dinners across four kitchens. Turn the page for each.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>
        {chains.map((chain, i) => (
          <Spread key={chain.id} chain={chain} index={i} getRecipe={getRecipe} onSelectDay={onSelectDay} isCooked={isCooked} selectedMealId={selectedMealId} />
        ))}
      </div>
    </div>
  );
}

function Spread({ chain, index, getRecipe, onSelectDay, isCooked, selectedMealId }) {
  const recs = chain.days.map((d) => ({ d, r: cleanRec(getRecipe(mealId(chain.id, d.day))) }));
  const anchorRec = recs[0]?.r;
  const costs = recs.map((x) => Number(x.r?.est_cost_usd)).filter(Number.isFinite);
  const vals = recs.map((x) => Number(x.r?.cal_per_dollar)).filter(Number.isFinite);
  const total = costs.length ? costs.reduce((a, b) => a + b, 0) : null;
  const avgVal = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  const dayFrom = chain.days[0].day, dayTo = chain.days[chain.days.length - 1].day;

  return (
    <article className="rise" style={{
      display: "grid", gridTemplateColumns: "0.9fr 1fr", gap: 48, alignItems: "start",
      borderTop: `1px solid ${T.line}`, paddingTop: 40,
    }}>
      {/* LEFT PAGE — the anchor */}
      <div>
        <Eyebrow numeral={num2(index + 1)} style={{ marginBottom: 20 }}>Chapter · the anchor</Eyebrow>
        <h2 className="serif" style={{ margin: 0, fontSize: "clamp(32px,4vw,50px)", lineHeight: .98, color: T.ink }}>{chain.anchor}</h2>
        <p style={{ fontFamily: T.body, fontSize: 16, lineHeight: 1.7, color: T.ink2, maxWidth: "42ch", margin: "16px 0 22px" }}>
          {anchorRec?.description ? firstSentence(anchorRec.description) : "Cooked once, unattended, then pulled apart across the week."}
        </p>
        <Plate shape="rect" height={210} label="Photograph · the anchor" tint={cuisineColor(chain.days[0].cuisine)} style={{ marginBottom: 22 }} />
        <StatRail items={[
          { label: "Cook once", value: passiveShort(chain.passive) },
          { label: "Feeds", value: `${recs.length} dinners` },
          total != null && { label: "Total", value: `$${total.toFixed(2)}` },
          avgVal != null && { label: "Average", value: `${avgVal} cal/$`, tone: T.frugal },
        ]} style={{ marginBottom: 24 }} />
        <Button variant="gold" glow onClick={() => onSelectDay(chain.days[0].day)}>Start the chain →</Button>
      </div>

      {/* RIGHT PAGE — what it becomes */}
      <div>
        <Eyebrow style={{ marginBottom: 22 }}>{`What it becomes · Days ${dayFrom}–${dayTo}`}</Eyebrow>
        <div>
          {recs.map(({ d, r }, k) => {
            const color = cuisineColor(d.cuisine);
            const id = mealId(chain.id, d.day);
            const cooked = isCooked(id);
            const selected = selectedMealId === id;
            return (
              <div key={d.day} className="branch" onClick={() => onSelectDay(d.day)} role="button" tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectDay(d.day)}
                style={{
                  display: "grid", gridTemplateColumns: "1fr auto", gap: 18, alignItems: "baseline", cursor: "pointer",
                  padding: "18px 4px 18px 18px", borderTop: k ? `1px solid ${T.line}` : "none",
                  borderLeft: `2px solid ${selected ? color : "transparent"}`,
                  animationDelay: `${k * 160}ms`,
                }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                    <span style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: T.ink2 }}>
                      {d.cuisine} · day {d.day}{d.type === "ANCHOR" ? " · anchor" : ""}
                    </span>
                  </div>
                  <div className="serif" style={{ fontSize: 25, lineHeight: 1.05, color: cooked ? T.ink2 : T.ink, textDecoration: cooked ? "line-through" : "none" }}>{d.meal}</div>
                  {r?.description && <div style={{ fontFamily: T.body, fontSize: 14.5, lineHeight: 1.6, color: T.ink3, marginTop: 6, maxWidth: "40ch" }}>{firstSentence(r.description)}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  {r && Number.isFinite(Number(r.cal_per_dollar)) ? (
                    <>
                      <div className="mono" style={{ fontSize: 22, color: T.frugal, lineHeight: 1 }}>{Math.round(r.cal_per_dollar)}</div>
                      <div className="mono" style={{ fontSize: 9.5, color: T.ink3, letterSpacing: ".08em", marginTop: 3 }}>cal/$</div>
                      <div className="mono" style={{ fontSize: 10.5, color: T.ink3, marginTop: 7 }}>{r.calories} kcal · ${Number(r.est_cost_usd).toFixed(2)}</div>
                    </>
                  ) : <div className="mono" style={{ fontSize: 13, color: T.ink3 }}>{d.cost}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

const cleanRec = (e) => (e && !e.loading && !e.error ? e : null);
function passiveShort(passive) {
  const m = /~?\s*([\d.]+\s*(hr|hrs|hour|min))/i.exec(passive || "");
  return m ? m[1].replace(/hrs?/, "hr") : "passive";
}
