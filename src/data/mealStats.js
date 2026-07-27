// Static per-day nutrition/cost estimates for the 30-day calendar, from the
// UI design's data table. These are design-time baselines: the recipe library
// (Supabase) still owns the authoritative per-recipe numbers once generated.
// Shape merged onto chains.js days: kcal, cost ($/serving), p (protein g),
// time (active minutes), short (contents-page name), blurb (plate caption).

import { chains, mealId } from "./chains";
import { COLORS, CUISINE_COLORS } from "../theme";

// day: [kcal, cost, protein, activeMin, short, blurb]
export const RAW = {
  1:  [520, 2.35, 42, 25, "Poulet Roti", "Butter under the skin, an hour of quiet, forty minutes of noise."],
  2:  [410, 2.05, 28, 20, "Tinga Tacos", "The breast meat, pulled cold, warmed through chipotle and tomato."],
  3:  [560, 2.45, 32, 25, "Khao Soi", "Stock from the carcass, curry paste, crisp noodles on top."],
  4:  [380, 1.35, 18, 15, "Stock Dal", "The last two cups of stock, red lentils, a tadka at the end."],
  5:  [680, 3.10, 46, 20, "Jerk Pork", "Six passive hours in the cooker while you answer email."],
  6:  [620, 1.80, 30, 18, "Char Siu Fried Rice", "Yesterday's pork, glazed sweet, thrown through day-old rice."],
  7:  [540, 1.95, 38, 22, "Carnitas Tacos", "The shoulder's crisp edges, salsa verde, doubled tortillas."],
  8:  [340, 0.62, 18, 10, "Frijoles de la Olla", "A pot of beans from dry — no soak, just time."],
  9:  [480, 0.95, 14, 15, "Rice & Peas", "The beans again: coconut milk, thyme, a whole scotch bonnet."],
  10: [520, 1.30, 22, 30, "Black Bean Enchiladas", "The last of the pot, rolled and baked until the edges catch."],
  11: [470, 2.20, 40, 20, "Poule au Pot", "A whole bird barely simmering; the broth is the point."],
  12: [610, 1.90, 44, 25, "Khao Man Gai", "Poached chicken over rice cooked in its own stock."],
  13: [300, 1.15, 24, 12, "Stracciatella", "Eggs whisked into hot broth, parmesan, the last of the meat."],
  14: [590, 0.92, 18, 15, "Spaghetti al Pomodoro", "The cheapest good night of the month."],
  15: [410, 1.15, 20, 18, "Shakshuka", "Sunday's sauce, five eggs, one skillet."],
  16: [520, 1.25, 22, 20, "Huevos Rancheros", "The sauce's last act: fried eggs, warm tortillas."],
  17: [430, 0.68, 22, 15, "Masoor Dal Tadka", "Sixty-eight cents a bowl."],
  18: [360, 0.80, 18, 20, "French Lentil Soup", "The same lentils gone quiet: mirepoix, thyme, a bay leaf."],
  19: [400, 1.10, 20, 35, "Lentil Poblanos", "Charred poblanos stuffed with what the pot had left."],
  20: [720, 2.80, 38, 25, "Hong Shao Rou", "Three hours in the oven, untouched, until it shines."],
  21: [640, 1.55, 28, 18, "Braised Pork Fried Rice", "Braising liquid instead of soy sauce; day-old rice."],
  22: [480, 1.85, 30, 30, "Pork & Callaloo", "The last of the belly: greens, coconut, scotch bonnet."],
  23: [600, 2.60, 52, 30, "Jerk Grilled Chicken", "The grill does the talking; festival bread does the mopping."],
  24: [540, 2.10, 34, 22, "Green Curry", "Leftover chicken through a paste worth making once."],
  25: [490, 1.95, 36, 35, "Chicken Cacciatore", "Hunter's chicken — peppers, tomatoes, whatever the week left."],
  26: [650, 1.60, 40, 40, "Chicken Biryani", "The bones' last stock steams the rice from below."],
  27: [320, 0.50, 16, 10, "Congee", "A cup of rice becomes a pot of quiet."],
  28: [350, 0.72, 18, 12, "Khao Tom", "The congee loosened into soup: fish sauce, white pepper."],
  29: [290, 0.45, 10, 35, "Homemade Bagels", "Proofed overnight, boiled at dawn."],
  30: [380, 1.05, 14, 30, "French Onion Soup", "Onions cooked past patience, a stale bagel as the raft."],
};

// Every meal, flattened and merged with its stats. Macro split is estimated
// from kcal/protein (42% of energy from carbs, remainder fat).
export const MEALS = chains.flatMap((c) =>
  c.days.map((d) => {
    const [kcal, cost, p, time, short, blurb] = RAW[d.day];
    const carbs = Math.round((kcal * 0.42) / 4);
    const fat = Math.max(4, Math.round((kcal - p * 4 - carbs * 4) / 9));
    return {
      ...d,
      chainId: c.id, mealId: mealId(c.id, d.day),
      anchor: c.anchor, passive: c.passive,
      kcal, cost, p, carbs, fat, time, short, blurb,
      cpd: Math.round(kcal / cost),
      color: CUISINE_COLORS[d.cuisine],
    };
  }),
).sort((a, b) => a.day - b.day);

const bounds = (key) => {
  const vals = MEALS.map((m) => m[key]);
  return { min: Math.min(...vals), max: Math.max(...vals) };
};

// The four calendar lenses. `high` = larger is better.
export const LENSES = {
  value:    { label: "Value",    unit: "cal/$", key: "cpd",  color: COLORS.green,  high: true,  ...bounds("cpd") },
  calories: { label: "Calories", unit: "kcal",  key: "kcal", color: COLORS.amber,  high: true,  ...bounds("kcal") },
  protein:  { label: "Protein",  unit: "g",     key: "p",    color: COLORS.gold,   high: true,  ...bounds("p") },
  time:     { label: "Time",     unit: "min",   key: "time", color: "#94a3b8",     high: false, ...bounds("time") },
};

export const mealByDay = (day) => MEALS.find((m) => m.day === day);
