// Edge Function: recipe
// Server-side proxy for the Anthropic API. The ANTHROPIC_API_KEY lives here as a
// Supabase secret and is NEVER shipped to the browser bundle. The client calls
// this function via supabase.functions.invoke("recipe", { body: { prompt } }).

import { SYSTEM_PROMPT } from "./prompt.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  if (!ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY is not configured on the server" }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const meal = body?.meal;
  const cuisine = body?.cuisine;
  const palate = body?.palate;
  const mealId = body?.mealId;

  let max_tokens = 2000;
  let model = "claude-sonnet-5";
  if (typeof body?.max_tokens === "number") max_tokens = body.max_tokens;
  if (typeof body?.model === "string") model = body.model;

  // Check if we are in structured mode or legacy prompt mode
  const isStructured = typeof meal === "string" && typeof cuisine === "string";

  if (!isStructured) {
    // Legacy prompt mode
    const prompt = body?.prompt;
    if (typeof prompt !== "string" || !prompt.trim()) {
      return json({ error: "Missing or empty 'prompt'" }, 400);
    }
    if (prompt.length > 200_000) {
      return json({ error: "'prompt' too large" }, 413);
    }

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens,
          thinking: { type: "disabled" },
          system: [
            { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          ],
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return json(
          { error: data?.error?.message ?? "Anthropic API error" },
          res.status,
        );
      }

      const text =
        data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
      return json({ text });
    } catch (e) {
      return json({ error: `Upstream request failed: ${String(e)}` }, 502);
    }
  }

  // --- STRUCTURED MODE ---
  // Ensure Supabase variables are set
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Supabase configuration missing on the server" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Formulate stable/idempotent mealId if not provided
  let mealIdVal = mealId;
  if (!mealIdVal) {
    const slug = `${cuisine}-${meal}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    mealIdVal = `custom-${slug}`;
  }

  // 1. Try to fetch from DB first (primary shared cache)
  try {
    let existing = null;
    if (mealIdVal) {
      const { data, error } = await supabase
        .from("meal_library")
        .select("*")
        .eq("meal_id", mealIdVal)
        .maybeSingle();
      if (!error && data) {
        existing = data;
      }
    }
    if (!existing && meal && cuisine) {
      const { data, error } = await supabase
        .from("meal_library")
        .select("*")
        .eq("meal_name", meal)
        .eq("cuisine", cuisine)
        .maybeSingle();
      if (!error && data) {
        existing = data;
      }
    }

    if (existing) {
      // Map DB row back to recipe JSON structure expected by the client
      const recipe = {
        description: existing.description ?? "",
        servings: String(existing.servings ?? ""),
        prepTime: existing.prep_time ?? "",
        cookTime: existing.cook_time ?? "",
        passiveTip: existing.passive_tip ?? "",
        ingredients: existing.ingredients ?? [],
        steps: existing.steps ?? [],
        frugalTips: existing.frugal_tips ?? [],
        leftoversUse: existing.leftovers_use ?? "",
        calories: existing.calories ?? null,
        protein_g: existing.protein_g ?? null,
        carbs_g: existing.carbs_g ?? null,
        fat_g: existing.fat_g ?? null,
        est_cost_usd: existing.est_cost_usd ?? null,
        cal_per_dollar: existing.cal_per_dollar ?? null,
        cost_tier: existing.cost_tier ?? null,
        _source: "library",
      };
      return json(recipe);
    }
  } catch (dbErr) {
    console.error("DB Cache lookup failed:", dbErr);
    // Proceed to generation anyway to avoid failing the user request
  }

  // 2. Cache-miss: generate recipe with Anthropic API
  // Note on Palate Strategy (Option A): To maintain maximum reuse across all future users,
  // we generate a canonical, shared base recipe (without the user's specific palate prompt).
  // Palate preferences are applied entirely on the client-side as a personalization layer.
  const prompt = `Give a complete recipe for "${meal}" (${cuisine} cuisine).`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens,
        thinking: { type: "disabled" },
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return json(
        { error: data?.error?.message ?? "Anthropic API error" },
        res.status,
      );
    }

    const text =
      data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    const recipe = JSON.parse(clean);

    // 3. Write generated recipe server-side (using service_role) back to meal_library
    const m = /^(.*)-d(\d+)$/.exec(mealIdVal);
    const row = {
      meal_id: mealIdVal,
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

    const { error: upsertErr } = await supabase
      .from("meal_library")
      .upsert(row, { onConflict: "meal_id" });

    if (upsertErr) {
      console.error("Failed to persist generated recipe server-side:", upsertErr);
    }

    recipe._source = "api";
    return json(recipe);
  } catch (e) {
    return json({ error: `Upstream request or persistence failed: ${String(e)}` }, 502);
  }
});