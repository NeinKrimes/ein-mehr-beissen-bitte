import { useState } from "react";
import { mealByDay } from "../data/mealStats";
import { COLORS, FONTS, EASE, label, mono, display, parch, rgba } from "../theme";

// Board — "plates from other kitchens". Round photographs, plate captions,
// no icons. Each plate is a calendar meal as cooked by someone else tonight.

const PLATES = [
  { day: 3,  title: "Khao Soi from Sunday's bird",              cook: "Nok Rattana",      cooks: "2.4k" },
  { day: 8,  title: "Frijoles de la Olla, no soak",             cook: "Rosalía Mendez",   cooks: "3.1k" },
  { day: 1,  title: "Poulet Roti, butter under the skin",       cook: "Marguerite Blanc", cooks: "4.6k" },
  { day: 20, title: "Hong Shao Rou, three hours untouched",     cook: "Wei Tang",         cooks: "1.8k" },
  { day: 5,  title: "Jerk Pork with coconut rice and peas",     cook: "Dwayne Kerr",      cooks: "2.9k" },
  { day: 14, title: "Spaghetti al Pomodoro, the cheapest good night", cook: "Pia Nardelli", cooks: "5.2k" },
  { day: 17, title: "Masoor Dal Tadka, sixty-eight cents a bowl", cook: "Arun Dey",       cooks: "1.4k" },
  { day: 29, title: "Homemade bagels, proofed overnight",       cook: "Bex Kahn",         cooks: "972" },
].map((p) => ({ ...p, meal: mealByDay(p.day) }));

const FILTERS = [
  { key: "all",     lbl: "All",            test: () => true },
  { key: "dollar",  lbl: "Under a dollar", test: (m) => m.cost < 1 },
  { key: "passive", lbl: "Passive cook",   test: (m) => m.type === "ANCHOR" },
  { key: "protein", lbl: "High protein",   test: (m) => m.p >= 30 },
];

export default function BoardRoom({ saved, onToggleSave, onOpenRecipe }) {
  const [filter, setFilter] = useState("all");
  const shown = PLATES.filter((p) => FILTERS.find((f) => f.key === filter).test(p.meal));

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "30px 40px 24px", background: COLORS.page, overflowY: "auto" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 18, borderBottom: `1px solid ${parch(0.14)}`, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ ...label(10, COLORS.gold, ".3em"), marginBottom: 8 }}>Tonight · {PLATES.length} kitchens</div>
          <div style={{ ...display(38, 1), color: COLORS.parchment }}>
            Someone is already <span style={{ fontStyle: "italic" }}>cooking this.</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {FILTERS.map((f) => {
            const on = f.key === filter;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                ...label(10, on ? COLORS.ground : parch(0.55), ".14em"),
                padding: "10px 18px", borderRadius: 999, cursor: "pointer",
                transition: `all 320ms ${EASE}`,
                background: on ? COLORS.gold : "transparent",
                border: on ? "1px solid transparent" : `1px solid ${parch(0.18)}`,
              }}>{f.lbl}</button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "26px 30px", paddingTop: 26 }}>
        {shown.map((p) => {
          const m = p.meal;
          const isSaved = saved.has(p.day);
          const hotKcal = m.kcal >= 700;
          const goodValue = m.cpd >= 400 || (m.cpd >= 200 && m.cost < 2.5 && m.cpd >= 220);
          return (
            <div key={p.day} style={{ display: "flex", flexDirection: "column", position: "relative", paddingTop: 8 }}>
              <div onClick={() => onOpenRecipe(p.day)} style={{
                position: "relative", alignSelf: "center", width: 182, height: 182, borderRadius: "50%",
                cursor: "pointer",
                background: `linear-gradient(0deg,${rgba(m.color, 0.40)},${rgba(m.color, 0.40)}), ${COLORS.plate}`,
                border: `1px solid ${rgba(m.color, 0.26)}`,
              }}>
                <span onClick={(e) => { e.stopPropagation(); onToggleSave(p.day); }} style={{
                  position: "absolute", bottom: -8, right: -6,
                  ...label(10, isSaved ? COLORS.parchment : COLORS.ground, ".14em"),
                  padding: "8px 15px", borderRadius: 999, cursor: "pointer",
                  transition: `all 320ms ${EASE}`,
                  background: isSaved ? "rgba(12,12,15,0.8)" : COLORS.gold,
                  border: isSaved ? `1px solid ${parch(0.24)}` : "1px solid transparent",
                  boxShadow: isSaved ? "none" : "0 0 24px rgba(232,160,32,0.35)",
                }}>{isSaved ? "Saved" : "Save"}</span>
              </div>
              <div style={{ ...label(10, m.color), margin: "18px 0 6px" }}>
                {m.cuisine}{m.type === "ANCHOR" ? " · anchor" : ""}
              </div>
              <div style={{ ...display(23, 1.08), color: COLORS.parchment, textWrap: "pretty" }}>{p.title}</div>
              <div style={{ ...mono(12, parch(0.42)), marginTop: 8 }}>
                <span style={{ color: hotKcal ? COLORS.amber : "inherit" }}>{m.kcal} kcal</span>
                {" · "}
                <span style={{ color: goodValue && !hotKcal ? COLORS.green : "inherit" }}>{m.cpd} cal/$</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${parch(0.08)}` }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: parch(0.12) }} />
                <span style={{ fontFamily: FONTS.body, fontSize: 14, color: "#8d8578", flex: 1 }}>{p.cook}</span>
                <span style={mono(11, parch(0.34))}>{p.cooks}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
