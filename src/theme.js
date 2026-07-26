// Design tokens for the "cookbook after dark" UI (claude.ai/design project
// "Ein Mehr Beissen Bitte UI Design", turn 2). One gold thing per page.

export const FONTS = {
  display: "'Instrument Serif', serif",
  body: "'Newsreader', serif",
  label: "'Space Grotesk', sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

export const COLORS = {
  ground: "#0c0c0f",      // page ground
  masthead: "#101014",    // top bar
  page: "#15151b",        // left/primary page surface
  pageAlt: "#0f0f14",     // right/secondary page surface
  plate: "#101015",       // photo-circle base
  parchment: "#ece3d2",   // primary text
  gold: "#e8a020",        // lamp gold — one per view
  goldLight: "#f5bb55",
  green: "#46d18a",       // frugal green — value only
  amber: "#ff9d3c",       // calorie amber — energy only
  muted: "#a29a8b",       // muted body
  faint: "#7d766a",       // italic captions
  faintest: "#6f6a5f",
  listInk: "#d6cebd",     // contents-page row text
};

export const CUISINE_COLORS = {
  Mexican: "#e84040", Italian: "#4a9eff", Indian: "#ff9500", French: "#a78bfa",
  Jamaican: "#22c55e", Thai: "#f472b6", Chinese: "#facc15", American: "#94a3b8",
};

// rgba() over the parchment tone — hairlines, dotted leaders, dimmed text.
export const parch = (a) => `rgba(236,227,210,${a})`;

export const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const EASE = "cubic-bezier(.22,.61,.36,1)";

// Space Grotesk microlabel — the design's universal caption voice.
export const label = (size = 10, color = parch(0.36), tracking = ".2em") => ({
  fontFamily: FONTS.label, fontSize: size, fontWeight: 700,
  letterSpacing: tracking, textTransform: "uppercase", color,
});

export const mono = (size, color = COLORS.parchment) => ({
  fontFamily: FONTS.mono, fontSize: size, color,
});

export const display = (size, lineHeight = 1.05) => ({
  fontFamily: FONTS.display, fontSize: size, lineHeight, fontWeight: 400,
});

export const hairline = `1px solid ${parch(0.10)}`;
