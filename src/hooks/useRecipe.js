import { useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { toPalatePrompt } from "./usePalate";

// localStorage key for a given recipe
function lsKey(meal, cuisine) {
  return `embb_recipe::${cuisine}::${meal}`;
}

function readFromLocalStorage(meal, cuisine) {
  try {
    const raw = localStorage.getItem(lsKey(meal, cuisine));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeToLocalStorage(meal, cuisine, recipe) {
  try {
    localStorage.setItem(lsKey(meal, cuisine), JSON.stringify(recipe));
  } catch {
    // storage quota exceeded — silently skip
  }
}

// Reconstruct the normalised Supabase recipe rows back into the app's recipe shape.
// Expected Supabase join: recipes + recipe_steps + recipe_ingredients (+ ingredients.name)
function fromSupabaseRow(row) {
  if (!row) return null;
  return {
    description: row.description ?? "",
    servings: row.servings ?? "",
    prepTime: row.prep_time ?? "",
    cookTime: row.cook_time ?? "",
    passiveTip: row.passive_tip ?? "",
    ingredients: (row.recipe_ingredients ?? []).map((ri) => ({
      amount: ri.amount ?? "",
      unit: ri.unit ?? "",
      item: ri.ingredients?.name ?? ri.item ?? "",
    })),
    steps: (row.recipe_steps ?? [])
      .sort((a, b) => a.step_number - b.step_number)
      .map((s) => ({
        n: s.step_number,
        title: s.title ?? "",
        text: s.instruction ?? s.text ?? "",
      })),
    frugalTips: row.frugal_tips ?? [],
    leftoversUse: row.leftovers_use ?? "",
    _source: "library",
  };
}

async function fetchFromSupabase(meal, cuisine) {
  const { data, error } = await supabase
    .from("recipes")
    .select(`
      description,
      servings,
      prep_time,
      cook_time,
      passive_tip,
      frugal_tips,
      leftovers_use,
      recipe_steps ( step_number, title, instruction ),
      recipe_ingredients ( amount, unit, ingredients ( name ) )
    `)
    .ilike("meal_name", meal)
    .ilike("cuisine", cuisine)
    .maybeSingle();

  if (error || !data) return null;
  return fromSupabaseRow(data);
}

async function fetchFromAPI(meal, cuisine, palate) {
  const palatePrompt = toPalatePrompt(palate);

  const prompt = `You are a frugal home cook expert. Give a complete recipe for "${meal}" (${cuisine} cuisine).${palatePrompt}

Format your response as JSON only, no markdown, no backticks. Use this exact structure:
{
  "description": "2-sentence description of the dish",
  "servings": "4",
  "prepTime": "15 min",
  "cookTime": "45 min",
  "passiveTip": "one sentence on what to do while it cooks (if it's a slow cook)",
  "ingredients": [
    {"amount": "2", "unit": "lbs", "item": "chicken thighs"},
    ...
  ],
  "steps": [
    {"n": 1, "title": "Short title", "text": "Full instruction."},
    ...
  ],
  "frugalTips": ["tip 1", "tip 2"],
  "leftoversUse": "One sentence on how to use leftovers tomorrow"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const text = data.content?.find((b) => b.type === "text")?.text ?? "";
  const clean = text.replace(/```json|```/g, "").trim();
  const recipe = JSON.parse(clean);
  recipe._source = "api";
  return recipe;
}

export function useRecipe() {
  // In-memory cache: { [meal::cuisine]: recipe | "loading" | { error } }
  const cache = useRef({});
  const [, forceRender] = useState(0);

  const getRecipe = useCallback((meal, cuisine) => {
    const key = `${meal}::${cuisine}`;
    return cache.current[key] ?? null;
  }, []);

  const loadRecipe = useCallback(async (meal, cuisine, palate) => {
    const key = `${meal}::${cuisine}`;

    // Already in flight or loaded
    if (cache.current[key]) return;

    cache.current[key] = { loading: true };
    forceRender((n) => n + 1);

    try {
      // Tier 1 — Supabase library
      let recipe = await fetchFromSupabase(meal, cuisine);

      // Tier 2 — localStorage
      if (!recipe) {
        recipe = readFromLocalStorage(meal, cuisine);
        if (recipe) recipe._source = "localStorage";
      }

      // Tier 3 — Anthropic API
      if (!recipe) {
        recipe = await fetchFromAPI(meal, cuisine, palate);
        writeToLocalStorage(meal, cuisine, recipe);
      }

      cache.current[key] = recipe;
    } catch (e) {
      cache.current[key] = { error: "Could not load recipe. Try again." };
    }

    forceRender((n) => n + 1);
  }, []);

  const clearRecipe = useCallback((meal, cuisine) => {
    const key = `${meal}::${cuisine}`;
    delete cache.current[key];
    forceRender((n) => n + 1);
  }, []);

  return { getRecipe, loadRecipe, clearRecipe };
}
