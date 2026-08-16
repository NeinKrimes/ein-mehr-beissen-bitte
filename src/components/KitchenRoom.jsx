import { useMemo } from "react";
import { MEALS, mealByDay } from "../data/mealStats";
import { COLORS, FONTS, label, mono, display, rgba, hairline } from "../theme";

const monthCost = MEALS.reduce((sum, meal) => sum + meal.cost, 0);
const avgKcal = Math.round(MEALS.reduce((sum, meal) => sum + meal.kcal, 0) / MEALS.length);

function PantryStat({ labelText, value, color }) {
  return (
    <div style={{ padding: "15px 17px", background: COLORS.pageAlt, border: hairline }}>
      <div style={label(8, COLORS.faint, ".15em")}>{labelText}</div>
      <div style={{ ...mono(16, color), marginTop: 6 }}>{value}</div>
    </div>
  );
}

export default function KitchenRoom({ saved, onToggleSave, onOpenRecipe, onOpenShopping }) {
  // Memoize mapping, filtering and sorting to only run when the 'saved' set changes
  const savedMeals = useMemo(() => {
    return [...saved].map(mealByDay).filter(Boolean).sort((a, b) => a.day - b.day);
  }, [saved]);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", color: COLORS.parchment, background: COLORS.ground }}>
      <div style={{ minHeight: "100%", padding: "34px clamp(20px,4vw,54px) 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...label(10, COLORS.gold, ".3em"), marginBottom: 8 }}>My kitchen · open pantry</div>
            <div style={{ ...display(42, 1), color: COLORS.parchment }}>Recipes worth <span style={{ fontStyle: "italic", color: COLORS.gold }}>cooking again.</span></div>
            <div style={{ fontFamily: FONTS.body, fontStyle: "italic", color: COLORS.muted, marginTop: 9 }}>Your saved recipes, provisions, and next grocery run — all on one counter.</div>
          </div>
          <button onClick={onOpenShopping} style={{ ...label(10, COLORS.ground, ".15em"), background: COLORS.gold, border: `1px solid ${COLORS.gold}`, borderRadius: 4, padding: "13px 20px", cursor: "pointer" }}>Open shopping list</button>
        </div>

        <div style={{ height: 18, marginTop: 25, borderTop: hairline }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(130px, 1fr))", maxWidth: 760, gap: 7, marginBottom: 34 }}>
          <PantryStat labelText="Recipe tin" value={`${savedMeals.length} saved`} color={COLORS.oak} />
          <PantryStat labelText="Monthly provisions" value={`$${monthCost.toFixed(2)}`} color={COLORS.green} />
          <PantryStat labelText="Average plate" value={`$${(monthCost / MEALS.length).toFixed(2)}`} color={COLORS.green} />
          <PantryStat labelText="Average energy" value={`${avgKcal} kcal`} color={COLORS.amber} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <span style={{ ...label(10, COLORS.muted, ".2em"), whiteSpace: "nowrap" }}>Recipe rail</span>
          <span style={{ height: 1, background: COLORS.border, flex: 1 }} />
          <span style={{ ...mono(10, COLORS.faint) }}>tap a card to cook</span>
        </div>

        {savedMeals.length === 0 ? (
          <div style={{ maxWidth: 620, padding: "38px", border: `1px dashed ${COLORS.borderStrong}`, background: COLORS.page, textAlign: "center" }}>
            <div style={{ ...display(25), color: COLORS.parchment }}>The recipe rail is empty.</div>
            <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 15, color: COLORS.muted, lineHeight: 1.6, marginTop: 8 }}>Open any recipe and choose “Save to kitchen.” It will stay here when you come back.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(235px, 1fr))", gap: 18 }}>
            {savedMeals.map((meal) => (
              <article key={meal.day} style={{ position: "relative", minHeight: 208, padding: "20px 19px 17px", background: COLORS.page, border: hairline, borderRadius: 3 }}>
                <div style={{ position: "absolute", top: -7, left: "50%", width: 42, height: 13, transform: "translateX(-50%) rotate(-1deg)", background: rgba(COLORS.oak, .24) }} />
                <button onClick={() => onToggleSave(meal.day)} aria-label={`Remove ${meal.meal} from My Kitchen`} style={{ position: "absolute", top: 10, right: 10, background: "transparent", border: 0, color: COLORS.faint, cursor: "pointer", fontSize: 17 }}>×</button>
                <div onClick={() => onOpenRecipe(meal.day)} style={{ cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", flex: "0 0 44px", background: `linear-gradient(${rgba(meal.color,.20)},${rgba(meal.color,.20)}), ${COLORS.plate}`, border: `1px solid ${rgba(meal.color,.45)}` }} />
                    <div><div style={label(8, meal.color, ".13em")}>{meal.cuisine} · day {meal.day}</div><div style={{ ...mono(10, COLORS.faint), marginTop: 5 }}>{meal.time} min active</div></div>
                  </div>
                  <div style={{ ...display(24, 1.05), color: COLORS.parchment, marginTop: 18 }}>{meal.short}</div>
                  <div style={{ fontFamily: FONTS.body, color: COLORS.muted, fontStyle: "italic", lineHeight: 1.35, fontSize: 13, marginTop: 7 }}>{meal.anchor}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: hairline, paddingTop: 11, marginTop: "auto" }}><span style={mono(11, COLORS.green)}>${meal.cost.toFixed(2)}</span><span style={label(8, COLORS.oak, ".10em")}>Open recipe →</span></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
