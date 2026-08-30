import { describe, it, expect } from "vitest";
import { cleanItem, staplesIn, analyseStaples, STAPLES } from "./staples.mjs";
import { SOURCE_STAPLES, STAPLE_COVERAGE, SOURCE_RECIPE_COUNT } from "../src/data/sourceSummary.js";

describe("cleanItem", () => {
  it("strips prep words so one shopping item is one entry", () => {
    // These are three ways of writing the same line on a shopping list.
    expect(cleanItem("minced fresh garlic")).toBe("garlic");
    expect(cleanItem("garlic, minced")).toBe("garlic");
    expect(cleanItem("2 cloves garlic")).toBe("cloves garlic");
  });

  it("drops parentheticals and trailing prep clauses", () => {
    expect(cleanItem("whole-milk ricotta cheese (15 oz.)")).toBe("ricotta cheese");
    expect(cleanItem("thick-sliced bacon, diced")).toBe("bacon");
    expect(cleanItem("lasagna sheets (such as Barilla)")).toBe("lasagna sheets");
  });

  it("drops a hyphenated grade whole, so it cannot leave a false staple behind", () => {
    // "whole-milk ricotta" once cleaned to "milk ricotta" and booked a milk purchase.
    expect(staplesIn(cleanItem("whole-milk ricotta cheese (15 oz.)"))).not.toContain("Milk");
    expect(staplesIn(cleanItem("low-fat sour cream"))).toEqual(["Sour cream"]);
    // But the spaced form really is milk.
    expect(staplesIn(cleanItem("1 cup whole milk"))).toContain("Milk");
  });

  it("keeps accented letters — jalapeño must not become jalape o", () => {
    expect(cleanItem("jalapeño, seeded")).toBe("jalapeño");
    expect(cleanItem("jalapeños")).toBe("jalapeños");
  });

  it("survives empty and missing input", () => {
    expect(cleanItem("")).toBe("");
    expect(cleanItem(null)).toBe("");
    expect(cleanItem(undefined)).toBe("");
  });
});

describe("staplesIn", () => {
  it("finds every staple a line names, not just the first", () => {
    // The bug this guards: matching first-wins put "salt and black pepper"
    // down as salt only, and undercounted pepper across the whole library.
    expect(staplesIn(cleanItem("Salt and black pepper to taste")).sort())
      .toEqual(["Black pepper", "Salt"]);
  });

  it("ignores things that come from the tap", () => {
    expect(staplesIn(cleanItem("water"))).toEqual([]);
    expect(staplesIn(cleanItem("nonstick spray"))).toEqual([]);
  });

  it("does not confuse a staple with its lookalikes", () => {
    expect(staplesIn("garlic powder")).not.toContain("Garlic");
    expect(staplesIn("onion powder")).not.toContain("Onion");
    expect(staplesIn("buttermilk")).not.toContain("Butter");
    expect(staplesIn("white wine vinegar")).not.toContain("Dry white wine");
    expect(staplesIn("rice vinegar")).not.toContain("Rice");
    expect(staplesIn("celery root")).not.toContain("Celery");
    expect(staplesIn("gingersnap crumbs")).not.toContain("Ginger");
  });

  it("does match the real thing", () => {
    expect(staplesIn("garlic")).toContain("Garlic");
    expect(staplesIn("white wine")).toContain("Dry white wine");
    expect(staplesIn("celery")).toContain("Celery");
    expect(staplesIn("vinegar")).toContain("Vinegar");
  });

  it("has no duplicate staple names", () => {
    const names = STAPLES.map(([n]) => n);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("analyseStaples", () => {
  const recipes = [
    { id: "a", ingredients: [{ item: "minced garlic" }, { item: "olive oil" }, { item: "water" }, { item: "duck confit" }] },
    { id: "b", ingredients: [{ item: "garlic cloves" }, { item: "smoked haddock" }] },
  ];

  it("counts recipes, not ingredient lines", () => {
    const { ranked } = analyseStaples([
      { id: "a", ingredients: [{ item: "garlic" }, { item: "minced garlic" }] },
    ]);
    expect(ranked.find((s) => s.name === "Garlic").recipes).toBe(1);
  });

  it("ranks by how many recipes call for a staple", () => {
    const { ranked } = analyseStaples(recipes);
    expect(ranked[0].name).toBe("Garlic");
    expect(ranked[0].recipes).toBe(2);
    expect(ranked[0].share).toBe(1);
  });

  it("omits staples nothing uses", () => {
    expect(analyseStaples(recipes).ranked.some((s) => s.name === "Nutmeg")).toBe(false);
  });

  it("excludes water from the line count, so coverage is not flattered", () => {
    const { totalLines } = analyseStaples(recipes);
    expect(totalLines).toBe(5); // 6 lines minus water
  });

  it("handles a recipe with no ingredients at all", () => {
    expect(() => analyseStaples([{ id: "x" }])).not.toThrow();
    expect(analyseStaples([{ id: "x", ingredients: [] }]).totalLines).toBe(0);
  });

  it("coverage rises with pantry size and never exceeds everything", () => {
    const { coverage } = analyseStaples(recipes);
    for (let i = 1; i < coverage.length; i++) {
      expect(coverage[i].linesCovered).toBeGreaterThanOrEqual(coverage[i - 1].linesCovered);
      expect(coverage[i].pantry).toBeGreaterThan(coverage[i - 1].pantry);
    }
    expect(coverage.at(-1).linesCovered).toBeLessThanOrEqual(1);
  });
});

describe("the generated pantry summary", () => {
  it("ships with the eager index", () => {
    expect(SOURCE_STAPLES.length).toBeGreaterThan(20);
    expect(STAPLE_COVERAGE.length).toBeGreaterThan(2);
  });

  it("is sorted, and every entry has a group and a sane share", () => {
    for (let i = 0; i < SOURCE_STAPLES.length; i++) {
      const s = SOURCE_STAPLES[i];
      expect(s.group, s.name).toBeTruthy();
      expect(s.recipes, s.name).toBeGreaterThan(0);
      expect(s.share).toBeCloseTo(s.recipes / SOURCE_RECIPE_COUNT, 6);
      if (i) expect(SOURCE_STAPLES[i - 1].recipes).toBeGreaterThanOrEqual(s.recipes);
    }
  });

  it("puts salt, garlic and onion at the top, which is the sanity check", () => {
    const top = SOURCE_STAPLES.slice(0, 5).map((s) => s.name);
    expect(top).toContain("Salt");
    expect(top).toContain("Garlic");
    expect(top).toContain("Onion");
  });

  it("never claims more recipes than the library has", () => {
    for (const s of SOURCE_STAPLES) expect(s.recipes).toBeLessThanOrEqual(SOURCE_RECIPE_COUNT);
    for (const c of STAPLE_COVERAGE) {
      expect(c.recipesWithinFourExtras).toBeLessThanOrEqual(SOURCE_RECIPE_COUNT);
      expect(c.linesCovered).toBeLessThanOrEqual(1);
    }
  });
});
