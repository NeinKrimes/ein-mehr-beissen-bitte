// Design tokens — "the printed cookbook, lit by one lamp".
// Implements the EMB adaptation of the Gloam design system (dark/night scope,
// lamp-gold accent). See the Claude Design project "Ein Mehr Beissen Bitte UI Design".
//
// Rules that shape every component here:
//  · One gold thing per view. Gold = the single raised voice.
//  · Cuisine hue is only a dot, a hairline, or a wash under 8% — never a fill, never an icon.
//  · A dish is identified by its photograph and its cuisine rule — never by an emoji/icon.
//  · Numbers are IBM Plex Mono, unrounded (money to the cent).
//  · Instrument Serif for display (never bold), Newsreader for body, Space Grotesk for labels.

export const T = {
  // Grounds & surfaces (two backgrounds max: near-black + a raised card)
  page: "#08080a",
  bg: "#0c0c0f",
  surface: "#16161d",
  surface2: "#1d1d26",
  line: "rgba(236,227,210,0.12)",
  lineSoft: "rgba(236,227,210,0.07)",

  // Ink (warm paper on a cold kitchen)
  ink: "#ece3d2",
  ink2: "#a29a8b",
  ink3: "#6f6a5e",

  // One accent, two semantics
  gold: "#e8a020",
  goldHi: "#f5bb55",
  frugal: "#46d18a", // value only
  cal: "#ff9d3c",    // energy only

  // Fonts — four voices
  display: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  body: "'Newsreader', Georgia, serif",
  sans: "'Space Grotesk', system-ui, -apple-system, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",

  // Radius / motion (from gloam tokens)
  rSm: "6px", rMd: "16px", rLg: "20px", rPill: "999px",
  ease: "cubic-bezier(0.22,0.61,0.36,1)",
  durFast: "180ms", durBase: "320ms", durSlow: "600ms",

  // Elevation
  glowGold: "0 0 28px rgba(232,160,32,0.32)",
  lift: "0 10px 30px rgba(0,0,0,0.45)",
  modal: "0 30px 80px rgba(0,0,0,0.6)",
  focus: "0 0 0 3px rgba(232,160,32,0.28)",
};

// Cuisine hues — categorical, used as dot / hairline / wash only.
export const CUISINE_META = {
  Mexican:  { color: "#e84040" },
  Italian:  { color: "#4a9eff" },
  Indian:   { color: "#ff9500" },
  French:   { color: "#a78bfa" },
  Jamaican: { color: "#22c55e" },
  Thai:     { color: "#f472b6" },
  Chinese:  { color: "#facc15" },
  American: { color: "#94a3b8" },
};

export function cuisineColor(cuisine) {
  return CUISINE_META[cuisine]?.color ?? T.ink3;
}

// Parse "15 min" / "1 hr 20 min" into total minutes (best effort).
export function parseMinutes(...parts) {
  let total = 0;
  for (const p of parts) {
    if (!p) continue;
    const s = String(p).toLowerCase();
    const hr = /(\d+)\s*(hr|hour)/.exec(s);
    const min = /(\d+)\s*(min)/.exec(s);
    if (hr) total += Number(hr[1]) * 60;
    if (min) total += Number(min[1]);
    if (!hr && !min) { const n = /(\d+)/.exec(s); if (n) total += Number(n[1]); }
  }
  return total || null;
}

// Macro grams -> calories. Order is fixed everywhere: protein, carb, fat.
// Colors are fixed too: protein GOLD, carb AMBER, fat PARCHMENT.
export function macroCals(recipe) {
  const p = Number(recipe?.protein_g) || 0;
  const c = Number(recipe?.carbs_g) || 0;
  const f = Number(recipe?.fat_g) || 0;
  return { p: p * 4, c: c * 4, f: f * 9, pg: p, cg: c, fg: f };
}
export const MACRO_COLORS = { protein: "#e8a020", carb: "#ff9d3c", fat: "#ece3d2" };

// The four calendar lenses ("Ordered by"). Recolour + re-sort all thirty nights.
export const LENSES = [
  { key: "value",    label: "Value",    unit: "cal/$", color: "#46d18a", field: (r) => Number(r?.cal_per_dollar) || null, better: "high" },
  { key: "energy",   label: "Energy",   unit: "kcal",  color: "#ff9d3c", field: (r) => Number(r?.calories) || null,       better: "high" },
  { key: "protein",  label: "Protein",  unit: "g",     color: "#e8a020", field: (r) => Number(r?.protein_g) || null,      better: "high" },
  { key: "cost",     label: "Cost",     unit: "$/serv",color: "#a29a8b", field: (r) => Number(r?.est_cost_usd) || null,   better: "low" },
];
