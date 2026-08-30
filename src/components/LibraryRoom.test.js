import { describe, it, expect } from "vitest";
import { filterAndSort, SORTS } from "./LibraryRoom.jsx";
import SOURCE_INDEX from "../data/sourceRecipes.index.js";
import { SOURCE_CUISINES } from "../data/sourceSummary.js";
import { CUISINE_COLORS, cuisineColor, COLORS } from "../theme.js";

const rows = [
  { id: "a", title: "Beef Daube", subtitle: "with olives", cuisine: "French", calories: 500, est_cost_usd: 3.0, cal_per_dollar: 167 },
  { id: "b", title: "Coq au Vin", subtitle: "", cuisine: "French", calories: 400, est_cost_usd: 2.0, cal_per_dollar: 200 },
  { id: "c", title: "Aloo Gobi", subtitle: "spiced potatoes", cuisine: "Indian", calories: null, est_cost_usd: 1.0, cal_per_dollar: null },
];

describe("library filtering", () => {
  it("returns everything when nothing is asked for", () => {
    expect(filterAndSort(rows, {})).toHaveLength(3);
    expect(filterAndSort(rows)).toHaveLength(3);
  });

  it("narrows by cuisine", () => {
    expect(filterAndSort(rows, { cuisine: "French" }).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("searches title, subtitle and cuisine alike", () => {
    expect(filterAndSort(rows, { query: "daube" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterAndSort(rows, { query: "olives" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterAndSort(rows, { query: "indian" }).map((r) => r.id)).toEqual(["c"]);
  });

  it("requires every term, so more words narrow the list", () => {
    expect(filterAndSort(rows, { query: "coq" })).toHaveLength(1);
    expect(filterAndSort(rows, { query: "coq daube" })).toHaveLength(0);
  });

  it("ignores case and punctuation in the query", () => {
    expect(filterAndSort(rows, { query: "COQ AU-VIN!" }).map((r) => r.id)).toEqual(["b"]);
  });

  it("combines a search with a cuisine filter", () => {
    expect(filterAndSort(rows, { query: "potatoes", cuisine: "French" })).toHaveLength(0);
    expect(filterAndSort(rows, { query: "potatoes", cuisine: "Indian" })).toHaveLength(1);
  });

  it("does not mutate the array it was given", () => {
    const before = rows.map((r) => r.id);
    filterAndSort(rows, { sortId: "cost" });
    expect(rows.map((r) => r.id)).toEqual(before);
  });
});

describe("library sorting", () => {
  it("sorts A–Z by default", () => {
    expect(filterAndSort(rows).map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts cheapest and lightest ascending", () => {
    expect(filterAndSort(rows, { sortId: "cost" }).map((r) => r.id)).toEqual(["c", "b", "a"]);
    expect(filterAndSort(rows, { sortId: "light" })[0].id).toBe("b");
  });

  it("sorts calories-per-dollar descending", () => {
    expect(filterAndSort(rows, { sortId: "value" })[0].id).toBe("b");
  });

  it("sinks recipes with no printed nutrition rather than floating them", () => {
    // A missing calorie count must never read as the best value on the shelf.
    expect(filterAndSort(rows, { sortId: "value" }).at(-1).id).toBe("c");
    expect(filterAndSort(rows, { sortId: "light" }).at(-1).id).toBe("c");
  });

  it("falls back to A–Z for an unknown sort id", () => {
    expect(filterAndSort(rows, { sortId: "nonsense" }).map((r) => r.id)).toEqual(["c", "a", "b"]);
  });
});

describe("library room against the real index", () => {
  it("every sort runs over the whole index without losing a row", () => {
    for (const s of SORTS) {
      expect(filterAndSort(SOURCE_INDEX, { sortId: s.id }), s.id).toHaveLength(SOURCE_INDEX.length);
    }
  });

  it("every cuisine chip selects a non-empty shelf", () => {
    for (const c of SOURCE_CUISINES) {
      expect(filterAndSort(SOURCE_INDEX, { cuisine: c }).length, c).toBeGreaterThan(0);
    }
  });

  it("every cuisine in the library has its own swatch — no blank dots", () => {
    for (const c of SOURCE_CUISINES) {
      expect(CUISINE_COLORS[c], `missing CUISINE_COLORS entry for ${c}`).toBeTruthy();
    }
  });

  it("cuisineColor falls back to the accent instead of returning undefined", () => {
    expect(cuisineColor("Martian")).toBe(COLORS.gold);
    expect(cuisineColor(undefined)).toBe(COLORS.gold);
  });
});
