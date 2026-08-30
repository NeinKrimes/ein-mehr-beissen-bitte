import { describe, it, expect } from "vitest";
import {
  SOURCE_INDEX,
  SOURCE_CUISINES,
  sourceRecipeById,
  findSourceRecipe,
  loadSourceRecipe,
  loadSourceRecipes,
} from "./sourceRecipes.js";
import { chains } from "./chains.js";

// The corpus is a lazy chunk in the app; here we just await it once up front.
const SOURCE_RECIPES = await loadSourceRecipes();

describe("source recipe index", () => {
  it("is non-empty and every id is unique", () => {
    expect(SOURCE_INDEX.length).toBeGreaterThan(0);
    const ids = SOURCE_INDEX.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries no ingredients or steps — that is what keeps it out of the bundle", () => {
    for (const r of SOURCE_INDEX) {
      expect(r, r.id).not.toHaveProperty("ingredients");
      expect(r, r.id).not.toHaveProperty("steps");
    }
  });

  it("covers the corpus exactly, one index entry per record", () => {
    expect(SOURCE_INDEX.map((r) => r.id).sort()).toEqual(SOURCE_RECIPES.map((r) => r.id).sort());
  });

  it("exposes its cuisines, sorted and deduplicated", () => {
    expect(SOURCE_CUISINES).toEqual([...new Set(SOURCE_CUISINES)].sort());
    expect(SOURCE_CUISINES).toContain("Italian");
  });

  it("sourceRecipeById round-trips, and misses return null", () => {
    const first = SOURCE_INDEX[0];
    expect(sourceRecipeById(first.id)).toBe(first);
    expect(sourceRecipeById("no-such-recipe")).toBeNull();
  });
});

describe("source recipe corpus", () => {
  it("every recipe has a title, a cuisine, ingredients and steps", () => {
    for (const r of SOURCE_RECIPES) {
      expect(r.title, r.id).toBeTruthy();
      expect(r.cuisine, r.id).toBeTruthy();
      expect(r.ingredients.length, r.id).toBeGreaterThanOrEqual(3);
      expect(r.steps.length, r.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("steps are numbered from 1 with no gaps, and each has a title and text", () => {
    for (const r of SOURCE_RECIPES) {
      r.steps.forEach((s, i) => {
        expect(s.n, `${r.id} step ${i}`).toBe(i + 1);
        expect(s.title, `${r.id} step ${i}`).toBeTruthy();
        expect(s.text.length, `${r.id} step ${i}`).toBeGreaterThan(20);
      });
    }
  });

  it("ingredients carry an item, and amounts never contain a stray slash-space", () => {
    for (const r of SOURCE_RECIPES) {
      for (const ing of r.ingredients) {
        expect(ing.item, r.id).toBeTruthy();
        expect(ing.amount ?? "", `${r.id}: ${ing.item}`).not.toMatch(/\s\/|\/\s/);
      }
    }
  });

  it("nutrition and derived cost are internally consistent", () => {
    for (const r of SOURCE_RECIPES) {
      expect(r.est_cost_usd, r.id).toBeGreaterThan(0);
      if (r.calories) {
        expect(r.calories, r.id).toBeGreaterThan(0);
        expect(r.cal_per_dollar, r.id).toBe(Math.round(r.calories / r.est_cost_usd));
      }
    }
  });

  it("every recipe is attributed to its source issue", () => {
    for (const r of SOURCE_RECIPES) {
      expect(r.attribution, r.id).toMatch(/Cuisine at Home/i);
    }
  });

  it("carries no leftover extractor fields — the source prose must not ship", () => {
    for (const r of SOURCE_RECIPES) {
      expect(r).not.toHaveProperty("sourceSteps");
      expect(r).not.toHaveProperty("page");
      for (const s of r.steps) {
        expect(s).not.toHaveProperty("sourceText");
        expect(s).not.toHaveProperty("lead");
      }
    }
  });

  it("loadSourceRecipe resolves a full record, and misses resolve null", async () => {
    const full = await loadSourceRecipe(SOURCE_INDEX[0].id);
    expect(full.id).toBe(SOURCE_INDEX[0].id);
    expect(full.steps.length).toBeGreaterThan(0);
    expect(await loadSourceRecipe("no-such-recipe")).toBeNull();
    expect(await loadSourceRecipe(null)).toBeNull();
  });
});

describe("findSourceRecipe", () => {
  it("matches an exact title regardless of case and punctuation", () => {
    const r = SOURCE_INDEX[0];
    expect(findSourceRecipe(r.title)).toBe(r);
    expect(findSourceRecipe(r.title.toUpperCase())).toBe(r);
  });

  it("matches on a strong partial overlap", () => {
    expect(findSourceRecipe("Coq au Vin Stew")?.id).toBe("coq-au-vin-stew");
  });

  it("will not match a short query against a much longer title", () => {
    // Overlap is scored in both directions. Scoring only the query's words
    // against the title let "Peanut Butter Sandwich" hit "Peanut Butter-Oatmeal
    // Energy Bars" at 0.67 once the corpus grew large enough to contain it —
    // tier 3 of useRecipe would then have served energy bars for that night.
    expect(findSourceRecipe("Peanut Butter Sandwich")).toBeNull();
    expect(findSourceRecipe("Garlic Bread")?.id).not.toBe("pepperoncini-garlic-bread");
  });

  it("returns null for a weak match rather than guessing", () => {
    expect(findSourceRecipe("Peanut Butter Sandwich")).toBeNull();
    expect(findSourceRecipe("")).toBeNull();
    expect(findSourceRecipe(null)).toBeNull();
  });

  it("does not collide with unrelated calendar meals", () => {
    // The library is a fallback, so a false positive would serve the wrong
    // recipe for a calendar night. Spot-check a name with no library entry.
    expect(findSourceRecipe("Fresh Homemade Bagels")).toBeNull();
  });

  it("any calendar meal it does match is matched to a plausible recipe", () => {
    const days = chains.flatMap((c) => c.days);
    for (const d of days) {
      const hit = findSourceRecipe(d.meal);
      if (!hit) continue;
      const words = d.meal.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
      const hay = `${hit.title} ${hit.subtitle}`.toLowerCase();
      const overlap = words.filter((w) => hay.includes(w)).length;
      expect(overlap, `${d.meal} -> ${hit.title}`).toBeGreaterThan(0);
    }
  });
});
