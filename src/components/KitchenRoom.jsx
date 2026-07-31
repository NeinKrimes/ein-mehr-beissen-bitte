import { MEALS, mealByDay } from "../data/mealStats";
import { COLORS, FONTS, label, mono, display, rgba } from "../theme";

const monthCost = MEALS.reduce((sum, meal) => sum + meal.cost, 0);
const avgKcal = Math.round(MEALS.reduce((sum, meal) => sum + meal.kcal, 0) / MEALS.length);

function PantryStat({ labelText, value, color }) {
  return (
    <div style={{ padding: "15px 17px", background: "rgba(20,14,10,.72)", border: "1px solid rgba(184,137,84,.20)", boxShadow: "inset 0 1px rgba(255,255,255,.025)" }}>
      <div style={label(8, "#9f886f", ".15em")}>{labelText}</div>
      <div style={{ ...mono(16, color), marginTop: 6 }}>{value}</div>
    </div>
  );
}

export default function KitchenRoom({ saved, onToggleSave, onOpenRecipe, onOpenShopping }) {
  const savedMeals = [...saved].map(mealByDay).filter(Boolean).sort((a, b) => a.day - b.day);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", color: "#eadfce", background: "radial-gradient(circle at 80% 5%, rgba(218,139,49,.10), transparent 32%), linear-gradient(110deg, #17120f, #0d0d10 62%)" }}>
      <div style={{ minHeight: "100%", padding: "34px clamp(20px,4vw,54px) 48px", backgroundImage: "repeating-linear-gradient(90deg, transparent 0, transparent 79px, rgba(189,143,91,.025) 80px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...label(10, "#c9873e", ".3em"), marginBottom: 8 }}>My kitchen · open pantry</div>
            <div style={{ ...display(42, 1), color: "#f1e5d4" }}>Recipes worth <span style={{ fontStyle: "italic", color: "#d4a46d" }}>cooking again.</span></div>
            <div style={{ fontFamily: FONTS.body, fontStyle: "italic", color: "#8f7d6d", marginTop: 9 }}>Your saved recipes, provisions, and next grocery run — all on one counter.</div>
          </div>
          <button onClick={onOpenShopping} style={{ ...label(10, "#17100b", ".15em"), background: "linear-gradient(#e0aa62,#bd7735)", border: "1px solid #efbd78", borderRadius: 4, padding: "13px 20px", cursor: "pointer", boxShadow: "0 7px 24px rgba(0,0,0,.35), inset 0 1px rgba(255,255,255,.35)" }}>▤ Open shopping list</button>
        </div>

        <div style={{ height: 18, marginTop: 25, borderTop: "1px solid rgba(207,158,102,.30)", background: "linear-gradient(180deg, rgba(113,67,34,.36), transparent)", boxShadow: "0 -5px 18px rgba(0,0,0,.24)" }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(130px, 1fr))", maxWidth: 760, gap: 7, marginBottom: 34 }}>
          <PantryStat labelText="Recipe tin" value={`${savedMeals.length} saved`} color="#e1b779" />
          <PantryStat labelText="Monthly provisions" value={`$${monthCost.toFixed(2)}`} color={COLORS.green} />
          <PantryStat labelText="Average plate" value={`$${(monthCost / MEALS.length).toFixed(2)}`} color={COLORS.green} />
          <PantryStat labelText="Average energy" value={`${avgKcal} kcal`} color={COLORS.amber} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <span style={{ ...label(10, "#b99a79", ".2em"), whiteSpace: "nowrap" }}>Recipe rail</span>
          <span style={{ height: 1, background: "rgba(199,157,111,.20)", flex: 1 }} />
          <span style={{ ...mono(10, "#776657") }}>tap a card to cook</span>
        </div>

        {savedMeals.length === 0 ? (
          <div style={{ maxWidth: 620, padding: "38px", border: "1px dashed rgba(195,150,99,.28)", background: "rgba(20,14,11,.45)", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>▧</div>
            <div style={{ ...display(25), color: "#d9c7b3" }}>The recipe rail is empty.</div>
            <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 15, color: "#8d7a68", lineHeight: 1.6, marginTop: 8 }}>Open any recipe and choose “Save to kitchen.” It will stay here when you come back.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(235px, 1fr))", gap: 18 }}>
            {savedMeals.map((meal) => (
              <article key={meal.day} style={{ position: "relative", minHeight: 208, padding: "20px 19px 17px", background: "linear-gradient(145deg, rgba(48,34,25,.96), rgba(23,18,16,.98))", border: "1px solid rgba(190,145,94,.24)", borderRadius: 3, boxShadow: "0 12px 28px rgba(0,0,0,.28), inset 0 1px rgba(255,255,255,.025)" }}>
                <div style={{ position: "absolute", top: -7, left: "50%", width: 42, height: 13, transform: "translateX(-50%) rotate(-1deg)", background: "rgba(205,178,130,.36)", boxShadow: "0 2px 5px rgba(0,0,0,.28)" }} />
                <button onClick={() => onToggleSave(meal.day)} aria-label={`Remove ${meal.meal} from My Kitchen`} style={{ position: "absolute", top: 10, right: 10, background: "transparent", border: 0, color: "#796858", cursor: "pointer", fontSize: 17 }}>×</button>
                <div onClick={() => onOpenRecipe(meal.day)} style={{ cursor: "pointer", height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", flex: "0 0 44px", background: `linear-gradient(${rgba(meal.color,.45)},${rgba(meal.color,.45)}), #151319`, border: `1px solid ${rgba(meal.color,.45)}`, boxShadow: `0 0 22px ${rgba(meal.color,.14)}` }} />
                    <div><div style={label(8, meal.color, ".13em")}>{meal.cuisine} · day {meal.day}</div><div style={{ ...mono(10, "#877463"), marginTop: 5 }}>{meal.time} min active</div></div>
                  </div>
                  <div style={{ ...display(24, 1.05), color: "#eee1d0", marginTop: 18 }}>{meal.short}</div>
                  <div style={{ fontFamily: FONTS.body, color: "#897767", fontStyle: "italic", lineHeight: 1.35, fontSize: 13, marginTop: 7 }}>{meal.anchor}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(190,145,94,.13)", paddingTop: 11, marginTop: "auto" }}><span style={mono(11, COLORS.green)}>${meal.cost.toFixed(2)}</span><span style={label(8, "#a88d70", ".10em")}>Open recipe →</span></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
