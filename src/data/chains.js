// Single source of truth for the meal calendar (Month 1 days 1–30, Month 2 days 31–46).
// Each anchor ingredient chains into 3–4 follow-up meals across cuisines.
// Shape: { id, anchor, emoji, passive, days: [{ day, dow, cuisine, type, meal, cost }] }
// Imported by src/App.jsx (UI), scripts/seed-recipes.mjs, and scripts/export-obsidian.mjs.

export const chains = [
  { id:"c1", anchor:"Whole Roast Chicken + Stock", emoji:"🐔", passive:"~2 hrs roast + 8 hrs stock (overnight)", days:[
    {day:1,dow:"Sun",cuisine:"French",  type:"ANCHOR",meal:"Poulet Roti with Herbed Butter",       cost:"$$"},
    {day:2,dow:"Mon",cuisine:"Mexican", type:"CHAIN", meal:"Chicken Tinga Tacos",                  cost:"$",
      variants:[{id:"thai", cuisine:"Thai", meal:"Thai Larb-Style Chicken Lettuce Wraps", cost:"$"}]},
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
    {day:9, dow:"Mon",cuisine:"Jamaican",type:"CHAIN", meal:"Jamaican Rice & Peas",                cost:"$",
      variants:[{id:"indian", cuisine:"Indian", meal:"Black Bean Chana-Style Curry", cost:"$"}]},
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
    {day:24,dow:"Tue",cuisine:"Thai",    type:"CHAIN", meal:"Green Curry with Chicken",            cost:"$",
      variants:[{id:"indian", cuisine:"Indian", meal:"Chicken Korma with Roast Chicken Leftovers", cost:"$"}]},
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

  // ── Month 2 (days 31–46) ────────────────────────────────────────────────
  // Four new cuisines, same rule: one long passive anchor, then leftovers
  // that stop looking like leftovers.
  { id:"c11", anchor:"Beef Shank & Oxtail — Phở Broth", emoji:"🍜", passive:"8 hrs low simmer + overnight rest (skim once, ignore the rest)", days:[
    {day:31,dow:"Tue",cuisine:"Vietnamese",type:"ANCHOR",meal:"Phở Bò with Charred Onion & Ginger",        cost:"$$"},
    {day:32,dow:"Wed",cuisine:"Vietnamese",type:"CHAIN", meal:"Bún Bò Nam Bộ (Shank & Herb Noodle Salad)", cost:"$"},
    {day:33,dow:"Thu",cuisine:"American",  type:"CHAIN", meal:"Beef, Barley & Kale Broth",                 cost:"$"},
    {day:34,dow:"Fri",cuisine:"Vietnamese",type:"CHAIN", meal:"Bánh Mì with Braised Shank & Quick Pickles",cost:"$"},
  ]},
  { id:"c12", anchor:"Ethiopian Onion Base — Cooked Dry", emoji:"🫕", passive:"2 hrs dry-cooked onions + 90 min braise (stir twice an hour)", days:[
    {day:35,dow:"Sat",cuisine:"Ethiopian",type:"ANCHOR",meal:"Doro Wat with Hard-Boiled Eggs & Injera", cost:"$$"},
    {day:36,dow:"Sun",cuisine:"Ethiopian",type:"CHAIN", meal:"Misir Wat (Red Lentils in the Same Base)", cost:"$"},
    {day:37,dow:"Mon",cuisine:"Ethiopian",type:"CHAIN", meal:"Gomen & Atkilt — Collards, Cabbage, Carrot",cost:"$"},
    {day:38,dow:"Tue",cuisine:"Indian",   type:"CHAIN", meal:"Berbere Chicken & Chickpea Stew",           cost:"$"},
  ]},
  { id:"c13", anchor:"Kombu-Shiitake Dashi — Cold Brew", emoji:"🍶", passive:"12 hrs cold-brew dashi (fridge, hands-off) + 40 min simmer", days:[
    {day:39,dow:"Wed",cuisine:"Japanese",type:"ANCHOR",meal:"Nikujaga (Simmered Beef & Potatoes)",     cost:"$$"},
    {day:40,dow:"Thu",cuisine:"Japanese",type:"CHAIN", meal:"Miso Soup with Tofu & Wakame + Onigiri",  cost:"$"},
    {day:41,dow:"Fri",cuisine:"Japanese",type:"CHAIN", meal:"Oyakodon (Chicken & Egg over Rice)",      cost:"$"},
    {day:42,dow:"Sat",cuisine:"Chinese", type:"CHAIN", meal:"Dashi Fried Rice with Yesterday's Nikujaga", cost:"$"},
  ]},
  { id:"c14", anchor:"Pork Shoulder Kleftiko — Sealed & Slow", emoji:"🍋", passive:"4 hrs sealed in the oven (open it once, at the end)", days:[
    {day:43,dow:"Sun",cuisine:"Greek",  type:"ANCHOR",meal:"Kleftiko with Lemon Potatoes & Oregano",   cost:"$$"},
    {day:44,dow:"Mon",cuisine:"Greek",  type:"CHAIN", meal:"Youvetsi — Pork & Orzo Baked in the Juices",cost:"$"},
    {day:45,dow:"Tue",cuisine:"Greek",  type:"CHAIN", meal:"Avgolemono with Shredded Pork & Rice",     cost:"$"},
    {day:46,dow:"Wed",cuisine:"Italian",type:"CHAIN", meal:"Lemon-Pork Ragù over Pappardelle",         cost:"$"},
  ]},
];

// Total nights on the calendar, derived from the data above. Variants are
// alternate takes on an existing day, never extra days — they never count here.
export const DAY_COUNT = chains.reduce((n, c) => n + c.days.length, 0);

// Stable key for a meal across the app + DB + scripts. Format: "<chainId>-d<day>" e.g. "c1-d2".
export function mealId(chainId, day) {
  return `${chainId}-d${day}`;
}

// A handful of chain days optionally carry a `variants` array — an alternate
// cuisine take on that day's leftover stage (e.g. day 2's Tinga Tacos also
// has a Thai wrap option). Addressed as an extension of the base mealId so
// the existing Supabase meal_library / localStorage / useRecipe cache all
// work unmodified — it's just another string key, not a new dimension.
export function variantMealId(chainId, day, variantId) {
  return `${mealId(chainId, day)}-alt-${variantId}`;
}

// Flatten every meal across all chains, carrying its chain context and stable meal_id.
// Used by the seed and export scripts to enumerate the full calendar.
export function enumerateMeals() {
  return chains.flatMap((c) =>
    c.days.map((d) => ({
      mealId: mealId(c.id, d.day),
      chainId: c.id,
      anchor: c.anchor,
      emoji: c.emoji,
      passive: c.passive,
      day: d.day,
      dow: d.dow,
      cuisine: d.cuisine,
      type: d.type,
      meal: d.meal,
      cost: d.cost,
    })),
  );
}
