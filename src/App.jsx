import { useState, useEffect } from "react";
import { chains, mealId } from "./data/chains";
import { T } from "./theme";
import { useRecipe } from "./hooks/useRecipe";
import { useCooked } from "./hooks/useCooked";
import GlobalStyle from "./components/GlobalStyle";
import Nav from "./components/Nav";
import BoardView from "./components/BoardView";
import CalendarView from "./components/CalendarView";
import ChainsView from "./components/ChainsView";
import MyKitchen from "./components/MyKitchen";
import RecipePanel from "./components/RecipePanel";
import ShoppingList from "./components/ShoppingList";

// Every meal flattened once, carrying its chain id + stable meal_id.
const FLAT_DAYS = chains.flatMap((c) =>
  c.days.map((d) => ({ ...d, chainId: c.id, mealId: mealId(c.id, d.day) })),
);

export default function App() {
  const [room, setRoom] = useState("board");
  const [selectedDay, setSelectedDay] = useState(null);
  const [showShopping, setShowShopping] = useState(false);
  const { getRecipe, loadRecipe, preloadLibrary } = useRecipe();
  const { cooked, isCooked, toggle } = useCooked();

  // Prime the whole seeded library once (single DB read) so every room has
  // cost/calorie data on first paint, with zero AI calls.
  useEffect(() => { preloadLibrary(); }, [preloadLibrary]);

  const selDay = selectedDay ? FLAT_DAYS.find((d) => d.day === selectedDay) : null;

  function selectDay(day) {
    setSelectedDay(day);
    const dd = FLAT_DAYS.find((d) => d.day === day);
    if (dd) loadRecipe(dd.mealId, dd.meal, dd.cuisine);
  }

  // Plan-wide cal/$ range for the value gauge (recomputed as the library loads).
  const vals = FLAT_DAYS
    .map((d) => getRecipe(d.mealId))
    .filter((r) => r && !r.loading && !r.error)
    .map((r) => Number(r.cal_per_dollar))
    .filter(Number.isFinite);
  const valueRange = vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null;

  const selectedMealId = selDay?.mealId ?? null;
  const viewProps = { getRecipe, onSelectDay: selectDay, isCooked, selectedMealId };

  return (
    <div style={{ minHeight: "100vh", background: T.page, color: T.ink, fontFamily: T.body }}>
      <GlobalStyle />
      <Nav room={room} setRoom={setRoom} onOpenShopping={() => setShowShopping(true)} />

      <main>
        {room === "board" && <BoardView getRecipe={getRecipe} onSelectDay={selectDay} />}
        {room === "calendar" && <CalendarView flatDays={FLAT_DAYS} {...viewProps} />}
        {room === "chains" && <ChainsView {...viewProps} />}
        {room === "kitchen" && (
          <MyKitchen flatDays={FLAT_DAYS} getRecipe={getRecipe} cooked={cooked}
            onOpenShopping={() => setShowShopping(true)} onSelectDay={selectDay} />
        )}
      </main>

      {selDay && (
        <RecipePanel
          day={selDay}
          entry={getRecipe(selDay.mealId)}
          valueRange={valueRange}
          cooked={isCooked(selDay.mealId)}
          onToggleCooked={toggle}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {showShopping && (
        <ShoppingList flatDays={FLAT_DAYS} getRecipe={getRecipe} onClose={() => setShowShopping(false)} />
      )}
    </div>
  );
}
