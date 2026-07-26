import { useState, useMemo } from "react";
import { T, cuisineColor, parseMinutes } from "../theme";
import { chains, mealId } from "../data/chains";
import { Eyebrow } from "./Gloam";

// Board — plates from other kitchens. Round photographs, plate captions, no icons.
// Read-first: pins are seeded from the 30 meals with placeholder covers + attributed
// cooks, until accounts + photo uploads land. Save is per-browser.
const AUTHORS = ["Nok Rattana", "Rosalía Mendez", "Marguerite Blanc", "Wei Tang", "Dwayne Kerr", "Pia Nardelli", "Arun Dey", "Bex Kahn", "Yuki Sato", "Amara Okafor", "Tomás Ferreira", "Ingrid Sø"];
const LS_SAVED = "embb_saved";
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const kfmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));
const readSaved = () => { try { return new Set(JSON.parse(localStorage.getItem(LS_SAVED) || "[]")); } catch { return new Set(); } };

const PINS = chains.flatMap((c) =>
  c.days.map((d) => {
    const id = mealId(c.id, d.day);
    const h = hash(id);
    return { id, day: d.day, cuisine: d.cuisine, meal: d.meal, type: d.type, author: AUTHORS[h % AUTHORS.length], saves: 900 + (h % 4600) };
  }),
);

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "dollar", label: "Under a dollar", test: (r) => Number(r?.est_cost_usd) < 1 },
  { key: "passive", label: "Passive cook", test: (r) => (parseMinutes(r?.cookTime) || 0) >= 60 },
  { key: "protein", label: "High protein", test: (r) => Number(r?.protein_g) >= 30 },
];

export default function BoardView({ getRecipe, onSelectDay }) {
  const [saved, setSaved] = useState(readSaved);
  const [filter, setFilter] = useState("all");
  const f = FILTERS.find((x) => x.key === filter);

  const pins = useMemo(() => PINS.filter((p) => {
    if (filter === "all") return true;
    const rec = getRecipe(p.id);
    const r = rec && !rec.loading && !rec.error ? rec : null;
    return r && f.test(r);
  }), [filter, getRecipe, f]);

  function toggleSave(id, e) {
    e.stopPropagation();
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem(LS_SAVED, JSON.stringify([...next])); } catch { /* quota */ }
      return next;
    });
  }

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 24px 96px" }}>
      <Eyebrow numeral="◆" style={{ marginBottom: 18 }}>Tonight · nine kitchens</Eyebrow>
      <h1 className="serif" style={{ margin: 0, fontSize: "clamp(40px,6.4vw,72px)", lineHeight: .96, color: T.ink, maxWidth: "15ch" }}>
        Someone is already <span style={{ fontStyle: "italic", color: T.gold }}>cooking this.</span>
      </h1>
      <p style={{ fontFamily: T.body, fontSize: 17, lineHeight: 1.7, color: T.ink2, maxWidth: "50ch", marginTop: 16 }}>
        Save the plates you want to make. Covers are placeholders for now — real cook photographs land once accounts and uploads are wired.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "24px 0 32px" }}>
        {FILTERS.map((x) => {
          const on = filter === x.key;
          return (
            <button key={x.key} onClick={() => setFilter(x.key)} style={{
              cursor: "pointer", borderRadius: T.rPill, padding: "7px 15px",
              fontFamily: T.sans, fontWeight: on ? 700 : 500, fontSize: 12, letterSpacing: ".02em",
              color: on ? T.bg : T.ink2, background: on ? T.gold : "transparent", border: `1px solid ${on ? T.gold : T.line}`,
            }}>{x.label}</button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "40px 28px" }}>
        {pins.map((p) => {
          const color = cuisineColor(p.cuisine);
          const rec = getRecipe(p.id);
          const r = rec && !rec.loading && !rec.error ? rec : null;
          const isSaved = saved.has(p.id);
          return (
            <div key={p.id} className="pin lift" onClick={() => onSelectDay(p.day)} role="button" tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelectDay(p.day)} style={{ cursor: "pointer" }}>
              {/* round photograph */}
              <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: "50%", overflow: "hidden",
                border: `1px solid ${T.line}`,
                background: `linear-gradient(rgba(36,26,46,0.30), rgba(8,8,10,0.66)), linear-gradient(0deg, ${color}14, ${color}14), radial-gradient(ellipse at 38% 22%, #2c2331, #14121a 72%)` }}>
                <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontFamily: T.sans, fontWeight: 700, fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(236,227,210,0.42)" }}>Photograph</span>
                <button onClick={(e) => toggleSave(p.id, e)} className={`save${isSaved ? "" : ""}`} aria-label={isSaved ? "Saved" : "Save"} style={{
                  position: "absolute", bottom: 14, right: 14, cursor: "pointer", borderRadius: T.rPill, border: "none",
                  padding: "6px 14px", fontFamily: T.sans, fontWeight: 700, fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase",
                  color: isSaved ? T.bg : T.ink, background: isSaved ? T.gold : "rgba(12,12,15,0.72)", backdropFilter: "blur(6px)",
                  opacity: isSaved ? 1 : undefined,
                }}>{isSaved ? "Saved" : "Save"}</button>
              </div>
              {/* plate caption */}
              <div style={{ padding: "16px 4px 0", textAlign: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
                  <span style={{ fontFamily: T.sans, fontWeight: 700, fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: T.ink2 }}>{p.cuisine}{p.type === "ANCHOR" ? " · anchor" : ""}</span>
                </div>
                <div className="serif" style={{ fontSize: 21, lineHeight: 1.15, color: T.ink, maxWidth: "22ch", margin: "0 auto" }}>{p.meal}</div>
                {r && Number.isFinite(Number(r.calories)) && (
                  <div className="mono" style={{ fontSize: 11.5, color: T.ink3, marginTop: 9 }}>
                    {r.calories} kcal · <span style={{ color: T.frugal }}>{Math.round(r.cal_per_dollar)} cal/$</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 11 }}>
                  <span style={{ fontFamily: T.body, fontStyle: "italic", fontSize: 14, color: T.ink2 }}>{p.author}</span>
                  <span className="mono" style={{ fontSize: 11, color: T.ink3 }}>· {kfmt(p.saves + (isSaved ? 1 : 0))}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
