import { useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { callClaude } from "../lib/claude";
import { toPalatePrompt } from "./usePalate";

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

async function fetchFromAPI(meal, cuisine, palate) {
  // The Edge Function owns the frugal/WFH framing + JSON+nutrition output shape
  // (its shared system prompt), so the client only names the dish + preferences.
  const palatePrompt = toPalatePrompt(palate);
  const prompt = `Give a complete recipe for "${meal}" (${cuisine} cuisine).${palatePrompt}`;
  const recipe = await callClaude(prompt);
  recipe._source = "api";
  return recipe;
}

// Best-effort write-back of a fallback recipe so it's free next time.
// NOTE: RLS restricts `recipes` writes to the service role, so this succeeds only
// under a privileged context — under the anon client it no-ops. localStorage
// (tier 2) is the reliable per-browser cache; the 30 core meals come pre-seeded.
async function persistToSupabase(mealId, meal, cuisine, recipe) {
  const m = /^(.*)-d(\d+)$/.exec(mealId);
  const row = {
    meal_id: mealId,
    chain_id: m ? m[1] : null,
    day: m ? Number(m[2]) : null,
    cuisine,
    meal_name: meal,
    content_hash: "runtime-fallback",
    description: recipe.description ?? null,
    servings: parseInt(String(recipe.servings ?? ""), 10) || null,
    prep_time: recipe.prepTime ?? null,
    cook_time: recipe.cookTime ?? null,
    passive_tip: recipe.passiveTip ?? null,
    ingredients: recipe.ingredients ?? [],
    steps: recipe.steps ?? [],
    frugal_tips: recipe.frugalTips ?? [],
    leftovers_use: recipe.leftoversUse ?? null,
    calories: parseInt(String(recipe.calories ?? ""), 10) || null,
    protein_g: parseInt(String(recipe.protein_g ?? ""), 10) || null,
    carbs_g: parseInt(String(recipe.carbs_g ?? ""), 10) || null,
    fat_g: parseInt(String(recipe.fat_g ?? ""), 10) || null,
    est_cost_usd: Number(recipe.est_cost_usd) || null,
  };
  try {
    await supabase.from(LIBRARY_TABLE).upsert(row, { onConflict: "meal_id" });
  } catch {
    // Expected under anon RLS — localStorage already holds it for this browser.
  }
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
        recipe = await fetchFromAPI(meal, cuisine, palate);
        writeToLocalStorage(mealId, recipe);
        persistToSupabase(mealId, meal, cuisine, recipe);
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
