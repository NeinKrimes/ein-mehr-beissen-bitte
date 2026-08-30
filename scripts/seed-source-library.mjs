// Idempotent seeder for the adapted source library.
//
// Pushes the generated corpus (src/data/sourceRecipes.data.js) into Supabase
// `source_library`, so the browser fetches the rows it looks at instead of
// downloading a 100 kB index and a 1.2 MB corpus chunk. The generated files stay
// in the repo as the offline fallback — this does not replace them.
//
// Unlike scripts/seed-recipes.mjs, nothing is generated here and no model is
// called: the content already exists on disk. This is a pure upload, so it is
// cheap and safe to re-run after every `npm run build:recipes`.
//
// Env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
// Run: npm run seed:library   (add --prune to delete rows no longer in the corpus)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRUNE = process.argv.includes("--prune");

// Postgres rejects an over-large request body long before it rejects the data,
// and these rows carry full ingredient and step arrays.
const CHUNK = 100;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  const missing = [
    !SUPABASE_URL && "SUPABASE_URL (or VITE_SUPABASE_URL)",
    !SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  console.error(`Missing required env: ${missing.join(", ")}`);
  console.error("The anon key cannot write here — source_library's RLS allows select only.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { default: corpus } = await import("../src/data/sourceRecipes.data.js");
if (!corpus?.length) {
  console.error("No recipes in src/data/sourceRecipes.data.js — run `npm run build:recipes` first.");
  process.exit(1);
}

// cal_per_dollar is a generated column; sending it would be rejected.
const row = (r) => ({
  id: r.id,
  title: r.title,
  subtitle: r.subtitle ?? "",
  cuisine: r.cuisine,
  servings: r.servings == null ? null : String(r.servings),
  total_time: r.totalTime ?? null,
  ingredients: r.ingredients ?? [],
  steps: r.steps ?? [],
  attribution: r.attribution ?? null,
  calories: r.calories ?? null,
  protein_g: r.protein_g ?? null,
  carbs_g: r.carbs_g ?? null,
  fat_g: r.fat_g ?? null,
  fiber_g: r.fiber_g ?? null,
  sodium_mg: r.sodium_mg ?? null,
  est_cost_usd: r.est_cost_usd ?? null,
  updated_at: new Date().toISOString(),
});

let written = 0;
for (let i = 0; i < corpus.length; i += CHUNK) {
  const batch = corpus.slice(i, i + CHUNK).map(row);
  const { error } = await db.from("source_library").upsert(batch, { onConflict: "id" });
  if (error) {
    console.error(`Upsert failed at rows ${i}–${i + batch.length}: ${error.message}`);
    process.exit(1);
  }
  written += batch.length;
  console.log(`  upserted ${written}/${corpus.length}`);
}

// A recipe removed from data/authored-steps.json would otherwise linger in the
// table and keep appearing in the Library room. Opt-in, because deleting rows is
// not something a routine reseed should do without being asked.
let pruned = 0;
if (PRUNE) {
  const { data: existing, error } = await db.from("source_library").select("id");
  if (error) {
    console.error(`Could not list rows to prune: ${error.message}`);
    process.exit(1);
  }
  const keep = new Set(corpus.map((r) => r.id));
  const stale = existing.map((r) => r.id).filter((id) => !keep.has(id));
  if (stale.length) {
    const { error: delError } = await db.from("source_library").delete().in("id", stale);
    if (delError) {
      console.error(`Prune failed: ${delError.message}`);
      process.exit(1);
    }
    pruned = stale.length;
    console.log(`  pruned ${pruned}: ${stale.join(", ")}`);
  }
}

const { count } = await db.from("source_library").select("id", { count: "exact", head: true });
console.log(`\nseeded source_library: ${written} upserted${PRUNE ? `, ${pruned} pruned` : ""}, ${count} rows in table`);
if (!PRUNE && count > corpus.length) {
  console.log(`note: table holds ${count - corpus.length} row(s) not in the corpus — re-run with --prune to remove them.`);
}
