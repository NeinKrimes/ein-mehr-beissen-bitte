import { MEALS, mealByDay } from "../data/mealStats";
import { COLORS, FONTS, label, mono, display, parch, hairline, rgba } from "../theme";

// My Kitchen — "mine". The month's ledger, the plates you saved from the
// board, and the weekly shopping list.

const monthCost = MEALS.reduce((s, m) => s + m.cost, 0);
const avgCpd = Math.round(MEALS.reduce((s, m) => s + m.cpd, 0) / MEALS.length);
const avgKcal = Math.round(MEALS.reduce((s, m) => s + m.kcal, 0) / MEALS.length);

export default function KitchenRoom({ saved, onOpenRecipe, onOpenShopping }) {
  const savedMeals = [...saved].map(mealByDay).filter(Boolean).sort((a, b) => a.day - b.day);

  return (
    <div style={{ flex: 1, minHeight: 0, background: COLORS.page, padding: "34px 40px", overflowY: "auto" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 18, borderBottom: `1px solid ${parch(0.14)}`, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ ...label(10, COLORS.gold, ".3em"), marginBottom: 8 }}>My kitchen · the ledger</div>
          <div style={{ ...display(38, 1), color: COLORS.parchment }}>
            Thirty dinners, <span style={{ fontStyle: "italic" }}>one grocery run a week.</span>
          </div>
        </div>
        <button onClick={onOpenShopping} style={{
          ...label(11, COLORS.ground, ".16em"),
          background: COLORS.gold, border: "none", borderRadius: 999,
          padding: "13px 22px", cursor: "pointer",
          boxShadow: "0 0 24px rgba(232,160,32,0.35)",
        }}>Weekly shopping list</button>
      </div>

      <div style={{ display: "flex", maxWidth: 720, borderBottom: hairline, padding: "20px 0", marginBottom: 30 }}>
        {[
          ["The month", `$${monthCost.toFixed(2)}`, COLORS.green],
          ["A dinner", `$${(monthCost / MEALS.length).toFixed(2)}`, COLORS.green],
          ["Average energy", `${avgKcal} kcal`, COLORS.amber],
          ["Average value", `${avgCpd} cal/$`, COLORS.green],
        ].map(([k, v, c], i) => (
          <div key={k} style={{ flex: 1, paddingLeft: i ? 22 : 0, borderLeft: i ? hairline : "none" }}>
            <div style={label(10, parch(0.36), ".16em")}>{k}</div>
            <div style={{ ...mono(18, c), marginTop: 6 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ ...label(10, parch(0.36)), marginBottom: 16 }}>Saved from the board</div>
      {savedMeals.length === 0 ? (
        <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 15, color: COLORS.faintest, maxWidth: "52ch", lineHeight: 1.6 }}>
          Nothing yet. When a plate on the board stops you, save it — it will wait for you here.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 34, flexWrap: "wrap" }}>
          {savedMeals.map((m) => (
            <div key={m.day} onClick={() => onOpenRecipe(m.day)} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 150, cursor: "pointer" }}>
              <div style={{
                width: 104, height: 104, borderRadius: "50%",
                background: `linear-gradient(0deg,${rgba(m.color, 0.5)},${rgba(m.color, 0.5)}), ${COLORS.plate}`,
                border: `1px solid ${rgba(m.color, 0.42)}`,
                boxShadow: `0 0 34px ${rgba(m.color, 0.16)}`,
              }} />
              <div style={{ ...display(17), color: COLORS.parchment, marginTop: 14, textAlign: "center" }}>{m.short}</div>
              <div style={{ ...mono(11, COLORS.green), marginTop: 5 }}>{m.cpd} cal/$ · day {m.day}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
