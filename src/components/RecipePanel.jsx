import { T, cuisineColor } from "../theme";
import { Button, Plate, Eyebrow } from "./Gloam";
import DataChip, { StatRail } from "./DataChip";
import MacroDonut from "./MacroDonut";
import ValueGauge from "./ValueGauge";

// The recipe page. Opens because you chose a line — overview to detail, a cross-fade
// over a plum veil. Never a slide, never on hover.
export default function RecipePanel({ day, entry, onClose, valueRange, cooked, onToggleCooked }) {
  if (!day) return null;
  const color = cuisineColor(day.cuisine);
  const loading = !!entry?.loading;
  const recipe = entry && !entry.loading && !entry.error ? entry : null;
  const cost = recipe && Number.isFinite(Number(recipe.est_cost_usd)) ? Number(recipe.est_cost_usd) : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(36,26,46,0.5), rgba(8,8,10,0.7))", backdropFilter: "blur(18px)" }} />
      <div className="rise" style={{
        position: "relative", width: "min(600px, 100%)", height: "100%", overflowY: "auto",
        background: T.bg, borderLeft: `1px solid ${T.line}`, boxShadow: T.modal, padding: "26px 30px 70px",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <Button variant="ghost-dark" size="sm" onClick={onClose}>Close</Button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
          <span style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: T.ink2 }}>
            {day.cuisine} · day {day.day} · {day.type === "ANCHOR" ? "anchor night" : "chain"}
          </span>
        </div>
        <h2 className="serif" style={{ margin: 0, fontSize: "clamp(30px,4.4vw,44px)", lineHeight: 1, color: T.ink }}>{day.meal}</h2>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 14 }}>
            <div className="mono" style={{ color: T.ink3, fontSize: 12, letterSpacing: ".1em" }}>Setting the table…</div>
          </div>
        )}
        {entry?.error && <p style={{ color: "#e06b4a", fontFamily: T.body, marginTop: 24 }}>{entry.error}</p>}

        {recipe && (
          <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 20 }}>
            <p style={{ fontFamily: T.body, fontSize: 17, lineHeight: 1.72, color: T.ink2, margin: 0, maxWidth: "48ch" }}>{recipe.description}</p>
            <Plate shape="rect" height={220} label="Photograph · the dish" tint={color} />

            <StatRail items={[
              recipe.servings && { label: "Serves", value: recipe.servings },
              recipe.prepTime && { label: "Prep", value: recipe.prepTime },
              recipe.cookTime && { label: "Cook", value: recipe.cookTime },
              cost != null && { label: "Per serving", value: `$${cost.toFixed(2)}`, tone: T.frugal },
            ]} />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Number.isFinite(Number(recipe.cal_per_dollar)) && <DataChip label="value" value={`${Math.round(recipe.cal_per_dollar)} cal/$`} tone="frugal" />}
              {Number.isFinite(Number(recipe.calories)) && <DataChip label="energy" value={`${recipe.calories} kcal`} tone="cal" />}
              {Number.isFinite(Number(recipe.protein_g)) && <DataChip label="protein" value={`${recipe.protein_g} g`} />}
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rMd, padding: 20, display: "flex", flexDirection: "column", gap: 22 }}>
              <MacroDonut recipe={recipe} />
              {valueRange && Number.isFinite(Number(recipe.cal_per_dollar)) && (
                <ValueGauge value={recipe.cal_per_dollar} min={valueRange.min} max={valueRange.max} />
              )}
            </div>

            {recipe.passiveTip && (
              <p style={{ fontFamily: T.body, fontStyle: "italic", fontSize: 15, lineHeight: 1.7, color: T.ink2, margin: 0, paddingLeft: 16, borderLeft: `2px solid ${T.line}` }}>
                While it cooks — {recipe.passiveTip}
              </p>
            )}

            <div>
              <Eyebrow style={{ marginBottom: 16 }}>What you need</Eyebrow>
              <div>
                {recipe.ingredients?.map((ing, i) => (
                  <div key={i} className="leader" style={{ padding: "8px 0", cursor: "default", borderTop: i ? `1px solid ${T.lineSoft}` : "none" }}>
                    <span style={{ fontFamily: T.body, fontSize: 15, color: T.ink }}>{ing.item}</span>
                    <span className="leader-fill" />
                    <span className="mono" style={{ fontSize: 12.5, color: T.ink2 }}>{ing.amount} {ing.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Eyebrow style={{ marginBottom: 18 }}>The method</Eyebrow>
              {recipe.steps?.map((step, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, marginBottom: 18 }}>
                  <span className="mono" style={{ fontSize: 13, color: T.gold, paddingTop: 2 }}>{String(step.n).padStart(2, "0")}</span>
                  <div>
                    <div className="serif" style={{ fontSize: 18, color: T.ink, marginBottom: 4 }}>{step.title}</div>
                    <div style={{ fontFamily: T.body, fontSize: 15, lineHeight: 1.66, color: T.ink2 }}>{step.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {(recipe.frugalTips?.length || recipe.leftoversUse) && (
              <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.rMd, padding: 20 }}>
                <Eyebrow style={{ marginBottom: 14 }}>Waste nothing</Eyebrow>
                {recipe.frugalTips?.map((tip, i) => (
                  <div key={i} style={{ fontFamily: T.body, fontSize: 14.5, lineHeight: 1.6, color: T.ink2, marginBottom: 8 }}>— {tip}</div>
                ))}
                {recipe.leftoversUse && <div style={{ fontFamily: T.body, fontStyle: "italic", fontSize: 14.5, color: T.frugal, marginTop: 10 }}>Tomorrow · {recipe.leftoversUse}</div>}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <Button variant={cooked ? "ghost-dark" : "gold"} glow={!cooked} onClick={() => onToggleCooked(day.mealId)}>
                {cooked ? "✓ Cooked — undo" : "Mark as cooked"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
