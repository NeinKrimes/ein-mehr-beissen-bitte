// Weekly shopping list: aggregates ingredients across each 7-day span, combining
// like items and summing amounts where units match, with an estimated total cost.
// Reads from the preloaded recipe cache (getRecipe) — no network, no AI calls.

import { useState, useMemo } from "react";
import { sendToRetailer } from "../lib/shoppingCart";
import { COLORS, FONTS, hairline } from "../theme";
import { useIsMobile } from "../hooks/useViewport";

function fmtAmount(n) {
  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

// item -> (unit -> summed amount | null when non-numeric) across a set of recipes.
export function aggregate(recipes) {
  const items = new Map();
  for (const r of recipes) {
    for (const ing of r.ingredients ?? []) {
      const item = (ing.item ?? "").trim();
      if (!item) continue;
      const unit = (ing.unit ?? "").trim();
      const amt = parseFloat(ing.amount);
      if (!items.has(item)) items.set(item, new Map());
      const units = items.get(item);
      const prev = units.get(unit);
      if (Number.isFinite(amt)) {
        units.set(unit, (Number.isFinite(prev) ? prev : 0) + amt);
      } else if (prev === undefined) {
        units.set(unit, null);
      }
    }
  }
  return items;
}

export function weekTotalCost(recipes) {
  return recipes.reduce((sum, r) => {
    const perServing = Number(r.est_cost_usd);
    const servings = parseInt(String(r.servings ?? ""), 10) || 4;
    return Number.isFinite(perServing) ? sum + perServing * servings : sum;
  }, 0);
}

// Map the aggregate() Map<item, Map<unit, amount>> shape into the flat
// line-item array a retailer cart API wants.
function flattenForCart(items) {
  const lines = [];
  for (const [name, units] of items) {
    for (const [unit, amt] of units) {
      lines.push({ name, quantity: amt ?? null, unit: unit || null });
    }
  }
  return lines;
}

const RETAILERS = [
  { id: "instacart", label: "Instacart" },
  { id: "walmart", label: "Walmart" },
];

function RetailerButton({ retailer, items }) {
  const [state, setState] = useState("idle"); // idle | loading | error
  const [message, setMessage] = useState("");

  async function handleClick() {
    setState("loading");
    try {
      const url = await sendToRetailer(retailer.id, flattenForCart(items));
      window.open(url, "_blank", "noopener,noreferrer");
      setState("idle");
    } catch (e) {
      setState("error");
      setMessage(e?.message?.includes("not configured") ? `${retailer.label} isn't connected yet` : "Couldn't reach " + retailer.label);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        style={{
          background: "none", border: `1px solid ${COLORS.gold}`, color: COLORS.gold,
          cursor: state === "loading" ? "default" : "pointer", padding: "4px 10px",
          borderRadius: "999px", fontSize: "11px", letterSpacing: "0.5px",
          opacity: state === "loading" ? 0.6 : 1,
        }}
      >
        {state === "loading" ? "Sending…" : `Shop on ${retailer.label}`}
      </button>
      {state === "error" && (
        <span style={{ fontSize: "10px", color: COLORS.danger, fontStyle: "italic" }}>{message}</span>
      )}
    </div>
  );
}

export default function ShoppingList({ flatDays, getRecipe, onClose }) {
  const isMobile = useIsMobile();

  // ⚡ Bolt: Memoized the grouping of days into 7-day spans.
  // Impact: Prevents O(N) redundant iteration and Map allocations on every re-render.
  // Avoids recreating the structure during component updates when 'flatDays' remains constant.
  const weeks = useMemo(() => {
    const wks = new Map();
    for (const d of flatDays) {
      const w = Math.ceil(d.day / 7);
      if (!wks.has(w)) wks.set(w, []);
      wks.get(w).push(d);
    }
    return wks;
  }, [flatDays]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", justifyContent: "center", alignItems: isMobile ? "stretch" : "flex-start",
        padding: isMobile ? 0 : "24px 12px", overflowY: "auto", zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.page, border: isMobile ? "none" : hairline, borderRadius: isMobile ? 0 : "10px",
          width: "100%", maxWidth: isMobile ? "100%" : "620px", minHeight: isMobile ? "100%" : undefined,
          padding: isMobile ? "16px 16px 40px" : "20px", fontFamily: FONTS.body,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "4px", color: COLORS.muted, textTransform: "uppercase" }}>Frugal Prep</div>
            <h2 style={{ fontFamily: FONTS.display, fontSize: "18px", fontWeight: "normal", margin: "4px 0 0", color: COLORS.parchment }}>Weekly Shopping List</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: hairline, color: COLORS.muted, cursor: "pointer", padding: "10px 14px", minHeight: 40, minWidth: 40, borderRadius: "4px", fontSize: "16px" }}
          >✕</button>
        </div>

        {[...weeks.keys()].sort((a, b) => a - b).map((w) => {
          const days = weeks.get(w);
          const recipes = days
            .map((d) => getRecipe(d.mealId))
            .filter((r) => r && !r.loading && !r.error);
          const items = aggregate(recipes);
          const total = weekTotalCost(recipes);
          const dayRange = `${days[0].day}–${days[days.length - 1].day}`;

          return (
            <div key={w} style={{ marginBottom: "22px" }}>
              <div style={{
                display: "flex", flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "baseline",
                gap: isMobile ? 8 : 0,
                borderBottom: hairline, paddingBottom: "6px", marginBottom: "10px",
              }}>
                <div style={{ fontSize: "13px", color: COLORS.gold, letterSpacing: "1px" }}>
                  Week {w} · Days {dayRange}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "12px", color: COLORS.muted }}>
                    {recipes.length > 0
                      ? <>est. <span style={{ color: COLORS.green }}>${total.toFixed(2)}</span></>
                      : <span style={{ color: COLORS.muted }}>not seeded yet</span>}
                  </div>
                  {items.size > 0 && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {RETAILERS.map((r) => (
                        <RetailerButton key={r.id} retailer={r} items={items} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {items.size === 0 ? (
                <div style={{ fontSize: "12px", color: COLORS.muted, fontStyle: "italic" }}>
                  Recipes for this week aren’t in the library yet — run the seed.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "4px 16px" }}>
                  {[...items.keys()].sort().map((item) => {
                    const units = items.get(item);
                    const qty = [...units.entries()]
                      .map(([unit, amt]) =>
                        amt === null ? unit : `${fmtAmount(amt)} ${unit}`.trim())
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div key={item} style={{ display: "flex", gap: "6px", padding: "3px 0", fontSize: "12px", borderBottom: hairline }}>
                        <span style={{ color: COLORS.gold, minWidth: "64px", textAlign: "right", flexShrink: 0 }}>{qty}</span>
                        <span style={{ color: COLORS.listInk }}>{item}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
