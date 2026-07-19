import { useState, useEffect } from "react";
import { callClaude } from "./lib/claude";

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

const chains = [
  { id:"c1", anchor:"Whole Roast Chicken + Stock", emoji:"🐔", passive:"~2 hrs roast + 8 hrs stock (overnight)", days:[
    {day:1,dow:"Sun",cuisine:"French",  type:"ANCHOR",meal:"Poulet Roti with Herbed Butter",       cost:"$$"},
    {day:2,dow:"Mon",cuisine:"Mexican", type:"CHAIN", meal:"Chicken Tinga Tacos",                  cost:"$"},
    {day:3,dow:"Tue",cuisine:"Thai",    type:"CHAIN", meal:"Thai Chicken Noodle Soup (Khao Soi)",  cost:"$"},
    {day:4,dow:"Wed",cuisine:"Indian",  type:"CHAIN", meal:"Chicken Stock Dal",                    cost:"$"},
  ]},
  { id:"c2", anchor:"Pork Shoulder — Low & Slow", emoji:"🥩", passive:"6–8 hrs slow cooker (passive while working)", days:[
    {day:5,dow:"Thu",cuisine:"Jamaican",type:"ANCHOR",meal:"Jerk Pork with Coconut Rice & Peas",   cost:"$$"},
    {day:6,dow:"Fri",cuisine:"Chinese", type:"CHAIN", meal:"Char Siu Pork Fried Rice",             cost:"$"},
    {day:7,dow:"Sat",cuisine:"Mexican", type:"CHAIN", meal:"Carnitas Tacos with Salsa Verde",      cost:"$"},
  ]},
  { id:"c3", anchor:"Dried Black Beans — Big Batch", emoji:"🫘", passive:"3–4 hrs simmer (passive)", days:[
    {day:8, dow:"Sun",cuisine:"Mexican", type:"ANCHOR",meal:"Frijoles de la Olla",                 cost:"$"},
    {day:9, dow:"Mon",cuisine:"Jamaican",type:"CHAIN", meal:"Jamaican Rice & Peas",                cost:"$"},
    {day:10,dow:"Tue",cuisine:"Mexican", type:"CHAIN", meal:"Black Bean Enchiladas",               cost:"$"},
  ]},
  { id:"c4", anchor:"Whole Chicken #2 — Poached", emoji:"🐔", passive:"1.5 hrs poach + stock ready", days:[
    {day:11,dow:"Wed",cuisine:"French",  type:"ANCHOR",meal:"Poule au Pot",                        cost:"$$"},
    {day:12,dow:"Thu",cuisine:"Thai",    type:"CHAIN", meal:"Khao Man Gai (Thai Poached Chicken Rice)", cost:"$"},
    {day:13,dow:"Fri",cuisine:"Italian", type:"CHAIN", meal:"Stracciatella Soup with Chicken",     cost:"$"},
  ]},
  { id:"c5", anchor:"Slow Tomato Sauce — Double Batch", emoji:"🍅", passive:"4 hrs low simmer (passive)", days:[
    {day:14,dow:"Sat",cuisine:"Italian", type:"ANCHOR",meal:"Spaghetti al Pomodoro",               cost:"$"},
    {day:15,dow:"Sun",cuisine:"Italian", type:"CHAIN", meal:"Shakshuka (Eggs in Tomato Sauce)",    cost:"$"},
    {day:16,dow:"Mon",cuisine:"Mexican", type:"CHAIN", meal:"Huevos Rancheros",                    cost:"$"},
  ]},
  { id:"c6", anchor:"Red Lentils — Big Pot", emoji:"🍛", passive:"45 min–2 hrs (mostly passive)", days:[
    {day:17,dow:"Tue",cuisine:"Indian",  type:"ANCHOR",meal:"Masoor Dal Tadka",                    cost:"$"},
    {day:18,dow:"Wed",cuisine:"French",  type:"CHAIN", meal:"French Lentil Soup",                  cost:"$"},
    {day:19,dow:"Thu",cuisine:"Mexican", type:"CHAIN", meal:"Lentil-Stuffed Poblanos",             cost:"$"},
  ]},
  { id:"c7", anchor:"Pork Belly Braise", emoji:"🥩", passive:"3 hrs oven braise (passive)", days:[
    {day:20,dow:"Fri",cuisine:"Chinese", type:"ANCHOR",meal:"Hong Shao Rou (Red-Braised Pork Belly)", cost:"$$"},
    {day:21,dow:"Sat",cuisine:"Chinese", type:"CHAIN", meal:"Braised Pork Fried Rice",             cost:"$"},
    {day:22,dow:"Sun",cuisine:"Jamaican",type:"CHAIN", meal:"Pork & Callaloo Stew",                cost:"$"},
  ]},
  { id:"c8", anchor:"Whole Chicken #3 — The World Tour", emoji:"🐔", passive:"60 min roast + overnight stock", days:[
    {day:23,dow:"Mon",cuisine:"Jamaican",type:"ANCHOR",meal:"Jerk Grilled Chicken + Festival Bread", cost:"$$"},
    {day:24,dow:"Tue",cuisine:"Thai",    type:"CHAIN", meal:"Green Curry with Chicken",            cost:"$"},
    {day:25,dow:"Wed",cuisine:"Italian", type:"CHAIN", meal:"Chicken Cacciatore",                  cost:"$"},
    {day:26,dow:"Thu",cuisine:"Indian",  type:"CHAIN", meal:"Chicken Biryani (leftover chicken)",  cost:"$"},
  ]},
  { id:"c9", anchor:"Big Pot of Rice + Congee Base", emoji:"🍚", passive:"2–3 hrs congee simmer (passive)", days:[
    {day:27,dow:"Fri",cuisine:"Chinese", type:"ANCHOR",meal:"Congee with Soft-Boiled Egg & Scallion", cost:"$"},
    {day:28,dow:"Sat",cuisine:"Thai",    type:"CHAIN", meal:"Khao Tom (Thai Rice Soup)",           cost:"$"},
  ]},
  { id:"c10", anchor:"Bagel Dough — Cold Proof", emoji:"🥯", passive:"12+ hrs cold proof (overnight)", days:[
    {day:29,dow:"Sun",cuisine:"American",type:"ANCHOR",meal:"Fresh Homemade Bagels",               cost:"$"},
    {day:30,dow:"Mon",cuisine:"French",  type:"CHAIN", meal:"French Onion Soup + Bagel Crouton",   cost:"$"},
  ]},
];

async function fetchRecipe(meal, cuisine) {
  const prompt = `You are a frugal home cook expert. Give a complete recipe for "${meal}" (${cuisine} cuisine).

Format your response as JSON only, no markdown, no backticks. Use this exact structure:
{
  "description": "2-sentence description of the dish",
  "servings": "4",
  "prepTime": "15 min",
  "cookTime": "45 min",
  "passiveTip": "one sentence on what to do while it cooks (if it's a slow cook)",
  "ingredients": [
    {"amount": "2", "unit": "lbs", "item": "chicken thighs"},
    ...
  ],
  "steps": [
    {"n": 1, "title": "Short title", "text": "Full instruction."},
    ...
  ],
  "frugalTips": ["tip 1", "tip 2"],
  "leftoversUse": "One sentence on how to use leftovers tomorrow"
}`;

  return callClaude(prompt);
}

export default function App() {
  const [openChain, setOpenChain] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [recipes, setRecipes] = useState({});
  const [loading, setLoading] = useState({});

  const selDayData = selectedDay
    ? chains.flatMap(c => c.days).find(d => d.day === selectedDay)
    : null;

  async function loadRecipe(day) {
    if (recipes[day] || loading[day]) return;
    setLoading(l => ({ ...l, [day]: true }));
    try {
      const d = chains.flatMap(c => c.days).find(x => x.day === day);
      const recipe = await fetchRecipe(d.meal, d.cuisine);
      setRecipes(r => ({ ...r, [day]: recipe }));
    } catch (e) {
      setRecipes(r => ({ ...r, [day]: { error: "Could not load recipe. Try again." } }));
    }
    setLoading(l => ({ ...l, [day]: false }));
  }

  function selectDay(day) {
    if (selectedDay === day) { setSelectedDay(null); return; }
    setSelectedDay(day);
    loadRecipe(day);
  }

  const recipe = selectedDay ? recipes[selectedDay] : null;
  const isLoading = selectedDay ? loading[selectedDay] : false;
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
                      const hasRecipe = !!recipes[d.day];
                      const isLd = loading[d.day];
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
                            {isLd && <span style={{ fontSize:"9px", color:"#555" }}>loading…</span>}
                            {hasRecipe && !isLd && <span style={{ fontSize:"9px", color:"#22c55e" }}>✓ ready</span>}
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
    </div>
  );
}
