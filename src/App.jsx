import { useState, useEffect } from "react";
import { MEALS, mealByDay, variantMealById } from "./data/mealStats";
import { variantMealId, DAY_COUNT } from "./data/chains";
import { useRecipe } from "./hooks/useRecipe";
import { usePalate } from "./hooks/usePalate";
import { useLibraryBasket } from "./hooks/useLibraryBasket";
import { useViewport } from "./hooks/useViewport";
import { COLORS, FONTS, EASE, label, mono, display, parch, hairline } from "./theme";
import GlobalStyle from "./components/GlobalStyle";
import BoardRoom from "./components/BoardRoom";
import CalendarRoom from "./components/CalendarRoom";
import ChainsRoom from "./components/ChainsRoom";
import WebRoom from "./components/WebRoom";
import KitchenRoom from "./components/KitchenRoom";
import LibraryRoom from "./components/LibraryRoom";
import RecipePage from "./components/RecipePage";
import ShoppingList from "./components/ShoppingList";
import PaletteQuestionnaire from "./components/PaletteQuestionnaire";

// "The printed cookbook, lit by one lamp." Rooms behind one masthead:
// Board (others), Calendar (when), Chains (why), Web (how it all connects),
// My Kitchen (mine). From the claude.ai/design project
// "Ein Mehr Beissen Bitte UI Design".

const ROOMS = ["Board", "Calendar", "Chains", "Web", "Library", "My Kitchen"];
const SAVED_KEY = "embb_saved_recipes";

function readSavedRecipes() {
  try {
    const days = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return new Set(Array.isArray(days) ? days.filter((day) => mealByDay(day)) : []);
  } catch {
    return new Set();
  }
}

const KEYFRAMES = `
@keyframes embRise { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes embPulse { 0%,100% { opacity:.5; } 50% { opacity:1; } }
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
`;

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const day = ((now.getDate() - 1) % DAY_COUNT) + 1;
  let h = now.getHours();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return <span>Day {day} · {h}:{String(now.getMinutes()).padStart(2, "0")} {ampm}</span>;
}

export default function App() {
  const { isMobile } = useViewport();
  const [room, setRoom] = useState("Calendar");
  const [openDay, setOpenDay] = useState(null);
  const [openVariant, setOpenVariant] = useState(null);
  const [saved, setSaved] = useState(readSavedRecipes);
  const [showShopping, setShowShopping] = useState(false);
  const { getRecipe, loadRecipe, preloadLibrary } = useRecipe();

  const { palate, savePalate, syncing } = usePalate();
  const basket = useLibraryBasket();
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

  // variantId=null opens the base day's meal; otherwise opens that day's
  // cuisine-swap alternate (see the `variants` field in chains.js). Every
  // room still calls this with just a day number — only the swap pills in
  // RecipePage use the second argument.
  function openRecipe(day, variantId = null) {
    const base = mealByDay(day);
    if (!base) return;
    if (variantId) {
      const v = variantMealById(variantMealId(base.chainId, day, variantId));
      if (!v) return;
      setOpenDay(day);
      setOpenVariant(variantId);
      loadRecipe(v.mealId, v.meal, v.cuisine, palate);
      return;
    }
    setOpenDay(day);
    setOpenVariant(null);
    loadRecipe(base.mealId, base.meal, base.cuisine, palate);
  }

  function toggleSave(day) {
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const baseOpenMeal = openDay ? mealByDay(openDay) : null;
  const openMeal = openVariant && baseOpenMeal
    ? variantMealById(variantMealId(baseOpenMeal.chainId, openDay, openVariant))
    : baseOpenMeal;

  if (showQuestionnaire) {
    return (
      <PaletteQuestionnaire
        onComplete={() => setShowQuestionnaire(false)}
        onClose={palate?.householdSize ? () => setShowQuestionnaire(false) : null}
        savePalate={savePalate}
      />
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: COLORS.ground, color: COLORS.parchment, fontFamily: FONTS.body, overflowX: "hidden" }}>
      <GlobalStyle />
      <style>{KEYFRAMES}</style>

      {/* Masthead — four rooms, one lit. On mobile the room links become a
          single horizontally-scrollable strip (.embb-scrollx) instead of
          wrapping into extra rows, so the masthead height stays predictable. */}
      <div style={{
        flex: isMobile ? "0 0 auto" : "0 0 76px",
        borderBottom: hairline,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "space-between",
        gap: isMobile ? 8 : 0,
        padding: isMobile ? "12px 16px" : "0 34px",
        background: COLORS.masthead,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ ...display(isMobile ? 19 : 23), color: COLORS.parchment }}>Ein Mehr Beissen Bitte</div>
          {!isMobile && <div style={{ ...mono(11, COLORS.faint), marginLeft: 24 }}><Clock /></div>}
        </div>
        <div
          className={isMobile ? "embb-scrollx" : undefined}
          style={{ display: "flex", gap: isMobile ? 18 : 30, alignItems: "center", flexWrap: isMobile ? "nowrap" : "wrap" }}
        >
          {ROOMS.map((r) => {
            const on = r === room;
            return (
              <span key={r} onClick={() => setRoom(r)} style={{
                ...label(11, on ? COLORS.gold : COLORS.muted),
                cursor: "pointer", paddingBottom: 4, minHeight: 40, display: "flex", alignItems: "center",
                whiteSpace: "nowrap",
                borderBottom: on ? `1px solid ${COLORS.gold}` : "1px solid transparent",
                transition: `color 320ms ${EASE}`,
              }}>{r}</span>
            );
          })}
          <span onClick={() => setShowQuestionnaire(true)} style={{
            ...label(11, parch(0.42)),
            cursor: "pointer", paddingBottom: 4, minHeight: 40, display: "flex", alignItems: "center",
            whiteSpace: "nowrap",
            borderBottom: "1px solid transparent",
            transition: `color 320ms ${EASE}`,
          }}>Palate</span>
        </div>
      </div>

      {/* The lit room */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, minWidth: 0, overflowX: "hidden" }}>
        {room === "Board" && <BoardRoom saved={saved} onToggleSave={toggleSave} onOpenRecipe={openRecipe} />}
        {room === "Calendar" && <CalendarRoom onOpenRecipe={openRecipe} />}
        {room === "Chains" && <ChainsRoom onOpenRecipe={openRecipe} />}
        {room === "Web" && <WebRoom onOpenRecipe={openRecipe} />}
        {room === "Library" && <LibraryRoom basket={basket} onOpenShopping={() => setShowShopping(true)} />}
        {room === "My Kitchen" && <KitchenRoom saved={saved} onToggleSave={toggleSave} onOpenRecipe={openRecipe} onOpenShopping={() => setShowShopping(true)} />}
      </div>

      {openMeal && (
        <RecipePage
          meal={openMeal}
          entry={getRecipe(openMeal.mealId)}
          palate={palate}
          isSaved={saved.has(openMeal.day)}
          onToggleSave={() => toggleSave(openMeal.day)}
          onClose={() => { setOpenDay(null); setOpenVariant(null); }}
          onOpenRecipe={openRecipe}
        />
      )}

      {showShopping && (
        <ShoppingList
          flatDays={MEALS}
          getRecipe={getRecipe}
          basket={basket.recipes}
          onRemoveFromBasket={basket.remove}
          onClose={() => setShowShopping(false)}
        />
      )}
    </div>
  );
}
