import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { SOURCE_CUISINES, SOURCE_RECIPE_COUNT, loadSourceIndex, loadSourceRecipe } from "../data/sourceRecipes";
import { COLORS, FONTS, EASE, label, mono, display, rgba, hairline, cuisineColor } from "../theme";
import { useIsMobile } from "../hooks/useViewport";

// The library — the back half of the cookbook, where the recipes that aren't
// on the calendar live. Everything on this screen comes from the index, which
// carries no ingredients or steps; the full record is fetched only when a row is
// opened, so browsing the whole library downloads nothing extra.
//
// The index itself is fetched (Supabase, or the bundled chunk when it cannot
// answer) rather than imported, so it costs nothing until this room is opened.
// The headline count comes from the eager summary instead, so the page has a
// real number to draw before the rows land.

// A recipe with no printed calories sorts last on every numeric lens rather
// than first, so a gap in the source never looks like a bargain.
export const SORTS = [
  { id: "title", name: "A–Z", of: (r) => r.title, dir: 1 },
  { id: "value", name: "Most calories per dollar", of: (r) => r.cal_per_dollar ?? -1, dir: -1 },
  { id: "cost", name: "Cheapest first", of: (r) => r.est_cost_usd ?? Infinity, dir: 1 },
  { id: "light", name: "Lightest first", of: (r) => r.calories ?? Infinity, dir: 1 },
];

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ");

// Every search term must match somewhere in title/subtitle/cuisine, so adding
// a word narrows the list instead of widening it.
export function filterAndSort(index, { query = "", cuisine = "All", sortId = "title" } = {}) {
  const terms = norm(query).trim().split(/\s+/).filter(Boolean);
  const sort = SORTS.find((s) => s.id === sortId) ?? SORTS[0];
  return index
    .filter((r) => cuisine === "All" || r.cuisine === cuisine)
    .filter((r) => {
      if (!terms.length) return true;
      const hay = norm(`${r.title} ${r.subtitle} ${r.cuisine}`);
      return terms.every((t) => hay.includes(t));
    })
    .slice()
    .sort((a, b) => {
      const x = sort.of(a), y = sort.of(b);
      return typeof x === "string" ? x.localeCompare(y) * sort.dir : (x - y) * sort.dir;
    });
}

function Dot({ cuisine, size = 7 }) {
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", flex: `0 0 ${size}px`, background: cuisineColor(cuisine) }} />;
}

// A contents-page row: number, cuisine dot, title, dotted rule, one number.
const LeaderRow = memo(function LeaderRow({ recipe, n, selected, inBasket, onOpen, isMobile }) {
  const color = cuisineColor(recipe.cuisine);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(recipe.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(recipe.id))}
      style={{
        display: "flex", alignItems: "baseline", gap: 10, cursor: "pointer",
        padding: isMobile ? "13px 8px" : "12px 10px", minHeight: 44,
        borderTop: n ? `1px solid ${rgba(COLORS.border, .5)}` : "none",
        background: selected ? rgba(color, .09) : "transparent",
        transition: `background 180ms ${EASE}`,
      }}
    >
      <span style={{ ...mono(11, COLORS.faint), minWidth: 26 }}>{String(n + 1).padStart(2, "0")}</span>
      <Dot cuisine={recipe.cuisine} />
      <span style={{ fontFamily: FONTS.display, fontSize: isMobile ? 17 : 19, lineHeight: 1.2, color: selected ? COLORS.gold : COLORS.parchment, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {recipe.title}
      </span>
      {/* The dotted leader. A repeating gradient, so it stretches to any width. */}
      <span aria-hidden="true" style={{ flex: 1, minWidth: 18, alignSelf: "center", height: 1, background: `repeating-linear-gradient(to right, ${rgba(COLORS.border, .85)} 0 2px, transparent 2px 6px)` }} />
      {inBasket && <span style={{ ...label(8, COLORS.gold, ".12em"), whiteSpace: "nowrap" }}>On list</span>}
      <span style={{ ...mono(12, COLORS.green), whiteSpace: "nowrap" }}>${(recipe.est_cost_usd ?? 0).toFixed(2)}</span>
    </div>
  );
});

function Ingredients({ list }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {list.map((ing, i) => (
        <li key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "7px 0", borderTop: i ? `1px solid ${rgba(COLORS.border, .35)}` : "none" }}>
          <span style={{ ...mono(12, COLORS.oak), minWidth: 74 }}>{[ing.amount, ing.unit].filter(Boolean).join(" ")}</span>
          <span style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.listInk, lineHeight: 1.45 }}>{ing.item}</span>
        </li>
      ))}
    </ul>
  );
}

function Detail({ state, onClose, isMobile, inBasket, onToggleBasket }) {
  if (state.loading) {
    return <div style={{ ...mono(12, COLORS.faint), padding: 26 }}>Fetching the recipe…</div>;
  }
  if (state.error) {
    return <div style={{ ...mono(12, COLORS.danger), padding: 26 }}>{state.error}</div>;
  }
  const r = state.recipe;
  const color = cuisineColor(r.cuisine);
  return (
    <div style={{ padding: isMobile ? "20px 16px 44px" : "26px 26px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dot cuisine={r.cuisine} size={8} />
          <span style={label(9, color, ".18em")}>{r.cuisine}</span>
        </div>
        <button onClick={onClose} aria-label="Close recipe" style={{ background: "transparent", border: 0, color: COLORS.faint, fontSize: 22, cursor: "pointer", minHeight: 44, minWidth: 44, marginTop: -10, marginRight: -10 }}>×</button>
      </div>

      <h2 style={{ ...display(isMobile ? 26 : 30), color: COLORS.parchment, margin: "12px 0 0" }}>{r.title}</h2>
      {r.subtitle && (
        <div style={{ fontFamily: FONTS.body, fontStyle: "italic", color: COLORS.muted, marginTop: 6, lineHeight: 1.45 }}>{r.subtitle}</div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, margin: "18px 0", padding: "13px 0", borderTop: hairline, borderBottom: hairline }}>
        {[
          ["Serves", r.servings],
          ["Total time", r.totalTime],
          ["Energy", r.calories && `${r.calories} kcal`],
          ["Protein", r.protein_g && `${r.protein_g} g`],
          ["Est. cost", r.est_cost_usd && `$${r.est_cost_usd.toFixed(2)}`],
        ].filter(([, v]) => v).map(([k, v]) => (
          <div key={k}>
            <div style={label(8, COLORS.faint, ".16em")}>{k}</div>
            <div style={{ ...mono(14), marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      {onToggleBasket && (
        <button
          onClick={() => onToggleBasket(r.id)}
          aria-pressed={!!inBasket}
          style={{
            ...label(10, inBasket ? COLORS.gold : COLORS.page, ".15em"),
            width: "100%", minHeight: 44, marginBottom: 22, cursor: "pointer", borderRadius: 4,
            background: inBasket ? "transparent" : COLORS.gold,
            border: `1px solid ${COLORS.gold}`,
            transition: `all 180ms ${EASE}`,
          }}
        >
          {inBasket ? "On the shopping list — remove" : "Add to shopping list"}
        </button>
      )}

      <div style={{ ...label(10, COLORS.muted, ".2em"), marginBottom: 8 }}>Ingredients</div>
      <Ingredients list={r.ingredients} />

      <div style={{ ...label(10, COLORS.muted, ".2em"), margin: "26px 0 10px" }}>Method</div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, counterReset: "step" }}>
        {r.steps.map((s) => (
          <li key={s.n} style={{ display: "flex", gap: 13, padding: "11px 0", borderTop: s.n > 1 ? `1px solid ${rgba(COLORS.border, .35)}` : "none" }}>
            <span style={{ ...mono(12, color), minWidth: 20, paddingTop: 2 }}>{String(s.n).padStart(2, "0")}</span>
            <div>
              <div style={{ ...label(9, COLORS.parchment, ".12em") }}>{s.title}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 14.5, color: COLORS.listInk, lineHeight: 1.62, marginTop: 5 }}>{s.text}</div>
            </div>
          </li>
        ))}
      </ol>

      {/* Ingredients and nutrition are reproduced as printed; the method is
          ours. Saying so is the point of the attribution, so it stays. */}
      <div style={{ ...mono(10.5, COLORS.faintest), marginTop: 26, paddingTop: 13, borderTop: hairline, lineHeight: 1.6 }}>
        Adapted from {r.attribution}. Ingredients and per-serving nutrition as printed; method rewritten.
      </div>
    </div>
  );
}

export default function LibraryRoom({ basket, onOpenShopping }) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("All");
  const [sortId, setSortId] = useState("title");
  const [openId, setOpenId] = useState(null);
  // { loading } | { recipe } | { error } — the corpus arrives as its own chunk.
  const [detail, setDetail] = useState(null);

  // null until the index arrives. Filtering an empty list in the meantime shows
  // the room's chrome immediately rather than a blank screen.
  const [index, setIndex] = useState(null);
  useEffect(() => {
    let live = true;
    loadSourceIndex()
      .then((rows) => live && setIndex(rows))
      .catch(() => live && setIndex([]));
    return () => { live = false; };
  }, []);

  const rows = useMemo(
    () => filterAndSort(index ?? [], { query, cuisine, sortId }),
    [index, query, cuisine, sortId],
  );

  const open = useCallback((id) => setOpenId((cur) => (cur === id ? null : id)), []);

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    let live = true;
    setDetail({ loading: true });
    loadSourceRecipe(openId)
      .then((recipe) => live && setDetail(recipe ? { recipe } : { error: "That recipe is not in the library." }))
      .catch(() => live && setDetail({ error: "Could not load that recipe." }));
    return () => { live = false; };
  }, [openId]);

  // Escape closes the open recipe from anywhere, including the mobile sheet,
  // which otherwise traps you behind a single × in the corner.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  // Counts drive the filter chips, so an empty cuisine can't be selected.
  const counts = useMemo(() => {
    const m = new Map();
    for (const r of index ?? []) m.set(r.cuisine, (m.get(r.cuisine) ?? 0) + 1);
    return m;
  }, [index]);

  const controlStyle = {
    fontFamily: FONTS.body, fontSize: 14, color: COLORS.parchment,
    background: COLORS.page, border: hairline, borderRadius: 3,
    minHeight: 44, padding: "0 12px",
  };

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: COLORS.ground, color: COLORS.parchment }}>
      <div style={{ minHeight: "100%", padding: isMobile ? "24px 16px 40px" : "34px clamp(20px,4vw,54px) 48px" }}>
        <div style={{ ...label(10, COLORS.gold, ".3em"), marginBottom: 8 }}>
          The library · {SOURCE_RECIPE_COUNT} recipes
        </div>
        <div style={{ ...display(isMobile ? 30 : 42, 1) }}>
          The back of the book, <span style={{ fontStyle: "italic", color: COLORS.gold }}>off-calendar.</span>
        </div>
        <div style={{ fontFamily: FONTS.body, fontStyle: "italic", color: COLORS.muted, marginTop: 9, maxWidth: 560, lineHeight: 1.5 }}>
          Real recipes adapted from the source shelf — not the 46 nights, just the shelf they were picked from.
        </div>

        {/* Adding a recipe is pointless if you cannot then get to the list. */}
        {basket?.count > 0 && onOpenShopping && (
          <button
            onClick={onOpenShopping}
            style={{
              ...label(10, COLORS.ground, ".15em"), marginTop: 16, minHeight: 44, padding: "0 18px",
              background: COLORS.gold, border: `1px solid ${COLORS.gold}`, borderRadius: 4, cursor: "pointer",
            }}
          >
            {basket.count} on the shopping list — open it
          </button>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", margin: "24px 0 14px" }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the library"
            aria-label="Search the library"
            style={{ ...controlStyle, flex: isMobile ? "1 1 100%" : "0 1 300px" }}
          />
          <select value={sortId} onChange={(e) => setSortId(e.target.value)} aria-label="Sort recipes" style={{ ...controlStyle, flex: isMobile ? "1 1 100%" : "0 0 auto", cursor: "pointer" }}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="embb-scrollx" style={{ display: "flex", gap: 7, paddingBottom: 6, marginBottom: 12 }}>
          {["All", ...SOURCE_CUISINES].map((c) => {
            const on = c === cuisine;
            const color = c === "All" ? COLORS.gold : cuisineColor(c);
            return (
              <button
                key={c}
                onClick={() => setCuisine(c)}
                aria-pressed={on}
                style={{
                  ...label(9, on ? COLORS.page : COLORS.muted, ".14em"),
                  display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                  background: on ? color : COLORS.page,
                  border: `1px solid ${on ? color : COLORS.border}`,
                  borderRadius: 999, minHeight: 34, padding: "0 13px", cursor: "pointer",
                  transition: `all 180ms ${EASE}`,
                }}
              >
                {c}
                <span style={mono(10, on ? rgba(COLORS.page, .8) : COLORS.faintest)}>{c === "All" ? (index?.length ?? SOURCE_RECIPE_COUNT) : counts.get(c)}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "10px 0 4px" }}>
          <span style={{ ...label(10, COLORS.muted, ".2em"), whiteSpace: "nowrap" }}>
            {index === null ? "Fetching the shelf" : `${rows.length} ${rows.length === 1 ? "recipe" : "recipes"}`}
          </span>
          <span style={{ height: 1, background: COLORS.border, flex: 1 }} />
          <span style={mono(10, COLORS.faint)}>tap a line to read it</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile || !openId ? "1fr" : "minmax(0,1fr) minmax(360px, 440px)", gap: isMobile ? 0 : 34, alignItems: "start" }}>
          <div>
            {index === null ? (
              /* The index is a fetch now, so "no matches" would be a lie until it
                 lands. Say which of the two is happening. */
              <div style={{ padding: "38px", textAlign: "center", marginTop: 14, fontFamily: FONTS.body, fontStyle: "italic", color: COLORS.muted }}>
                Pulling the contents page…
              </div>
            ) : rows.length === 0 ? (
              <div style={{ padding: "38px", border: `1px dashed ${COLORS.borderStrong}`, background: COLORS.page, textAlign: "center", marginTop: 14 }}>
                <div style={{ ...display(25) }}>Nothing on that shelf.</div>
                <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 15, color: COLORS.muted, marginTop: 8 }}>
                  Try a different word, or clear the cuisine filter.
                </div>
              </div>
            ) : rows.map((r, i) => (
              <LeaderRow key={r.id} recipe={r} n={i} selected={r.id === openId} inBasket={basket?.has(r.id)} onOpen={open} isMobile={isMobile} />
            ))}
          </div>

          {/* Desktop: the recipe opens in a rail beside the contents.
              Mobile: it takes the screen, because a rail at 375px is a joke. */}
          {openId && detail && !isMobile && (
            <aside style={{ background: COLORS.page, border: hairline, borderRadius: 3, position: "sticky", top: 0, maxHeight: "calc(100vh - 150px)", overflowY: "auto" }}>
              <Detail state={detail} onClose={() => setOpenId(null)} isMobile={false} inBasket={basket?.has(openId)} onToggleBasket={basket?.toggle} />
            </aside>
          )}
        </div>
      </div>

      {openId && detail && isMobile && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 40, background: COLORS.page, overflowY: "auto" }}>
          <Detail state={detail} onClose={() => setOpenId(null)} isMobile inBasket={basket?.has(openId)} onToggleBasket={basket?.toggle} />
        </div>
      )}
    </div>
  );
}
