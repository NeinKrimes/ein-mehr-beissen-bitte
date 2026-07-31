// Weekly shopping list: aggregates ingredients across each 7-day span, combining
// like items and summing amounts where units match, with an estimated total cost.
// Reads from the preloaded recipe cache (getRecipe) — no network, no AI calls.

import { useState } from "react";
import { sendToRetailer } from "../lib/shoppingCart";

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

const GOLD = "#e8a020";

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
          background: "none", border: `1px solid ${GOLD}`, color: GOLD,
          cursor: state === "loading" ? "default" : "pointer", padding: "4px 10px",
          borderRadius: "999px", fontSize: "11px", letterSpacing: "0.5px",
          opacity: state === "loading" ? 0.6 : 1,
        }}
      >
        {state === "loading" ? "Sending…" : `Shop on ${retailer.label}`}
      </button>
      {state === "error" && (
        <span style={{ fontSize: "10px", color: "#e84040", fontStyle: "italic" }}>{message}</span>
      )}
    </div>
  );
}

export default function ShoppingList({ flatDays, getRecipe, onClose }) {
  // Group days into 7-day spans (week 1 = days 1–7, …).
  const weeks = new Map();
  for (const d of flatDays) {
    const w = Math.ceil(d.day / 7);
    if (!weeks.has(w)) weeks.set(w, []);
    weeks.get(w).push(d);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", justifyContent: "center", alignItems: "flex-start",
        padding: "24px 12px", overflowY: "auto", zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#131318", border: "1px solid #2a2a3a", borderRadius: "10px",
          width: "100%", maxWidth: "620px", padding: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#555", textTransform: "uppercase" }}>Frugal Prep</div>
            <h2 style={{ fontSize: "18px", fontWeight: "normal", margin: "4px 0 0", color: "#f0e8d8" }}>🛒 Weekly Shopping List</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "1px solid #2a2a3a", color: "#555", cursor: "pointer", padding: "4px 10px", borderRadius: "4px", fontSize: "16px" }}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `1px solid #2a2a3a`, paddingBottom: "6px", marginBottom: "10px" }}>
                <div style={{ fontSize: "13px", color: GOLD, letterSpacing: "1px" }}>
                  Week {w} · Days {dayRange}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#888" }}>
                    {recipes.length > 0
                      ? <>est. <span style={{ color: "#22c55e" }}>${total.toFixed(2)}</span></>
                      : <span style={{ color: "#555" }}>not seeded yet</span>}
                  </div>
                  {items.size > 0 && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      {RETAILERS.map((r) => (
                        <RetailerButton key={r.id} retailer={r} items={items} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {items.size === 0 ? (
                <div style={{ fontSize: "12px", color: "#555", fontStyle: "italic" }}>
                  Recipes for this week aren’t in the library yet — run the seed.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                  {[...items.keys()].sort().map((item) => {
                    const units = items.get(item);
                    const qty = [...units.entries()]
                      .map(([unit, amt]) =>
                        amt === null ? unit : `${fmtAmount(amt)} ${unit}`.trim())
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div key={item} style={{ display: "flex", gap: "6px", padding: "3px 0", fontSize: "12px", borderBottom: "1px solid #1a1a26" }}>
                        <span style={{ color: GOLD, minWidth: "64px", textAlign: "right", flexShrink: 0 }}>{qty}</span>
                        <span style={{ color: "#c0b8a8" }}>{item}</span>
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
