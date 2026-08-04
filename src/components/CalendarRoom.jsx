import { useState, memo } from "react";
import { MEALS, mealByDay, mealsByChain } from "../data/mealStats";
import { chains } from "../data/chains";
import { COLORS, FONTS, EASE, label, mono, display, parch, rgba, hairline } from "../theme";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKS = Array.from({ length: 35 }, (_, i) => i < 30 ? mealByDay(i + 1) : null);

function chainColor(chainId) {
  const first = mealsByChain(chainId)[0];
  return first?.color ?? COLORS.gold;
}

// ⚡ Bolt: memoizing ChainConnectors prevents recalculating and re-rendering
// SVG paths every time a day is selected.
const ChainConnectors = memo(function ChainConnectors() {
  return (
    <svg aria-hidden="true" viewBox="0 0 700 500" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
      {chains.flatMap((chain) => chain.days.slice(1).map((day, index) => {
        const from = chain.days[index].day - 1;
        const to = day.day - 1;
        const x1 = (from % 7) * 100 + 50;
        const y1 = Math.floor(from / 7) * 100 + 50;
        const x2 = (to % 7) * 100 + 50;
        const y2 = Math.floor(to / 7) * 100 + 50;
        const wraps = y2 !== y1;
        const d = wraps
          ? `M ${x1} ${y1} C ${x1 + 80} ${y1 + 25}, ${x2 - 80} ${y2 - 25}, ${x2} ${y2}`
          : `M ${x1} ${y1} L ${x2} ${y2}`;
        return <path key={`${chain.id}-${day.day}`} d={d} fill="none" stroke={chainColor(chain.id)} strokeWidth="3" strokeDasharray={wraps ? "8 6" : undefined} opacity=".42" vectorEffect="non-scaling-stroke" />;
      }))}
    </svg>
  );
});

// ⚡ Bolt: memoizing MealCard prevents unnecessary re-renders of the 34 unselected
// meal cards when the selDay state changes, saving significant DOM overhead.
// onSelect receives the stable setSelDay function, making this memo highly effective.
const MealCard = memo(function MealCard({ meal, selected, onSelect }) {
  if (!meal) return <div style={{ minHeight: 122, border: `1px solid ${parch(.04)}`, background: "rgba(0,0,0,.08)" }} />;
  const color = chainColor(meal.chainId);
  const position = mealsByChain(meal.chainId).findIndex((m) => m.day === meal.day) + 1;
  const total = mealsByChain(meal.chainId).length;
  return (
    <button onClick={() => onSelect(meal.day)} aria-label={`Day ${meal.day}: ${meal.meal}`} style={{
      minHeight: 122, position: "relative", zIndex: 1, overflow: "hidden", textAlign: "left",
      padding: "12px 12px 10px", cursor: "pointer", fontFamily: "inherit",
      border: `1px solid ${selected ? color : parch(.10)}`,
      background: selected ? `linear-gradient(150deg, ${rgba(color, .17)}, ${COLORS.pageAlt} 72%)` : "rgba(15,15,20,.94)",
      boxShadow: selected ? `0 0 0 1px ${rgba(color, .24)}, 0 12px 28px rgba(0,0,0,.28)` : "none",
      transform: selected ? "translateY(-2px)" : "none", transition: `all 240ms ${EASE}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span style={mono(11, selected ? COLORS.parchment : parch(.38))}>{String(meal.day).padStart(2, "0")}</span>
        <span style={{ ...label(8, color, ".12em"), whiteSpace: "nowrap" }}>{meal.type === "ANCHOR" ? "Anchor" : `${position} of ${total}`}</span>
      </div>
      <div style={{ fontFamily: FONTS.display, color: COLORS.parchment, fontSize: 18, lineHeight: 1.04, marginTop: 13 }}>{meal.short}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: `0 0 0 3px ${rgba(color, .12)}` }} />
        <span style={label(8, parch(.38), ".12em")}>{meal.cuisine}</span>
      </div>
    </button>
  );
});

export default function CalendarRoom({ onOpenRecipe }) {
  const [selDay, setSelDay] = useState(1);
  const sel = mealByDay(selDay) ?? MEALS[0];
  const chain = chains.find((c) => c.id === sel.chainId);
  const chainMeals = mealsByChain(sel.chainId);
  const color = chainColor(sel.chainId);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: COLORS.page, padding: "28px clamp(18px,3vw,42px) 36px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <div style={{ ...label(10, COLORS.gold, ".3em"), marginBottom: 7 }}>Thirty-night plan</div>
          <div style={{ ...display(40), color: COLORS.parchment }}>Your recipe calendar</div>
          <div style={{ fontFamily: FONTS.body, fontStyle: "italic", color: COLORS.faint, fontSize: 14, marginTop: 7 }}>Follow each coloured thread from an anchor cook into its leftover meals.</div>
        </div>
        <div style={{ ...label(9, parch(.42), ".13em"), display: "flex", gap: 15 }}>
          <span><b style={{ color: COLORS.gold }}>●</b> Anchor</span><span>— Same ingredient chain</span><span>┈ Week wrap</span>
        </div>
      </div>

      <div style={{ border: hairline, borderRadius: 12, overflow: "hidden", background: COLORS.pageAlt, minWidth: 760 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(100px, 1fr))", background: COLORS.masthead }}>
          {WEEKDAYS.map((day) => <div key={day} style={{ ...label(9, parch(.42), ".18em"), textAlign: "center", padding: "10px 4px", borderRight: hairline }}>{day}</div>)}
        </div>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(7, minmax(100px, 1fr))", gridTemplateRows: "repeat(5, minmax(122px, 1fr))", gap: 7, padding: 7 }}>
          <ChainConnectors />
          {WEEKS.map((meal, i) => <MealCard key={meal?.day ?? `empty-${i}`} meal={meal} selected={meal?.day === selDay} onSelect={setSelDay} />)}
        </div>
      </div>

      <div style={{ marginTop: 18, border: `1px solid ${rgba(color, .35)}`, borderRadius: 12, background: `linear-gradient(100deg, ${rgba(color, .12)}, ${COLORS.pageAlt} 45%)`, padding: "18px 20px", display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 34 }}>{chain?.emoji}</div>
        <div style={{ flex: "1 1 260px" }}>
          <div style={label(9, color, ".18em")}>Day {sel.day} · {sel.type === "ANCHOR" ? "Start this chain" : `Use the ${chain?.anchor.toLowerCase()}`}</div>
          <div style={{ ...display(26), marginTop: 5 }}>{sel.meal}</div>
          <div style={{ color: COLORS.faint, fontSize: 13, fontStyle: "italic", marginTop: 5 }}>{chain?.passive}</div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          {chainMeals.map((meal, i) => <button key={meal.day} onClick={() => setSelDay(meal.day)} title={meal.meal} style={{ width: 29, height: 29, borderRadius: "50%", cursor: "pointer", border: `1px solid ${meal.day === selDay ? color : parch(.15)}`, color: meal.day === selDay ? COLORS.ground : parch(.54), background: meal.day === selDay ? color : "transparent", ...mono(10, meal.day === selDay ? COLORS.ground : parch(.54)) }}>{i + 1}</button>)}
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          <div><div style={label(8)}>Active</div><div style={{ ...mono(14), marginTop: 4 }}>{sel.time} min</div></div>
          <div><div style={label(8)}>Cost</div><div style={{ ...mono(14, COLORS.green), marginTop: 4 }}>${sel.cost.toFixed(2)}</div></div>
        </div>
        <button onClick={() => onOpenRecipe(sel.day)} style={{ ...label(10, COLORS.ground, ".14em"), border: 0, borderRadius: 999, background: COLORS.gold, padding: "12px 19px", cursor: "pointer" }}>Open recipe →</button>
      </div>
    </div>
  );
}
