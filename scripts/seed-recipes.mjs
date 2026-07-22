// Idempotent recipe seeder.
//
// Fills the Supabase `recipes` table for every meal in src/data/chains.js.
// This is the mechanism that both fills the DB and eliminates per-view token
// cost: generate every recipe once, read from the DB thereafter.
//
// - Enumerates all meals -> meal_id ("<chainId>-d<day>") + content_hash.
// - Skips rows whose (meal_id, content_hash) already match (idempotent reseed).
// - Generates the missing/changed ones via the Message Batches API (~50% cheaper;
//   latency doesn't matter here), with the shared system prompt cached once.
// - Upserts full recipes incl. nutrition + content_hash on conflict (meal_id).
//
// Env: ANTHROPIC_API_KEY, SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
// Run: npm run seed   (safe to re-run — reports generated / skipped / failed)

import { createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { enumerateMeals } from "../src/data/chains.js";
import { SYSTEM_PROMPT, PROMPT_VERSION } from "../supabase/functions/recipe/prompt.js";

const MODEL = "claude-sonnet-5"; // one-time quality cost (brief's sonnet-4 is retired)
const MAX_TOKENS = 2000;
const POLL_MS = 10_000;

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function requireEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL (or VITE_SUPABASE_URL)");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (missing.length) {
    console.error(`Missing required env: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// Hash of the meal definition + prompt version — changing either forces a reseed.
function contentHash(meal) {
  const payload = JSON.stringify({
    v: PROMPT_VERSION,
    chainId: meal.chainId,
    day: meal.day,
    cuisine: meal.cuisine,
    anchor: meal.anchor,
    type: meal.type,
    meal: meal.meal,
    cost: meal.cost,
  });
  return createHash("sha256").update(payload).digest("hex");
}

function userPrompt(meal) {
  const role =
    meal.type === "ANCHOR"
      ? `the anchor dish of the "${meal.anchor}" chain`
      : `a follow-up meal in the "${meal.anchor}" chain`;
  return `Give a complete recipe for "${meal.meal}" (${meal.cuisine} cuisine). It is ${role}.`;
}

function batchParams(meal) {
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "disabled" },
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userPrompt(meal) }],
  };
}

function parseRecipe(message) {
  const text =
    message?.content?.find((b) => b.type === "text")?.text ?? "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function toInt(v) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toRow(meal, recipe) {
  return {
    meal_id: meal.mealId,
    chain_id: meal.chainId,
    day: meal.day,
    cuisine: meal.cuisine,
    anchor: meal.anchor,
    meal_name: meal.meal,
    cost_tier: meal.cost,
    content_hash: contentHash(meal),
    description: recipe.description ?? null,
    servings: toInt(recipe.servings),
    prep_time: recipe.prepTime ?? null,
    cook_time: recipe.cookTime ?? null,
    passive_tip: recipe.passiveTip ?? null,
    ingredients: recipe.ingredients ?? [],
    steps: recipe.steps ?? [],
    frugal_tips: recipe.frugalTips ?? [],
    leftovers_use: recipe.leftoversUse ?? null,
    calories: toInt(recipe.calories),
    protein_g: toInt(recipe.protein_g),
    carbs_g: toInt(recipe.carbs_g),
    fat_g: toInt(recipe.fat_g),
    est_cost_usd: toNum(recipe.est_cost_usd),
  };
}

async function main() {
  requireEnv();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const meals = enumerateMeals();
  const byId = new Map(meals.map((m) => [m.mealId, m]));

  // 1. Which meals are already up to date?
  const { data: existing, error: readErr } = await supabase
    .from("recipes")
    .select("meal_id, content_hash");
  if (readErr) {
    console.error("Failed to read existing recipes:", readErr.message);
    process.exit(1);
  }
  const existingHash = new Map(
    (existing ?? []).map((r) => [r.meal_id, r.content_hash]),
  );

  const toGenerate = meals.filter(
    (m) => existingHash.get(m.mealId) !== contentHash(m),
  );
  const skipped = meals.length - toGenerate.length;
  console.log(
    `${meals.length} meals total · ${skipped} unchanged (skipped) · ${toGenerate.length} to generate`,
  );

  if (toGenerate.length === 0) {
    console.log("\nSummary → generated: 0 · skipped: " + skipped + " · failed: 0");
    return;
  }

  // 2. Submit them all in one batch.
  console.log(`Submitting batch of ${toGenerate.length} requests (${MODEL})…`);
  const batch = await anthropic.messages.batches.create({
    requests: toGenerate.map((m) => ({
      custom_id: m.mealId,
      params: batchParams(m),
    })),
  });

  // 3. Poll until the batch ends.
  let status = batch;
  while (status.processing_status !== "ended") {
    const c = status.request_counts;
    console.log(
      `  batch ${status.id}: ${status.processing_status} ` +
        `(processing ${c?.processing ?? 0}, succeeded ${c?.succeeded ?? 0}, errored ${c?.errored ?? 0})`,
    );
    await sleep(POLL_MS);
    status = await anthropic.messages.batches.retrieve(batch.id);
  }
  console.log(`  batch ${batch.id}: ended`);

  // 4. Collect results, parse, upsert. Results arrive in any order — key by custom_id.
  let generated = 0;
  let failed = 0;
  for await (const result of await anthropic.messages.batches.results(batch.id)) {
    const meal = byId.get(result.custom_id);
    if (!meal) continue;

    if (result.result.type !== "succeeded") {
      failed++;
      console.warn(`  ✗ ${result.custom_id}: ${result.result.type}`);
      continue;
    }

    let row;
    try {
      row = toRow(meal, parseRecipe(result.result.message));
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${result.custom_id}: parse error — ${e.message}`);
      continue;
    }

    const { error: upsertErr } = await supabase
      .from("recipes")
      .upsert(row, { onConflict: "meal_id" });
    if (upsertErr) {
      failed++;
      console.warn(`  ✗ ${result.custom_id}: upsert — ${upsertErr.message}`);
      continue;
    }
    generated++;
    console.log(`  ✓ ${result.custom_id} (${meal.meal})`);
  }

  console.log(
    `\nSummary → generated: ${generated} · skipped: ${skipped} · failed: ${failed}`,
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
