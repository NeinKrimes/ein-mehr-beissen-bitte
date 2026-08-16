import { useState, useMemo } from "react";
import { chains } from "../data/chains";
import { MEALS } from "../data/mealStats";
import { COLORS, FONTS, EASE, label, mono, display, parch, hairline, rgba } from "../theme";

// Chains — "the chapter spread". Anchor on the left page, the chain on the
// right. One chapter per anchor ingredient; rows stagger in on chapter turn.

const CHAPTER_WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

// Split an anchor title at its separator so the second half can be italic.
function splitAnchor(anchor) {
  const parts = anchor.split(/\s[—+–-]\s|\s\+\s/);
  if (parts.length > 1) return [parts[0], parts.slice(1).join(" · ")];
  const words = anchor.split(" ");
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

export default function ChainsRoom({ onOpenRecipe }) {
  const [chapter, setChapter] = useState(0);

  // Memoize heavy derived state calculations to prevent redundant re-computation on every render
  const { chain, meals, anchorMeal, totalCost, avgCpd, passiveShort, anchorA, anchorB, followups } = useMemo(() => {
    const chain = chains[chapter];
    const meals = MEALS.filter((m) => m.chainId === chain.id);
    const anchorMeal = meals.find((m) => m.type === "ANCHOR") ?? meals[0];

    const totalCost = meals.reduce((s, m) => s + m.cost, 0);
    const avgCpd = Math.round(meals.reduce((s, m) => s + m.cpd, 0) / meals.length);
    const passiveShort = chain.passive.replace(/\s*\(.*\)$/, "");
    const [anchorA, anchorB] = splitAnchor(chain.anchor);
    const followups = meals.filter((m) => m.type !== "ANCHOR").map((m) => m.short);

    return { chain, meals, anchorMeal, totalCost, avgCpd, passiveShort, anchorA, anchorB, followups };
  }, [chapter]);

  return (
    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

      {/* Left page — the anchor */}
      <div style={{ width: "44%", minWidth: 420, flex: "0 0 auto", background: COLORS.page, borderRight: hairline, position: "relative", overflow: "hidden", padding: "46px 48px", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", right: -90, top: -70, width: 300, height: 300, borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(circle at 36% 34%, rgba(232,160,32,0.30), rgba(232,160,32,0.05) 62%, transparent 74%)" }} />

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div style={label(10, COLORS.gold, ".3em")}>Chapter {CHAPTER_WORDS[chapter]} · the anchor</div>
          <div style={{ display: "flex", gap: 14 }}>
            <span onClick={() => setChapter((chapter + chains.length - 1) % chains.length)}
              style={{ ...mono(13, parch(0.42)), cursor: "pointer" }}>←</span>
            <span style={mono(11, parch(0.30))}>{chapter + 1} / {chains.length}</span>
            <span onClick={() => setChapter((chapter + 1) % chains.length)}
              style={{ ...mono(13, parch(0.42)), cursor: "pointer" }}>→</span>
          </div>
        </div>

        <div key={chain.id} style={{ ...display(56, 0.94), color: COLORS.parchment, marginTop: 18, animation: `embRise 520ms ${EASE} both` }}>
          {anchorA}<br /><span style={{ fontStyle: "italic" }}>{anchorB}</span>
        </div>

        <div style={{ fontFamily: FONTS.body, fontSize: 16, lineHeight: 1.7, color: COLORS.muted, maxWidth: "44ch", marginTop: 18, textWrap: "pretty" }}>
          {passiveShort}, mostly untouched. You cook it once, then it becomes {followups.length > 1
            ? `${followups.slice(0, -1).join(", ")}, then ${followups[followups.length - 1]}`
            : followups[0]}. Nothing is thrown out — the pot earns its keep all week.
        </div>

        <div style={{ position: "relative", margin: "30px 0 0", display: "flex", justifyContent: "center" }}>
          <div onClick={() => onOpenRecipe(anchorMeal.day)} style={{
            width: 230, height: 230, borderRadius: "50%", cursor: "pointer",
            background: `linear-gradient(0deg,${rgba(anchorMeal.color, 0.18)},${rgba(anchorMeal.color, 0.18)}), ${COLORS.plate}`,
            border: "1px solid rgba(232,160,32,0.42)",
            boxShadow: "0 0 0 9px rgba(232,160,32,0.08), 0 0 60px rgba(232,160,32,0.14)",
          }} />
        </div>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", borderTop: hairline, paddingTop: 20 }}>
          {[
            ["Cook once", passiveShort.replace(/^~/, "").split(" + ")[0], COLORS.parchment],
            ["Feeds", `${meals.length} dinners`, COLORS.parchment],
            ["Total", `$${totalCost.toFixed(2)}`, COLORS.green],
            ["Average", `${avgCpd} cal/$`, COLORS.green],
          ].map(([k, v, c], i) => (
            <div key={k} style={{ flex: 1, paddingLeft: i ? 22 : 0, borderLeft: i ? hairline : "none" }}>
              <div style={label(10, parch(0.36), ".16em")}>{k}</div>
              <div style={{ ...mono(15, c), marginTop: 6 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right page — what it becomes */}
      <div style={{ flex: 1, minWidth: 0, padding: "46px 48px", display: "flex", flexDirection: "column", background: COLORS.pageAlt, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid ${parch(0.14)}`, paddingBottom: 14 }}>
          <div style={{ ...display(34), color: COLORS.parchment }}>What it becomes</div>
          <div style={label(10, parch(0.36))}>
            Days {meals[0].day} – {meals[meals.length - 1].day} · {new Set(meals.map((m) => m.cuisine)).size} cuisines
          </div>
        </div>

        <div key={chain.id} style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
          {meals.map((m, i) => (
            <div key={m.day} onClick={() => onOpenRecipe(m.day)} style={{
              display: "flex", gap: 24, alignItems: "center", padding: "22px 0",
              borderBottom: `1px solid ${parch(0.07)}`, cursor: "pointer",
              animation: `embRise 520ms ${EASE} ${200 + i * 160}ms both`,
            }}>
              <div style={{
                width: 84, height: 84, flex: "0 0 84px", borderRadius: "50%",
                background: `linear-gradient(0deg,${rgba(m.color, 0.42)},${rgba(m.color, 0.42)}), ${COLORS.plate}`,
                border: `1px solid ${rgba(m.color, 0.28)}`,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ width: 16, height: 1, background: m.color }} />
                  <span style={label(10, m.color)}>
                    {m.cuisine} · day {m.day}{m.type === "ANCHOR" ? " · anchor" : ""}
                  </span>
                </div>
                <div style={{ ...display(28, 1.1), color: COLORS.parchment }}>{m.meal}</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.faint, marginTop: 5 }}>{m.blurb}</div>
              </div>
              <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                <div style={{ ...mono(26, COLORS.green), lineHeight: 1 }}>{m.cpd}</div>
                <div style={{ ...mono(10, parch(0.34)), letterSpacing: ".1em", marginTop: 4 }}>cal/$</div>
                <div style={{ ...mono(12, COLORS.muted), marginTop: 8 }}>{m.kcal} kcal · ${m.cost.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, paddingTop: 20 }}>
          <div style={{ fontFamily: FONTS.body, fontStyle: "italic", fontSize: 15, color: COLORS.faintest }}>
            {meals.length} dinners, {new Set(meals.map((m) => m.cuisine)).size} countries, one anchor — and the pot pays for itself.
          </div>
          <button onClick={() => onOpenRecipe(anchorMeal.day)} style={{
            ...label(11, COLORS.ground, ".16em"),
            background: COLORS.gold, border: "none", borderRadius: 999,
            padding: "14px 24px", cursor: "pointer", whiteSpace: "nowrap",
            boxShadow: "0 0 24px rgba(232,160,32,0.35)",
          }}>Start the chain</button>
        </div>
      </div>
    </div>
  );
}
