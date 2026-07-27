import { useState, useEffect } from "react";
import { MEALS, mealByDay } from "./data/mealStats";
import { useRecipe } from "./hooks/useRecipe";
import { COLORS, FONTS, EASE, label, mono, display, parch, hairline } from "./theme";
import BoardRoom from "./components/BoardRoom";
import CalendarRoom from "./components/CalendarRoom";
import ChainsRoom from "./components/ChainsRoom";
import KitchenRoom from "./components/KitchenRoom";
import RecipePage from "./components/RecipePage";
import ShoppingList from "./components/ShoppingList";
import { usePalate } from "./hooks/usePalate";
import PaletteQuestionnaire from "./components/PaletteQuestionnaire";

// "The printed cookbook, lit by one lamp." Four rooms behind one masthead:
// Board (others), Calendar (when), Chains (why), My Kitchen (mine).
// From the claude.ai/design project "Ein Mehr Beissen Bitte UI Design".

const ROOMS = ["Board", "Calendar", "Chains", "My Kitchen"];

const KEYFRAMES = `
@keyframes embRise { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes embPulse { 0%,100% { opacity:.5; } 50% { opacity:1; } }
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
`;

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const day = ((now.getDate() - 1) % 30) + 1;
  let h = now.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `Day ${day} · ${h}:${String(now.getMinutes()).padStart(2, "0")} ${ampm}`;
}

export default function App() {
  const [room, setRoom] = useState("Calendar");
  const [openDay, setOpenDay] = useState(null);
  const [saved, setSaved] = useState(() => new Set());
  const [showShopping, setShowShopping] = useState(false);
  const { getRecipe, loadRecipe, preloadLibrary } = useRecipe();
  const clock = useClock();

  const { palate, savePalate, syncing } = usePalate();
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);

  // Show questionnaire on first visit if no palate has been saved yet
  useEffect(() => {
    if (!syncing && !palate?.householdSize) {
      setShowQuestionnaire(true);
    }
  }, [syncing, palate]);

  // Prime the seeded library once so stats and the shopping list have data
  // on first paint (single DB read, no AI calls).
  useEffect(() => { preloadLibrary(); }, [preloadLibrary]);

  function openRecipe(day) {
    const m = mealByDay(day);
    if (!m) return;
    setOpenDay(day);
    loadRecipe(m.mealId, m.meal, m.cuisine, palate);
  }

  function toggleSave(day) {
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  }

  if (showQuestionnaire) {
    return (
      <PaletteQuestionnaire
        onComplete={() => setShowQuestionnaire(false)}
        onClose={palate?.householdSize ? () => setShowQuestionnaire(false) : null}
        savePalate={savePalate}
      />
    );
  }

  const openMeal = openDay ? mealByDay(openDay) : null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: COLORS.ground, color: COLORS.parchment, fontFamily: FONTS.body }}>
      <style>{KEYFRAMES}</style>

      {/* Masthead — four rooms, one lit */}
      <div style={{ height: 76, flex: "0 0 76px", borderBottom: hairline, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 34px", background: COLORS.masthead }}>
        <div style={{ ...display(23), color: COLORS.parchment }}>Ein Mehr Beissen Bitte</div>
        <div style={{ display: "flex", gap: 30, alignItems: "center" }}>
          {ROOMS.map((r) => {
            const on = r === room;
            return (
              <span key={r} onClick={() => setRoom(r)} style={{
                ...label(11, on ? COLORS.gold : parch(0.42)),
                cursor: "pointer", paddingBottom: 4,
                borderBottom: on ? `1px solid ${COLORS.gold}` : "1px solid transparent",
                transition: `color 320ms ${EASE}`,
              }}>{r}</span>
            );
          })}
          <span onClick={() => setShowQuestionnaire(true)} style={{
            ...label(11, parch(0.42)),
            cursor: "pointer", paddingBottom: 4,
            borderBottom: "1px solid transparent",
            transition: `color 320ms ${EASE}`,
          }}>Palate</span>
        </div>
        <div style={mono(11, parch(0.34))}>{clock}</div>
      </div>

      {/* The lit room */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {room === "Board" && <BoardRoom saved={saved} onToggleSave={toggleSave} onOpenRecipe={openRecipe} />}
        {room === "Calendar" && <CalendarRoom onOpenRecipe={openRecipe} />}
        {room === "Chains" && <ChainsRoom onOpenRecipe={openRecipe} />}
        {room === "My Kitchen" && <KitchenRoom saved={saved} onOpenRecipe={openRecipe} onOpenShopping={() => setShowShopping(true)} />}
      </div>

      {openMeal && (
        <RecipePage
          meal={openMeal}
          entry={getRecipe(openMeal.mealId)}
          onClose={() => setOpenDay(null)}
        />
      )}

      {showShopping && (
        <ShoppingList
          flatDays={MEALS}
          getRecipe={getRecipe}
          onClose={() => setShowShopping(false)}
        />
      )}
    </div>
  );
}
