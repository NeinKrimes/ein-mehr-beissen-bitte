import { describe, it, expect } from "vitest";
import { chains, mealId, enumerateMeals } from "./chains.js";
import { RAW, MEALS } from "./mealStats.js";

describe("Data Integrity Tests", () => {
  it("all 30 days 1-30 are covered exactly once across chains", () => {
    const days = chains.flatMap(c => c.days.map(d => d.day));
    expect(days).toHaveLength(30);
    const sortedDays = [...days].sort((a, b) => a - b);
    expect(sortedDays).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("every day has a RAW stats entry and vice versa (no orphans)", () => {
    const chainDays = chains.flatMap(c => c.days.map(d => d.day));
    const rawKeys = Object.keys(RAW).map(Number);

    // No orphans from chain days to RAW
    for (const d of chainDays) {
      expect(rawKeys).toContain(d);
    }

    // No orphans from RAW to chain days
    for (const d of rawKeys) {
      expect(chainDays).toContain(d);
    }

    // Since they are exactly 30 unique days, both sets should be size 30 and identical
    expect(rawKeys).toHaveLength(30);
    expect(chainDays).toHaveLength(30);
  });

  it("mealId and enumerateMeals produce the '<chainId>-d<day>' format", () => {
    // Test mealId function
    expect(mealId("c1", 2)).toBe("c1-d2");
    expect(mealId("c9", 28)).toBe("c9-d28");

    // Test enumerateMeals format
    const meals = enumerateMeals();
    expect(meals.length).toBe(30);
    for (const meal of meals) {
      expect(meal.mealId).toBe(`${meal.chainId}-d${meal.day}`);
    }
  });

  it("every MEALS entry has finite kcal, cost > 0, and cpd === Math.round(kcal / cost)", () => {
    expect(MEALS).toHaveLength(30);
    for (const meal of MEALS) {
      expect(Number.isFinite(meal.kcal)).toBe(true);
      expect(meal.kcal).toBeGreaterThan(0);
      expect(meal.cost).toBeGreaterThan(0);
      expect(meal.cpd).toBe(Math.round(meal.kcal / meal.cost));
    }
  });

  it("every chain's days use only type values 'ANCHOR' or 'CHAIN'", () => {
    for (const chain of chains) {
      for (const d of chain.days) {
        expect(["ANCHOR", "CHAIN"]).toContain(d.type);
      }
    }
  });
});
