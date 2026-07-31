// Single source of truth for the 30-day meal calendar.
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
];

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
// Used by the seed and export scripts to enumerate the full 30-day set.
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
