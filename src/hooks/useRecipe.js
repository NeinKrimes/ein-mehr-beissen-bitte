import { useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { callClaude } from "../lib/claude";
import { usePalate, toPalatePrompt } from "./usePalate";

// POLICY: Palate-keyed caching.
// - All recipe caching tiers (in-memory, localStorage) honor the user's palate preferences consistently.
// - Tier 1 (Supabase meal_library table) only stores canonical (palate-independent) shared recipes.
//   Therefore, Tier 1 is only queried/loaded when the user has NO active palate preferences (canonical/default palate).
//   If the user has active palate preferences, Tier 1 is bypassed to ensure the user receives a palate-personalized recipe
//   from Tier 3 (Edge Function generation), which is then cached in Tier 2 (localStorage) under a palate-specific key.
// - This ensures that a cache hit/miss behaves identically and honors the palate consistently.

// Tiered recipe loader keyed by a stable meal_id ("<chainId>-d<day>"):
//   1. Supabase `meal_library` table (primary — hits for all 30 seeded core meals)
//   2. in-memory / localStorage cache
//   3. on-demand Edge Function generation (fallback ONLY — meals not in the DB)
// Once the DB is seeded, tier 1 answers every core meal with zero Anthropic calls.
//
// NOTE: the table is `meal_library`, not `recipes` — EBBM2 already has an unrelated
// normalized `recipes` table, so this app keeps its flat library under its own name.
const LIBRARY_TABLE = "meal_library";

// Generate a stable, sorted key representing the active palate preferences.
// Returns "canonical" if the palate is empty or has no active preferences.
export function getPalateKey(palate) {
  if (!palate) return "canonical";

  const parts = [];

  if (palate.proteinBlocks?.length) {
    parts.push(`exclude:${[...palate.proteinBlocks].sort().join(",")}`);
  }

  if (palate.dislikes?.length) {
    parts.push(`avoid:${[...palate.dislikes].sort().join(",")}`);
  }

  if (palate.likedProteins?.length) {
    parts.push(`like-prot:${[...palate.likedProteins].sort().join(",")}`);
  }

  if (palate.likedFlavours?.length) {
    parts.push(`like-flav:${[...palate.likedFlavours].sort().join(",")}`);
  }

  return parts.length ? parts.join(";") : "canonical";
}

function lsKey(mealId, palateKey) {
  return palateKey === "canonical"
    ? `embb_recipe::${mealId}`
    : `embb_recipe::${mealId}::${palateKey}`;
}

function readFromLocalStorage(mealId, palateKey) {
  try {
    const raw = localStorage.getItem(lsKey(mealId, palateKey));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeToLocalStorage(mealId, palateKey, recipe) {
  try {
    localStorage.setItem(lsKey(mealId, palateKey), JSON.stringify(recipe));
  } catch {
    // storage quota exceeded — silently skip
  }
}

// Map a denormalized `recipes` row into the app's recipe shape (incl. nutrition).
export function fromSupabaseRow(row) {
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
    await supabase.from(LIBRARY_TABLE).upsert(row, { onConflict: "meal_name,cuisine" });
  } catch {
    // Expected under anon RLS — localStorage already holds it for this browser.
  }
}

export function useRecipe() {
  const { palate } = usePalate();
  // In-memory cache: { [cacheKey]: recipe | { loading: true } | { error } }
  // Where cacheKey is `${mealId}::${palateKey}`
  const cache = useRef({});
  const [, forceRender] = useState(0);

  const getRecipe = useCallback((mealId) => {
    const pKey = getPalateKey(palate);
    const cacheKey = `${mealId}::${pKey}`;
    return cache.current[cacheKey] ?? null;
  }, [palate]);

  // Prime the whole seeded library in one read so cost/calorie badges and the
  // shopping list have data without clicking each meal. Zero Anthropic calls.
  // We preload them as the canonical recipes.
  const preloadLibrary = useCallback(async () => {
    const { data, error } = await supabase.from(LIBRARY_TABLE).select("*");
    if (error || !data) return;
    let added = false;
    for (const row of data) {
      const cacheKey = `${row.meal_id}::canonical`;
      if (!cache.current[cacheKey]) {
        cache.current[cacheKey] = fromSupabaseRow(row);
        added = true;
      }
    }
    if (added) forceRender((n) => n + 1);
  }, []);

  const loadRecipe = useCallback(async (mealId, meal, cuisine) => {
    const pKey = getPalateKey(palate);
    const cacheKey = `${mealId}::${pKey}`;

    // Already in flight or loaded
    if (cache.current[cacheKey]) return;

    cache.current[cacheKey] = { loading: true };
    forceRender((n) => n + 1);

    try {
      let recipe = null;

      // Tier 1 — Supabase library (primary) - ONLY queried/loaded if user has NO active palate preferences.
      if (pKey === "canonical") {
        recipe = await fetchFromSupabase(mealId);
      }

      // Tier 2 — localStorage (keyed by palateKey)
      if (!recipe) {
        recipe = readFromLocalStorage(mealId, pKey);
        if (recipe) recipe._source = "localStorage";
      }

      // Tier 3 — Edge Function generation (fallback only)
      if (!recipe) {
        recipe = await fetchFromAPI(meal, cuisine, palate);
        writeToLocalStorage(mealId, pKey, recipe);
        // Only write back to Supabase if it's canonical. We don't save palate-specific recipes to shared table.
        if (pKey === "canonical") {
          persistToSupabase(mealId, meal, cuisine, recipe);
        }
        recipe = await fetchFromAPI(mealId, meal, cuisine, palate);
        writeToLocalStorage(mealId, recipe);
      }

      cache.current[mealId] = recipe;
    } catch (err) {
      cache.current[mealId] = { error: err?.message || "Could not load recipe. Try again." };
      cache.current[cacheKey] = recipe;
    } catch {
      cache.current[cacheKey] = { error: "Could not load recipe. Try again." };
    }

    forceRender((n) => n + 1);
  }, [palate]);

  const clearRecipe = useCallback((mealId) => {
    const pKey = getPalateKey(palate);
    const cacheKey = `${mealId}::${pKey}`;
    delete cache.current[cacheKey];
    forceRender((n) => n + 1);
  }, [palate]);

  return { getRecipe, loadRecipe, clearRecipe, preloadLibrary };
}
