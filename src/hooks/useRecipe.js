import { useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { callClaude } from "../lib/claude";

// Tiered recipe loader keyed by a stable meal_id ("<chainId>-d<day>"):
//   1. Supabase `meal_library` table (primary — hits for all 30 seeded core meals)
//   2. in-memory / localStorage cache
//   3. on-demand Edge Function generation (fallback ONLY — meals not in the DB)
// Once the DB is seeded, tier 1 answers every core meal with zero Anthropic calls.
//
// NOTE: the table is `meal_library`, not `recipes` — EBBM2 already has an unrelated
// normalized `recipes` table, so this app keeps its flat library under its own name.
const LIBRARY_TABLE = "meal_library";

function lsKey(mealId) {
  return `embb_recipe::${mealId}`;
}

function readFromLocalStorage(mealId) {
  try {
    const raw = localStorage.getItem(lsKey(mealId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeToLocalStorage(mealId, recipe) {
  try {
    localStorage.setItem(lsKey(mealId), JSON.stringify(recipe));
  } catch {
    // storage quota exceeded — silently skip
  }
}

// Map a denormalized `recipes` row into the app's recipe shape (incl. nutrition).
function fromSupabaseRow(row) {
  if (!row) return null;
  return {
    description: row.description ?? "",
    servings: row.servings ?? "",
    prepTime: row.prep_time ?? "",
    cookTime: row.cook_time ?? "",
    passiveTip: row.passive_tip ?? "",
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    frugalTips: row.frugal_tips ?? [],
    leftoversUse: row.leftovers_use ?? "",
    // Nutrition + cost (surfaced as badges in the UI).
    calories: row.calories ?? null,
    protein_g: row.protein_g ?? null,
    carbs_g: row.carbs_g ?? null,
    fat_g: row.fat_g ?? null,
    est_cost_usd: row.est_cost_usd ?? null,
    cal_per_dollar: row.cal_per_dollar ?? null,
    cost_tier: row.cost_tier ?? null,
    _source: "library",
  };
}

async function fetchFromSupabase(mealId) {
  const { data, error } = await supabase
    .from(LIBRARY_TABLE)
    .select("*")
    .eq("meal_id", mealId)
    .maybeSingle();

  if (error || !data) return null;
  return fromSupabaseRow(data);
}

async function fetchFromAPI(mealId, meal, cuisine, palate) {
  // Pass structured parameters directly to the server-side Edge Function.
  // The Edge Function performs the DB lookup first, and only on a cache-miss
  // triggers Anthropic generation and upserts the result back into Supabase using service_role.
  const recipe = await callClaude({ meal, cuisine, palate, mealId });
  recipe._source = "api";
  return recipe;
}

export function useRecipe() {
  // In-memory cache: { [mealId]: recipe | { loading: true } | { error } }
  const cache = useRef({});
  const [, forceRender] = useState(0);

  const getRecipe = useCallback((mealId) => {
    return cache.current[mealId] ?? null;
  }, []);

  // Prime the whole seeded library in one read so cost/calorie badges and the
  // shopping list have data without clicking each meal. Zero Anthropic calls.
  const preloadLibrary = useCallback(async () => {
    const { data, error } = await supabase.from(LIBRARY_TABLE).select("*");
    if (error || !data) return;
    let added = false;
    for (const row of data) {
      if (!cache.current[row.meal_id]) {
        cache.current[row.meal_id] = fromSupabaseRow(row);
        added = true;
      }
    }
    if (added) forceRender((n) => n + 1);
  }, []);

  const loadRecipe = useCallback(async (mealId, meal, cuisine, palate) => {
    // Already in flight or loaded
    if (cache.current[mealId]) return;

    cache.current[mealId] = { loading: true };
    forceRender((n) => n + 1);

    try {
      // Tier 1 — Supabase library (primary)
      let recipe = await fetchFromSupabase(mealId);

      // Tier 2 — localStorage
      if (!recipe) {
        recipe = readFromLocalStorage(mealId);
        if (recipe) recipe._source = "localStorage";
      }

      // Tier 3 — Edge Function generation (fallback only)
      if (!recipe) {
        recipe = await fetchFromAPI(mealId, meal, cuisine, palate);
        writeToLocalStorage(mealId, recipe);
      }

      cache.current[mealId] = recipe;
    } catch {
      cache.current[mealId] = { error: "Could not load recipe. Try again." };
    }

    forceRender((n) => n + 1);
  }, []);

  const clearRecipe = useCallback((mealId) => {
    delete cache.current[mealId];
    forceRender((n) => n + 1);
  }, []);

  return { getRecipe, loadRecipe, clearRecipe, preloadLibrary };
}
