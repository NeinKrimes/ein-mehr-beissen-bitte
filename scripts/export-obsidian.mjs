// Obsidian export: mirror the Supabase `recipes` library into markdown notes.
//
// Writes one note per recipe into vault/recipes/ and one anchor note per chain
// into vault/anchors/ (with a Dataview block listing that chain's meals). The
// vault is a GENERATED MIRROR — both directories are wiped and rewritten on
// every run, so it's always safe to fully regenerate.
//
// Env: SUPABASE_URL (or VITE_SUPABASE_URL), a read key (SUPABASE_SERVICE_ROLE_KEY
// or VITE_SUPABASE_ANON_KEY). Run: npm run export:vault

import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { chains } from "../src/data/chains.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RECIPES_DIR = resolve(ROOT, "vault/recipes");
const ANCHORS_DIR = resolve(ROOT, "vault/anchors");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing env: need SUPABASE_URL (or VITE_SUPABASE_URL) and a read key " +
      "(SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY).",
  );
  process.exit(1);
}

// Filesystem- and wikilink-safe slug (anchors contain #, +, &, em-dashes).
function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Quote a scalar for YAML frontmatter.
function yaml(v) {
  if (v === null || v === undefined) return '""';
  if (typeof v === "number") return String(v);
  return `"${String(v).replace(/"/g, '\\"')}"`;
}

function recipeNote(row, anchorSlug) {
  const fm = [
    "---",
    `meal_id: ${yaml(row.meal_id)}`,
    `chain: ${yaml(row.chain_id)}`,
    `anchor: ${yaml(row.anchor)}`,
    `cuisine: ${yaml(row.cuisine)}`,
    `day: ${yaml(row.day)}`,
    `cost_tier: ${yaml(row.cost_tier)}`,
    `calories: ${yaml(row.calories)}`,
    `protein_g: ${yaml(row.protein_g)}`,
    `est_cost_usd: ${yaml(row.est_cost_usd)}`,
    `cal_per_dollar: ${yaml(row.cal_per_dollar)}`,
    `tags: [recipe, ${slug(row.cuisine)}]`,
    "---",
  ].join("\n");

  const ingredients = (row.ingredients ?? [])
    .map((i) => `- ${[i.amount, i.unit, i.item].filter(Boolean).join(" ")}`)
    .join("\n");
  const steps = (row.steps ?? [])
    .map((s) => `${s.n}. **${s.title}** — ${s.text}`)
    .join("\n");
  const tips = (row.frugal_tips ?? []).map((t) => `- 💰 ${t}`).join("\n");

  const body = [
    `# ${row.meal_name}`,
    "",
    row.description ?? "",
    "",
    `**Cuisine:** ${row.cuisine} · **Day:** ${row.day} · **Cost tier:** ${row.cost_tier ?? "—"}`,
    `**Anchor:** [[${anchorSlug}|${row.anchor}]]`,
    "",
    `**Per serving:** ${row.calories ?? "?"} cal · ${row.protein_g ?? "?"}g protein · ` +
      `$${row.est_cost_usd ?? "?"} · ${row.cal_per_dollar ? Math.round(row.cal_per_dollar) : "?"} cal/$`,
    "",
    `**Servings:** ${row.servings ?? "—"} · **Prep:** ${row.prep_time ?? "—"} · **Cook:** ${row.cook_time ?? "—"}`,
    row.passive_tip ? `\n> 💻 **WFH tip:** ${row.passive_tip}` : "",
    "",
    "## Ingredients",
    ingredients || "_none_",
    "",
    "## Method",
    steps || "_none_",
    tips ? `\n## Frugal tips\n${tips}` : "",
    row.leftovers_use ? `\n## Leftovers\n♻️ ${row.leftovers_use}` : "",
    "",
  ].join("\n");

  return `${fm}\n\n${body}`;
}

function anchorNote(chain) {
  const fm = [
    "---",
    `chain: ${yaml(chain.id)}`,
    `aliases: [${yaml(chain.anchor)}]`,
    "tags: [anchor]",
    "---",
  ].join("\n");

  // Dataview lists every seeded meal in this chain (recipe notes carry chain: <id>).
  const dataview =
    "```dataview\n" +
    'table cuisine as Cuisine, day as Day, est_cost_usd as "$/serv", cal_per_dollar as "cal/$"\n' +
    'from "recipes"\n' +
    `where chain = "${chain.id}"\n` +
    "sort day asc\n" +
    "```";

  const body = [
    `# ${chain.emoji} ${chain.anchor}`,
    "",
    `Anchor ingredient for chain \`${chain.id}\`. Passive cook: ${chain.passive}.`,
    "",
    "## Meals in this chain",
    dataview,
    "",
  ].join("\n");

  return `${fm}\n\n${body}`;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  const { data: rows, error } = await supabase
    .from("recipes")
    .select("*")
    .order("day", { ascending: true });
  if (error) {
    console.error("Failed to read recipes:", error.message);
    process.exit(1);
  }

  // Fully regenerate: wipe the generated dirs, then rewrite.
  await rm(RECIPES_DIR, { recursive: true, force: true });
  await rm(ANCHORS_DIR, { recursive: true, force: true });
  await mkdir(RECIPES_DIR, { recursive: true });
  await mkdir(ANCHORS_DIR, { recursive: true });

  // Anchor slug per chain id (from the authoritative chains data).
  const anchorSlugByChain = new Map(
    chains.map((c) => [c.id, slug(c.anchor)]),
  );

  let recipeCount = 0;
  for (const row of rows ?? []) {
    const anchorSlug = anchorSlugByChain.get(row.chain_id) ?? slug(row.anchor);
    await writeFile(
      resolve(RECIPES_DIR, `${row.meal_id}.md`),
      recipeNote(row, anchorSlug),
      "utf8",
    );
    recipeCount++;
  }

  for (const chain of chains) {
    await writeFile(
      resolve(ANCHORS_DIR, `${slug(chain.anchor)}.md`),
      anchorNote(chain),
      "utf8",
    );
  }

  console.log(
    `Exported ${recipeCount} recipe notes → vault/recipes/ and ${chains.length} anchor notes → vault/anchors/`,
  );
  if (recipeCount === 0) {
    console.log("(No recipes in the DB yet — run `npm run seed` first.)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
