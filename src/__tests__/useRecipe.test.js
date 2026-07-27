import { vi, describe, it, expect } from "vitest";

// Mock supabase client to avoid initialization errors during test execution
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { fromSupabaseRow } from "../hooks/useRecipe";

describe("fromSupabaseRow", () => {
  it("should return null if the input row is falsy", () => {
    expect(fromSupabaseRow(null)).toBeNull();
    expect(fromSupabaseRow(undefined)).toBeNull();
  });

  it("should map a fully-populated Supabase row correctly", () => {
    const mockRow = {
      description: "A delicious frugal stew.",
      servings: 4,
      prep_time: "15 mins",
      cook_time: "2 hours",
      passive_tip: "Let it simmer while working.",
      ingredients: [{ amount: "1", unit: "can", item: "black beans" }],
      steps: [{ n: 1, title: "Simmer", text: "Simmer everything." }],
      frugal_tips: ["Use leftover stock."],
      leftovers_use: "Freeze remaining portion.",
      calories: 450,
      protein_g: 25,
      carbs_g: 50,
      fat_g: 10,
      est_cost_usd: 5.5,
      cal_per_dollar: 327,
      cost_tier: "$",
    };

    const result = fromSupabaseRow(mockRow);

    expect(result).toEqual({
      description: "A delicious frugal stew.",
      servings: 4,
      prepTime: "15 mins",
      cookTime: "2 hours",
      passiveTip: "Let it simmer while working.",
      ingredients: [{ amount: "1", unit: "can", item: "black beans" }],
      steps: [{ n: 1, title: "Simmer", text: "Simmer everything." }],
      frugalTips: ["Use leftover stock."],
      leftoversUse: "Freeze remaining portion.",
      calories: 450,
      protein_g: 25,
      carbs_g: 50,
      fat_g: 10,
      est_cost_usd: 5.5,
      cal_per_dollar: 327,
      cost_tier: "$",
      _source: "library",
    });
  });

  it("should handle missing properties and apply fallback defaults", () => {
    const incompleteRow = {
      description: "Only has description",
    };

    const result = fromSupabaseRow(incompleteRow);

    expect(result).toEqual({
      description: "Only has description",
      servings: "",
      prepTime: "",
      cookTime: "",
      passiveTip: "",
      ingredients: [],
      steps: [],
      frugalTips: [],
      leftoversUse: "",
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      est_cost_usd: null,
      cal_per_dollar: null,
      cost_tier: null,
      _source: "library",
    });
  });

  it("should ignore extra properties in the database row", () => {
    const rowWithExtraProperties = {
      description: "Frugal dish",
      extra_field: "some extra value",
      another_unrelated_field: 42,
    };

    const result = fromSupabaseRow(rowWithExtraProperties);

    expect(result.extra_field).toBeUndefined();
    expect(result.another_unrelated_field).toBeUndefined();
    expect(result.description).toBe("Frugal dish");
  });
});
