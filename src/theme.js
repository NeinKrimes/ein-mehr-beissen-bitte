// Design tokens for the soft-industrial kitchen UI. Warm mineral surfaces,
// brushed steel, oak, and a single paprika accent keep the palette restrained.

export const FONTS = {
  display: "'Instrument Serif', serif",
  body: "'Avenir Next', 'Segoe UI', system-ui, sans-serif",
  label: "'Avenir Next', 'Segoe UI', system-ui, sans-serif",
  mono: "'IBM Plex Mono', monospace",
};

export const COLORS = {
  ground: "#F4F0E8",      // warm ivory page ground
  masthead: "#E6E0D5",    // limestone top bar
  page: "#FBF8F2",        // primary work surface
  pageAlt: "#EDE7DC",     // secondary limestone surface
  plate: "#D8DDE0",       // brushed-steel inset
  parchment: "#2B2925",   // primary ink (legacy token name)
  gold: "#8C3B2B",        // paprika accent (legacy token name)
  goldLight: "#9F4533",   // lighter paprika, still AA on all surfaces
  green: "#356347",       // restrained herb green — value only
  amber: "#895323",       // toasted oak — energy only
  muted: "#5D5952",       // secondary body ink
  faint: "#646058",       // captions
  faintest: "#656058",    // lowest-emphasis AA text
  listInk: "#3C3934",     // contents-page row text
  steel: "#56636A",       // cool structural detail
  oak: "#765C3C",         // warm material detail
  brass: "#745B18",       // sparing non-interactive material accent
  border: "#827A70",      // AA-visible limestone hairline / control edge
  borderStrong: "#7F776E",
  danger: "#963D34",
};

export const CUISINE_COLORS = {
  Mexican: "#963D34", Italian: "#35647A", Indian: "#865122", French: "#68527A",
  Jamaican: "#3F684D", Thai: "#884765", Chinese: "#735A16", American: "#596166",
  // Month 2 cuisines — hues chosen for the gaps left in the wheel above
  // (teal, deep rust, indigo, azure) so no two dots read as the same colour.
  Vietnamese: "#2F6F6A", Ethiopian: "#7B3428", Japanese: "#4C4A86", Greek: "#3A79A8",
  // Source-library cuisines. These never appear on the calendar, only in the
  // Library room, but every swatch has to resolve or the dot renders blank.
  German: "#6B5540", Spanish: "#8A4A24", Korean: "#7A3F52", Portuguese: "#2F5F52",
  Brazilian: "#4A6B33", Swedish: "#456A85", Cuban: "#8A6A22",
};

// Every cuisine resolves to a swatch; unknown ones fall back to the accent
// rather than rendering an invisible dot.
export const cuisineColor = (cuisine) => CUISINE_COLORS[cuisine] ?? COLORS.gold;

// rgba() over the primary ink — hairlines, dotted leaders, and dimmed details.
export const parch = (a) => `rgba(43,41,37,${a})`;

export const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export const EASE = "cubic-bezier(.22,.61,.36,1)";

// Humanist-sans microlabel — the design's universal caption voice.
export const label = (size = 10, color = COLORS.faint, tracking = ".2em") => ({
  fontFamily: FONTS.label, fontSize: size, fontWeight: 700,
  letterSpacing: tracking, textTransform: "uppercase", color,
});

export const mono = (size, color = COLORS.parchment) => ({
  fontFamily: FONTS.mono, fontSize: size, color,
});

export const display = (size, lineHeight = 1.05) => ({
  fontFamily: FONTS.display, fontSize: size, lineHeight, fontWeight: 400,
});

export const hairline = `1px solid ${COLORS.border}`;
