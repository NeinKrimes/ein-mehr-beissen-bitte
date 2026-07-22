import { useState, useEffect } from "react";
import { chains, mealId } from "./data/chains";
import { useRecipe } from "./hooks/useRecipe";
import ShoppingList from "./components/ShoppingList";

const CUISINE_META = {
  Mexican:  { color: "#e84040", flag: "🇲🇽" },
  Italian:  { color: "#4a9eff", flag: "🇮🇹" },
  Indian:   { color: "#ff9500", flag: "🇮🇳" },
  French:   { color: "#a78bfa", flag: "🇫🇷" },
  Jamaican: { color: "#22c55e", flag: "🇯🇲" },
  Thai:     { color: "#f472b6", flag: "🇹🇭" },
  Chinese:  { color: "#facc15", flag: "🇨🇳" },
  American: { color: "#94a3b8", flag: "🇺🇸" },
};

// Every meal flattened once, carrying its chain id + stable meal_id.
const FLAT_DAYS = chains.flatMap((c) =>
  c.days.map((d) => ({ ...d, chainId: c.id, mealId: mealId(c.id, d.day) })),
);

export default function App() {
  const [openChain, setOpenChain] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showShopping, setShowShopping] = useState(false);
  const { getRecipe, loadRecipe, preloadLibrary } = useRecipe();

  // Prime the seeded library once so cost/calorie badges + the shopping list
  // have data on first paint (single DB read, no AI calls).
  useEffect(() => { preloadLibrary(); }, [preloadLibrary]);

  const selDayData = selectedDay
    ? FLAT_DAYS.find(d => d.day === selectedDay)
    : null;

  function selectDay(day) {
    if (selectedDay === day) { setSelectedDay(null); return; }
    setSelectedDay(day);
    const dd = FLAT_DAYS.find(d => d.day === day);
    if (dd) loadRecipe(dd.mealId, dd.meal, dd.cuisine);
  }

  const current = selDayData ? getRecipe(selDayData.mealId) : null;
  const isLoading = !!current?.loading;
  const recipe = current && !current.loading ? current : null;
  const cm = selDayData ? CUISINE_META[selDayData.cuisine] : null;

  return (
    <div style={{ minHeight:"100vh", background:"#0c0c0f", fontFamily:"'Palatino Linotype',Palatino,serif", color:"#e0d8c8", display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ background:"#0e0e16", borderBottom:"1px solid #1e1e2e", padding:"20px 16px 16px", textAlign:"center" }}>
        <div style={{ fontSize:"10px", letterSpacing:"5px", color:"#555", marginBottom:"6px", textTransform:"uppercase" }}>World Kitchen · 30 Days</div>
        <h1 style={{ fontSize:"clamp(18px,4vw,28px)", fontWeight:"normal", margin:"0 0 4px", color:"#f0e8d8" }}>
          One Ingredient · Many Cuisines
        </h1>
        <p style={{ color:"#555", fontSize:"12px", margin:0, fontStyle:"italic" }}>
          Tap any meal to generate a full recipe with ingredients & steps
        </p>
        <button onClick={() => setShowShopping(true)} style={{
          marginTop:"12px", background:"#161620", border:"1px solid #2a2a3a", color:"#e8a020",
          cursor:"pointer", padding:"6px 14px", borderRadius:"6px", fontSize:"12px",
          fontFamily:"inherit", letterSpacing:"1px",
        }}>🛒 Weekly shopping list</button>
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden", flexDirection: selectedDay ? "row" : "column" }}>

        {/* Calendar panel */}
        <div style={{ flex: selectedDay ? "0 0 340px" : "1", overflowY:"auto", padding:"14px 12px", borderRight: selectedDay ? "1px solid #1e1e2e" : "none" }}>
          {chains.map(chain => {
            const isOpen = openChain === chain.id;
            return (
              <div key={chain.id} style={{ marginBottom:"10px" }}>
                <div onClick={() => setOpenChain(isOpen ? null : chain.id)} style={{
                  background: isOpen ? "#161620" : "#111118",
                  border:`1px solid ${isOpen ? "#2e2e44" : "#1a1a26"}`,
                  borderRadius: isOpen ? "8px 8px 0 0" : "8px",
                  padding:"10px 12px", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:"10px",
                }}>
                  <span style={{ fontSize:"18px" }}>{chain.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"12px", color:"#e8a020", fontWeight:"bold" }}>{chain.anchor}</div>
                    <div style={{ fontSize:"10px", color:"#444", marginTop:"2px" }}>⏱ {chain.passive}</div>
                  </div>
                  <div style={{ display:"flex", gap:"2px" }}>
                    {chain.days.map(d => <span key={d.day} style={{ fontSize:"13px" }}>{CUISINE_META[d.cuisine]?.flag}</span>)}
                  </div>
                  <span style={{ color:"#333", fontSize:"14px" }}>{isOpen ? "▲" : "▼"}</span>
                </div>

                {isOpen && (
                  <div style={{ background:"#0d0d12", border:"1px solid #1a1a26", borderTop:"none", borderRadius:"0 0 8px 8px", overflow:"hidden" }}>
                    {chain.days.map((d, i) => {
                      const dcm = CUISINE_META[d.cuisine];
                      const isSel = selectedDay === d.day;
                      const entry = getRecipe(mealId(chain.id, d.day));
                      const isLd = !!entry?.loading;
                      const hasRecipe = !!entry && !entry.loading && !entry.error;
                      return (
                        <div key={d.day} onClick={() => selectDay(d.day)} style={{
                          display:"flex", alignItems:"center", gap:"10px",
                          padding:"10px 12px",
                          borderBottom: i < chain.days.length-1 ? "1px solid #161620" : "none",
                          background: isSel ? dcm.color+"18" : "transparent",
                          cursor:"pointer",
                          borderLeft: isSel ? `3px solid ${dcm.color}` : "3px solid transparent",
                        }}>
                          <div style={{ textAlign:"center", minWidth:"26px" }}>
                            <div style={{ fontSize:"14px", fontWeight:"bold", color: d.type==="ANCHOR" ? "#e8a020" : "#444" }}>{d.day}</div>
                            <div style={{ fontSize:"9px", color:"#333" }}>{d.dow}</div>
                          </div>
                          <span style={{ fontSize:"13px" }}>{dcm.flag}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:"9px", color: dcm.color, letterSpacing:"1px", textTransform:"uppercase", marginBottom:"2px" }}>
                              {d.type === "ANCHOR" ? "★ " : ""}{d.cuisine}
                            </div>
                            <div style={{ fontSize:"12px", color: isSel ? "#f0e8d8" : "#b0a890", lineHeight:1.3 }}>{d.meal}</div>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"2px" }}>
                            <span style={{ fontSize:"10px", color:"#e8a020" }}>{d.cost}</span>
                            {hasRecipe && Number.isFinite(Number(entry.est_cost_usd)) && (
                              <span style={{ fontSize:"9px", color:"#22c55e" }}>${Number(entry.est_cost_usd).toFixed(2)}/serv</span>
                            )}
                            {hasRecipe && Number.isFinite(Number(entry.cal_per_dollar)) && (
                              <span style={{ fontSize:"9px", color:"#888" }}>{Math.round(entry.cal_per_dollar)} cal/$</span>
                            )}
                            {isLd && <span style={{ fontSize:"9px", color:"#555" }}>loading…</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Recipe panel */}
        {selectedDay && (
          <div style={{ flex:1, overflowY:"auto", padding:"20px", background:"#0a0a0e" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
              <div>
                <div style={{ fontSize:"10px", letterSpacing:"3px", color: cm?.color, textTransform:"uppercase", marginBottom:"4px" }}>
                  {cm?.flag} Day {selectedDay} · {selDayData?.cuisine} · {selDayData?.type}
                </div>
                <h2 style={{ fontSize:"clamp(16px,3vw,22px)", fontWeight:"normal", margin:0, color:"#f0e8d8" }}>
                  {selDayData?.meal}
                </h2>
              </div>
              <button onClick={() => setSelectedDay(null)} style={{
                background:"none", border:"1px solid #2a2a3a", color:"#555",
                cursor:"pointer", padding:"4px 10px", borderRadius:"4px", fontSize:"16px",
              }}>✕</button>
            </div>

            {isLoading && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", gap:"16px" }}>
                <div style={{ fontSize:"32px", animation:"spin 2s linear infinite" }}>🍳</div>
                <div style={{ color:"#555", fontStyle:"italic", fontSize:"13px" }}>Generating recipe…</div>
                <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
              </div>
            )}

            {!isLoading && recipe && !recipe.error && (
              <div>
                {/* Description */}
                <p style={{ color:"#888", fontStyle:"italic", fontSize:"13px", lineHeight:1.7, marginBottom:"16px", borderLeft:`3px solid ${cm?.color}`, paddingLeft:"12px" }}>
                  {recipe.description}
                </p>

                {/* Meta row */}
                <div style={{ display:"flex", gap:"16px", flexWrap:"wrap", marginBottom:"20px" }}>
                  {[["Servings", recipe.servings], ["Prep", recipe.prepTime], ["Cook", recipe.cookTime]].map(([k,v]) => (
                    <div key={k} style={{ background:"#131318", border:"1px solid #1e1e2a", borderRadius:"6px", padding:"8px 14px", textAlign:"center" }}>
                      <div style={{ fontSize:"9px", color:"#555", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"2px" }}>{k}</div>
                      <div style={{ fontSize:"13px", color:"#e8a020" }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Cost & nutrition badges (frugal core) */}
                {(() => {
                  const badges = [
                    Number.isFinite(Number(recipe.est_cost_usd)) && ["$/serving", `$${Number(recipe.est_cost_usd).toFixed(2)}`],
                    Number.isFinite(Number(recipe.cal_per_dollar)) && ["cal / $", `${Math.round(recipe.cal_per_dollar)}`],
                    Number.isFinite(Number(recipe.calories)) && ["Calories", `${recipe.calories}`],
                    Number.isFinite(Number(recipe.protein_g)) && ["Protein", `${recipe.protein_g} g`],
                  ].filter(Boolean);
                  if (!badges.length) return null;
                  return (
                    <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginBottom:"20px" }}>
                      {badges.map(([k,v]) => (
                        <div key={k} style={{ background:"#0f140f", border:"1px solid #1e2a1e", borderRadius:"6px", padding:"8px 14px", textAlign:"center" }}>
                          <div style={{ fontSize:"9px", color:"#4a6a4a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"2px" }}>{k}</div>
                          <div style={{ fontSize:"13px", color:"#22c55e" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Passive tip */}
                {recipe.passiveTip && (
                  <div style={{ background:"#111118", border:"1px solid #1e1e2a", borderRadius:"6px", padding:"10px 14px", marginBottom:"20px", fontSize:"12px", color:"#6688aa", fontStyle:"italic" }}>
                    💻 <strong style={{ color:"#4a9eff" }}>WFH tip:</strong> {recipe.passiveTip}
                  </div>
                )}

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px", marginBottom:"20px" }}>
                  {/* Ingredients */}
                  <div>
                    <h3 style={{ fontSize:"11px", letterSpacing:"3px", color: cm?.color, textTransform:"uppercase", marginBottom:"10px", fontWeight:"normal" }}>Ingredients</h3>
                    {recipe.ingredients?.map((ing, i) => (
                      <div key={i} style={{ display:"flex", gap:"8px", padding:"5px 0", borderBottom:"1px solid #131318", fontSize:"12px" }}>
                        <span style={{ color:"#e8a020", minWidth:"48px", textAlign:"right", flexShrink:0 }}>
                          {ing.amount} {ing.unit}
                        </span>
                        <span style={{ color:"#c0b8a8" }}>{ing.item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tips */}
                  <div>
                    <h3 style={{ fontSize:"11px", letterSpacing:"3px", color: cm?.color, textTransform:"uppercase", marginBottom:"10px", fontWeight:"normal" }}>Frugal Tips</h3>
                    {recipe.frugalTips?.map((tip, i) => (
                      <div key={i} style={{ padding:"6px 0", borderBottom:"1px solid #131318", fontSize:"12px", color:"#888", lineHeight:1.5 }}>
                        💰 {tip}
                      </div>
                    ))}
                    {recipe.leftoversUse && (
                      <div style={{ marginTop:"12px", background:"#131318", borderRadius:"6px", padding:"10px", fontSize:"12px", color:"#22c55e", lineHeight:1.5 }}>
                        ♻️ <strong>Leftovers:</strong> {recipe.leftoversUse}
                      </div>
                    )}
                  </div>
                </div>

                {/* Steps */}
                <h3 style={{ fontSize:"11px", letterSpacing:"3px", color: cm?.color, textTransform:"uppercase", marginBottom:"12px", fontWeight:"normal" }}>Method</h3>
                {recipe.steps?.map((step, i) => (
                  <div key={i} style={{ display:"flex", gap:"14px", marginBottom:"14px" }}>
                    <div style={{
                      minWidth:"28px", height:"28px", borderRadius:"50%",
                      background: cm?.color+"22", border:`1px solid ${cm?.color}55`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"12px", color: cm?.color, fontWeight:"bold", flexShrink:0,
                    }}>{step.n}</div>
                    <div>
                      <div style={{ fontSize:"12px", color:"#e8a020", fontWeight:"bold", marginBottom:"3px" }}>{step.title}</div>
                      <div style={{ fontSize:"13px", color:"#9090a0", lineHeight:1.6 }}>{step.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && recipe?.error && (
              <div style={{ color:"#e84040", fontStyle:"italic", padding:"20px" }}>{recipe.error}</div>
            )}

            {!isLoading && !recipe && (
              <div style={{ color:"#444", fontStyle:"italic", padding:"40px 20px", textAlign:"center" }}>
                Select a meal from the calendar to generate its recipe
              </div>
            )}
          </div>
        )}

        {!selectedDay && (
          <div style={{ textAlign:"center", padding:"40px 20px", color:"#333", fontStyle:"italic", fontSize:"13px" }}>
            ← Tap any chain to expand, then tap a meal to generate its full recipe
          </div>
        )}
      </div>

      {showShopping && (
        <ShoppingList
          flatDays={FLAT_DAYS}
          getRecipe={getRecipe}
          onClose={() => setShowShopping(false)}
        />
      )}
    </div>
  );
}
