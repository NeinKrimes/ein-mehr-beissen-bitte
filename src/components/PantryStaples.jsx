import { useState, useMemo } from "react";
// Straight from the eager summary: this panel is a headline on a room the user
// opens often, so it must not wait on the network or pull the index chunk.
import { SOURCE_STAPLES, STAPLE_COVERAGE, SOURCE_RECIPE_COUNT } from "../data/sourceSummary";
import { COLORS, FONTS, EASE, label, mono, display, rgba, hairline } from "../theme";
import { useIsMobile } from "../hooks/useViewport";

// What to keep in the house. Ranked by how many of the library's recipes call
// for each thing, computed at build time — see scripts/staples.mjs.
//
// Deliberately framed as "how much of the shopping this removes" rather than
// "recipes you can cook for free", because almost none are: even the full
// pantry leaves a typical recipe needing a few things.

const SIZES = [10, 20, 30];

// Kitchen order, which is roughly shopping order too.
const GROUP_ORDER = ["produce", "meat", "dairy", "pantry", "oil & vinegar", "herbs & spices", "baking", "seasoning"];

function Bar({ share, color }) {
  return (
    <span aria-hidden="true" style={{ display: "block", height: 3, background: rgba(COLORS.border, .35), borderRadius: 2, overflow: "hidden" }}>
      <span style={{ display: "block", height: "100%", width: `${Math.round(share * 100)}%`, background: color, transition: `width 300ms ${EASE}` }} />
    </span>
  );
}

export default function PantryStaples({ onOpenLibrary }) {
  const isMobile = useIsMobile();
  const [size, setSize] = useState(20);
  const [grouped, setGrouped] = useState(false);

  const shown = useMemo(() => SOURCE_STAPLES.slice(0, size), [size]);
  const coverage = useMemo(
    () => STAPLE_COVERAGE.reduce((best, c) => (Math.abs(c.pantry - size) < Math.abs(best.pantry - size) ? c : best), STAPLE_COVERAGE[0]),
    [size],
  );

  const byGroup = useMemo(() => {
    const m = new Map();
    for (const s of shown) {
      if (!m.has(s.group)) m.set(s.group, []);
      m.get(s.group).push(s);
    }
    return [...m.entries()].sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]));
  }, [shown]);

  if (!SOURCE_STAPLES.length) return null;

  const Row = ({ s, i }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "7px 0", borderTop: i ? `1px solid ${rgba(COLORS.border, .35)}` : "none" }}>
      <span style={{ ...mono(11, COLORS.faint), minWidth: 22 }}>{String(i + 1).padStart(2, "0")}</span>
      <span style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.listInk, minWidth: isMobile ? 120 : 168 }}>{s.name}</span>
      <span style={{ flex: 1, minWidth: 40 }}><Bar share={s.share} color={COLORS.oak} /></span>
      <span style={{ ...mono(11, COLORS.green), whiteSpace: "nowrap" }}>{Math.round(s.share * 100)}%</span>
    </div>
  );

  return (
    <section style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <span style={{ ...label(10, COLORS.muted, ".2em"), whiteSpace: "nowrap" }}>Pantry staples</span>
        <span style={{ height: 1, background: COLORS.border, flex: 1 }} />
        <span style={mono(10, COLORS.faint)}>across {SOURCE_RECIPE_COUNT} library recipes</span>
      </div>

      <div style={{ padding: isMobile ? "16px" : "18px 20px", background: COLORS.page, border: hairline, borderRadius: 3 }}>
        <div style={{ ...display(isMobile ? 20 : 23, 1.15), color: COLORS.parchment }}>
          Keep <span style={{ color: COLORS.gold }}>{size} things</span> in the house and{" "}
          <span style={{ color: COLORS.gold }}>{Math.round(coverage.linesCovered * 100)}%</span> of the shopping is already done.
        </div>
        <div style={{ fontFamily: FONTS.body, fontStyle: "italic", color: COLORS.muted, fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>
          {coverage.recipesWithinFourExtras} of {SOURCE_RECIPE_COUNT} recipes then need four fresh items or fewer.
          Almost nothing cooks from the pantry alone — this is about how short the list gets, not about cooking for free.
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: "16px 0 4px" }}>
          {SIZES.map((n) => (
            <button
              key={n}
              onClick={() => setSize(n)}
              aria-pressed={size === n}
              style={{
                ...label(9, size === n ? COLORS.page : COLORS.muted, ".14em"),
                background: size === n ? COLORS.oak : COLORS.page,
                border: `1px solid ${size === n ? COLORS.oak : COLORS.border}`,
                borderRadius: 999, minHeight: 34, padding: "0 14px", cursor: "pointer",
                transition: `all 180ms ${EASE}`,
              }}
            >
              Top {n}
            </button>
          ))}
          <button
            onClick={() => setGrouped((g) => !g)}
            aria-pressed={grouped}
            style={{
              ...label(9, grouped ? COLORS.page : COLORS.muted, ".14em"),
              background: grouped ? COLORS.steel : COLORS.page,
              border: `1px solid ${grouped ? COLORS.steel : COLORS.border}`,
              borderRadius: 999, minHeight: 34, padding: "0 14px", cursor: "pointer", marginLeft: "auto",
              transition: `all 180ms ${EASE}`,
            }}
          >
            {grouped ? "By aisle" : "By frequency"}
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          {grouped
            ? byGroup.map(([g, items]) => (
                <div key={g} style={{ marginTop: 14 }}>
                  <div style={{ ...label(8, COLORS.steel, ".18em"), marginBottom: 4 }}>{g}</div>
                  {items.map((s, i) => <Row key={s.name} s={s} i={i} />)}
                </div>
              ))
            : shown.map((s, i) => <Row key={s.name} s={s} i={i} />)}
        </div>

        {onOpenLibrary && (
          <button
            onClick={onOpenLibrary}
            style={{
              ...label(9, COLORS.oak, ".14em"), marginTop: 16, minHeight: 44, padding: "0 16px",
              background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, cursor: "pointer",
            }}
          >
            Browse the library →
          </button>
        )}
      </div>
    </section>
  );
}
