// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecipe } from "./useRecipe.js";

let supabaseData = null;
let supabaseError = null;
let supabasePreloadData = [];
let supabaseUpsertCalled = [];

vi.mock("../lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
      from: vi.fn(() => {
        return {
          select: vi.fn(() => {
            const query = {
              eq: vi.fn(() => {
                return {
                  maybeSingle: vi.fn().mockImplementation(async () => {
                    return { data: supabaseData, error: supabaseError };
                  })
                };
              }),
              then: vi.fn((onFulfilled) => {
                return Promise.resolve({ data: supabasePreloadData, error: null }).then(onFulfilled);
              })
            };
            return query;
          }),
          upsert: vi.fn((row) => {
            supabaseUpsertCalled.push(row);
            return Promise.resolve({ data: null, error: null });
          })
        };
      })
    }
  };
});

let callClaudeCount = 0;
let callClaudeArgs = [];
let claudeResponse = null;

vi.mock("../lib/claude", () => {
  return {
    callClaude: vi.fn().mockImplementation(async (...args) => {
      callClaudeCount++;
      callClaudeArgs.push(args);
      return claudeResponse;
    })
  };
});

describe("useRecipe hook", () => {
  beforeEach(() => {
    localStorage.clear();
    supabaseData = null;
    supabaseError = null;
    supabasePreloadData = [];
    supabaseUpsertCalled = [];
    claudeResponse = {
      description: "Mock API Recipe",
      servings: "4",
      prepTime: "10 mins",
      cookTime: "20 mins",
      ingredients: [{ amount: "1", unit: "cup", item: "rice" }],
      steps: [{ n: 1, title: "Cook", text: "Boil." }],
      frugalTips: ["Save money"],
      leftoversUse: "Congee"
    };
    callClaudeCount = 0;
    callClaudeArgs = [];
  });

  it("Tier 1: when Supabase returns a row, no API call happens", async () => {
    supabaseData = {
      meal_id: "c1-d1",
      description: "Supabase Recipe",
      servings: 4,
      prep_time: "15 min",
      cook_time: "45 min",
      ingredients: [{ amount: "1", unit: "whole", item: "chicken" }],
      steps: [{ n: 1, title: "Prep", text: "Butter the chicken." }]
    };

    const { result } = renderHook(() => useRecipe());

    await act(async () => {
      await result.current.loadRecipe("c1-d1", "Poulet Roti", "French", null);
    });

    const recipe = result.current.getRecipe("c1-d1");
    expect(recipe).not.toBeNull();
    expect(recipe.description).toBe("Supabase Recipe");
    expect(recipe._source).toBe("library");
    expect(callClaudeCount).toBe(0);
    expect(localStorage.getItem("embb_recipe::c1-d1")).toBeNull();
  });

  it("Tier 2: when Supabase misses but localStorage has the recipe, no API call happens", async () => {
    supabaseData = null;
    const cachedRecipe = {
      description: "LocalStorage Recipe",
      servings: "2",
      prepTime: "5 min",
      cookTime: "10 min",
      ingredients: [{ amount: "2", unit: "pcs", item: "eggs" }],
      steps: []
    };
    localStorage.setItem("embb_recipe::c1-d1", JSON.stringify(cachedRecipe));

    const { result } = renderHook(() => useRecipe());

    await act(async () => {
      await result.current.loadRecipe("c1-d1", "Poulet Roti", "French", null);
    });

    const recipe = result.current.getRecipe("c1-d1");
    expect(recipe).not.toBeNull();
    expect(recipe.description).toBe("LocalStorage Recipe");
    expect(recipe._source).toBe("localStorage");
    expect(callClaudeCount).toBe(0);
  });

  it("Tier 3: when both miss, callClaude is called once and result lands in localStorage", async () => {
    supabaseData = null;

    const { result } = renderHook(() => useRecipe());

    await act(async () => {
      await result.current.loadRecipe("c1-d1", "Poulet Roti", "French", null);
    });

    const recipe = result.current.getRecipe("c1-d1");
    expect(recipe).not.toBeNull();
    expect(recipe.description).toBe("Mock API Recipe");
    expect(recipe._source).toBe("api");
    expect(callClaudeCount).toBe(1);

    // Lands in localStorage
    const stored = JSON.parse(localStorage.getItem("embb_recipe::c1-d1"));
    expect(stored).not.toBeNull();
    expect(stored.description).toBe("Mock API Recipe");

    // Persist to Supabase is triggered
    expect(supabaseUpsertCalled).toHaveLength(1);
    expect(supabaseUpsertCalled[0].meal_id).toBe("c1-d1");
  });

  it("Caching: a second loadRecipe for the same mealId does not re-fetch", async () => {
    supabaseData = null;

    const { result } = renderHook(() => useRecipe());

    // First load (will trigger API call)
    await act(async () => {
      await result.current.loadRecipe("c1-d1", "Poulet Roti", "French", null);
    });

    expect(callClaudeCount).toBe(1);

    // Second load
    await act(async () => {
      await result.current.loadRecipe("c1-d1", "Poulet Roti", "French", null);
    });

    // Should still be 1 call
    expect(callClaudeCount).toBe(1);
  });
});
