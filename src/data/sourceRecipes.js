// The adapted source library — 466 recipes drawn from the Cuisine at Home
// issues on the project's source shelf. Ingredient lists, yields and per-serving
// nutrition are reproduced as printed (facts, not authorship); every method step
// is rewritten in this app's own voice. See data/authored-steps.json.
//
// This is a reference library, NOT the calendar. The 46 nights live in chains.js
// and are unaffected; useRecipe consults this library before spending an API
// call generating something.
//
// WHERE THE DATA COMES FROM
//
// Supabase `source_library` first, the generated chunks second. The index is
// ~100 kB and the full corpus ~1.2 MB; serving them from Postgres means a
// browser downloads the handful of rows it actually looks at. The generated
// files stay in the repo so the Library room still works offline, in tests, and
// with no Supabase project configured — a fallback, not a second source of
// truth. Both are built from the same `npm run build:recipes` output.
//
// This file is hand-written. The generated files next to it hold data only.

// Re-exported so callers have one import for the library, but the summary is
// tiny and eager — import it directly where only the summary is needed.
export { SOURCE_CUISINES, SOURCE_RECIPE_COUNT, SOURCE_STAPLES, STAPLE_COVERAGE } from "./sourceSummary";

// The columns the index needs. Asking for these by name rather than `*` keeps
// ingredients and steps — the whole reason the corpus is big — out of the
// listing response.
const INDEX_COLUMNS = "id,title,subtitle,cuisine,calories,est_cost_usd,cal_per_dollar";

// A Supabase that never answers must not leave the Library room spinning. The
// bundled copy is right there, so waiting longer than this to avoid downloading
// it is a bad trade — better a slightly heavier page than a dead one.
const REMOTE_TIMEOUT_MS = 2500;

/** Resolve to the query's result, or to null if it is too slow or throws. */
function withTimeout(promise) {
  return Promise.race([
    Promise.resolve(promise).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), REMOTE_TIMEOUT_MS)),
  ]);
}

// Resolved lazily and only once. A miss is remembered too: if Supabase is not
// configured or did not answer, we do not retry it on every lookup.
let indexPromise = null;
let corpusPromise = null;
let clientPromise = null;

/**
 * The Supabase client, or null when the project is not configured.
 *
 * Imported dynamically so a build without Supabase env vars — and the test run —
 * never pulls the client into the bundle at all.
 */
function getClient() {
  clientPromise ??= (async () => {
    const url = import.meta.env?.VITE_SUPABASE_URL;
    const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    try {
      const { supabase } = await import("../lib/supabase");
      return supabase ?? null;
    } catch {
      return null;
    }
  })();
  return clientPromise;
}

/** Postgres row -> the shape the app already renders. */
function fromRow(row) {
  if (!row) return null;
  const rec = {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    cuisine: row.cuisine,
    calories: row.calories ?? null,
    est_cost_usd: row.est_cost_usd == null ? null : Number(row.est_cost_usd),
    cal_per_dollar: row.cal_per_dollar == null ? null : Math.round(Number(row.cal_per_dollar)),
  };
  // Present only on a full-record fetch; the index selects neither.
  if (row.ingredients) {
    rec.servings = row.servings ?? "";
    rec.totalTime = row.total_time ?? "";
    rec.ingredients = row.ingredients ?? [];
    rec.steps = row.steps ?? [];
    rec.attribution = row.attribution ?? "";
    for (const k of ["protein_g", "carbs_g", "fat_g", "fiber_g", "sodium_mg"]) {
      if (row[k] != null) rec[k] = Number(row[k]);
    }
  }
  return rec;
}

/**
 * Every recipe, without its ingredients or steps.
 *
 * Async because it may cross the network. Callers that had this synchronously
 * before now await it once and hold the result — see LibraryRoom.
 */
export async function loadSourceIndex() {
  indexPromise ??= (async () => {
    const db = await getClient();
    if (db) {
      // The table is 466 rows and PostgREST defaults to a 1000-row ceiling, so
      // one request covers it. An explicit range keeps that true if the
      // project's default limit is ever lowered.
      const res = await withTimeout(
        db.from("source_library").select(INDEX_COLUMNS).order("title").range(0, 4999),
      );
      if (res && !res.error && res.data?.length) return res.data.map(fromRow);
      // Otherwise fall through to the bundled copy.
    }
    const { default: local } = await import("./sourceRecipes.index.js");
    return local;
  })();
  return indexPromise;
}

/** The full corpus from the bundled chunk. Only reached when Supabase cannot answer. */
async function loadLocalCorpus() {
  corpusPromise ??= import("./sourceRecipes.data.js").then((m) => m.default);
  return corpusPromise;
}

/**
 * Every full record. Prefer loadSourceRecipe() — this pulls the entire 1.2 MB
 * corpus and exists for the tests and the seeder, not for the UI.
 */
export async function loadSourceRecipes() {
  return loadLocalCorpus();
}

/** The one full record for `id`, ingredients and steps included. */
export async function loadSourceRecipe(id) {
  if (!id) return null;
  const db = await getClient();
  if (db) {
    const res = await withTimeout(
      db.from("source_library").select("*").eq("id", id).maybeSingle(),
    );
    if (res && !res.error) {
      // A null row means the id is genuinely gone from the library — a basket
      // entry for a removed recipe, say. Don't pull 1.2 MB to confirm that.
      return res.data ? fromRow(res.data) : null;
    }
  }
  const all = await loadLocalCorpus();
  return all.find((r) => r.id === id) ?? null;
}

/** Lookup an index entry by the slug id used in data/authored-steps.json. */
export async function sourceRecipeById(id) {
  if (!id) return null;
  const index = await loadSourceIndex();
  return index.find((r) => r.id === id) ?? null;
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Loose title match against an index, used to see whether a calendar meal
 * already has a real recipe in the library before we spend an API call
 * generating one. Returns an index entry — pass its id to loadSourceRecipe().
 *
 * Exported separately from findSourceRecipe so it stays synchronous and directly
 * testable against a fixed list.
 */
export function matchInIndex(index, mealName) {
  if (!mealName) return null;
  const target = norm(mealName);
  if (!target) return null;
  const exact = index.find((r) => norm(r.title) === target);
  if (exact) return exact;
  const words = target.split(" ").filter((w) => w.length > 3);
  if (!words.length) return null;
  // Overlap has to hold in BOTH directions. Scoring only the query's words
  // against the title lets a short query match a much longer title on its
  // opening words — "Peanut Butter Sandwich" scored 0.67 against "Peanut
  // Butter-Oatmeal Energy Bars" and would have served it for a calendar night.
  // Requiring the title's own words to be accounted for too rejects that.
  let best = null;
  let bestScore = 0;
  for (const r of index) {
    const hay = norm(`${r.title} ${r.subtitle ?? ""}`);
    const hayWords = hay.split(" ").filter((w) => w.length > 3);
    if (!hayWords.length) continue;
    const forward = words.filter((w) => hay.includes(w)).length / words.length;
    const back = hayWords.filter((w) => target.includes(w)).length / hayWords.length;
    const score = Math.min(forward, back);
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return bestScore >= 0.6 ? best : null;
}

/** matchInIndex against the live index. */
export async function findSourceRecipe(mealName) {
  if (!mealName) return null;
  return matchInIndex(await loadSourceIndex(), mealName);
}
