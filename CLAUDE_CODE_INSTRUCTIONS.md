# Claude Code Implementation Brief — Ein Mehr Beissen Bitte

Hand these prompts to Claude Code **one at a time**, from inside the repo
(`~/projects/NEINKRIMES/ein-mehr-beissen-bitte`). Review each diff, run the app,
commit, then move to the next. They're ordered so each builds on the last.

Prereqs Claude Code should confirm before starting:
- Supabase CLI installed and linked (`supabase link`), or access to the SQL editor.
- Secrets available: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- The existing files it will touch: `src/data/chains.js`, `src/hooks/useRecipe.js`,
  `src/lib/claude.js`, `supabase/functions/recipe/`, `src/components/*`.

The guiding principle for all of this: **the 30-day meal set is finite and known.
Generate every recipe once, store it in Supabase, read from the DB thereafter.
On-demand Claude generation is the fallback path, not the default.**

---

## Prompt 1 — Nutrition-aware Supabase schema

> Create a Supabase migration that adds a `recipes` table (or alters it if it exists)
> to be the recipe library. It must store the full recipe plus nutrition and cost.
>
> Columns:
> - `id` uuid primary key default gen_random_uuid()
> - `meal_id` text unique not null — stable key derived from chains.js, format `"<chainId>-d<day>"` (e.g. `c1-d2`)
> - `chain_id` text, `day` int, `cuisine` text, `anchor` text, `meal_name` text, `cost_tier` text
> - `content_hash` text not null — hash of the meal definition + prompt version; drives idempotent reseeding
> - `description` text, `servings` int, `prep_time` text, `cook_time` text, `passive_tip` text
> - `ingredients` jsonb, `steps` jsonb, `frugal_tips` jsonb, `leftovers_use` text
> - `calories` int, `protein_g` int, `carbs_g` int, `fat_g` int, `est_cost_usd` numeric
> - `cal_per_dollar` numeric GENERATED ALWAYS AS (calories / NULLIF(est_cost_usd, 0)) STORED
> - `created_at` timestamptz default now(), `updated_at` timestamptz default now()
>
> Add an index on `meal_id` and on `content_hash`. Add an `updated_at` trigger.
> Enable RLS; add a policy allowing public `select` (recipes are non-sensitive), and
> restrict `insert`/`update` to the service role only. Put the migration in
> `supabase/migrations/` and show me the SQL.

---

## Prompt 2 — Extend the recipe prompt to return nutrition

> In `supabase/functions/recipe/` (the Edge Function that proxies Anthropic), update
> the prompt so the model also returns nutrition and cost fields. The JSON response
> shape must become:
>
> ```json
> {
>   "description": "...", "servings": "4", "prepTime": "15 min", "cookTime": "45 min",
>   "passiveTip": "...",
>   "ingredients": [{ "amount": "2", "unit": "lbs", "item": "chicken thighs" }],
>   "steps": [{ "n": 1, "title": "...", "text": "..." }],
>   "frugalTips": ["..."], "leftoversUse": "...",
>   "calories": 540, "protein_g": 32, "carbs_g": 48, "fat_g": 22, "est_cost_usd": 2.10
> }
> ```
>
> `calories` and macros are PER SERVING; `est_cost_usd` is estimated cost per serving
> using typical US grocery prices, in a frugal-cooking context. Keep the existing
> frugal / WFH / anchor-chaining framing. Extract the shared system prompt into a
> constant so it can be reused (next step needs it). Don't change the Anthropic model.

---

## Prompt 3 — Idempotent seed script (Batch API + prompt caching)

> Create `scripts/seed-recipes.mjs`, a Node script that fills the Supabase `recipes`
> table for every meal in `src/data/chains.js`. This is the mechanism that both fills
> the DB and eliminates token cost. Requirements:
>
> 1. **Enumerate** every meal across all chains → build a `meal_id` (`<chainId>-d<day>`)
>    and a `content_hash` (sha256 of the meal fields + a `PROMPT_VERSION` constant).
> 2. **Skip unchanged rows**: query existing `(meal_id, content_hash)` from Supabase;
>    only generate meals that are missing or whose hash changed. Log how many are skipped.
> 3. **Use the Message Batches API** (`/v1/messages/batches`) — submit all needed meals
>    in one batch (this is ~50% cheaper and latency doesn't matter here). Poll until the
>    batch completes, then collect results.
> 4. **Prompt caching**: put the shared system prompt (reuse the constant from the Edge
>    Function) in a system block with `cache_control: { type: "ephemeral" }` so it's paid
>    for once, not per recipe. Per-meal specifics go in the user message.
> 5. Generate with **claude-sonnet-4** for quality (one-time cost).
> 6. Parse each JSON result and **upsert** into `recipes` (on conflict `meal_id` do update),
>    writing all fields including nutrition + `content_hash`.
> 7. Use `SUPABASE_SERVICE_ROLE_KEY` (server-side) and read secrets from env. Make it
>    safely re-runnable. Add an `npm run seed` script to package.json.
>
> Print a summary at the end: generated / skipped / failed counts.

---

## Prompt 4 — App reads DB-first, generation is fallback only

> Update `src/hooks/useRecipe.js` so the recipe loading tiers are:
> 1. **Supabase `recipes` table by `meal_id`** (primary — should hit for all 30 core meals)
> 2. in-memory / localStorage cache
> 3. on-demand Edge Function generation (fallback ONLY — for meals not in the DB)
>
> When the fallback path generates a recipe, **persist it back to Supabase** so it's
> free next time. Make sure components pass a stable `meal_id` (`<chainId>-d<day>`) down
> to the hook. Confirm the app renders all 30 days with zero Anthropic calls once the
> DB is seeded (check the network tab / Edge Function logs).

---

## Prompt 5 — Frugal-core UI: cost & calories

> Two changes surfacing the data we now store:
> 1. On each meal card in `src/components/RecipeCalendar.jsx` (and the detail panel
>    `RecipePanel.jsx`), display **cost-per-serving** and **calories-per-dollar**
>    (`cal_per_dollar`) as small badges, styled to match the dark/gold design system.
> 2. Add a **weekly shopping list**: aggregate `ingredients` across each 7-day span,
>    combining like items and summing amounts where units match, with an estimated total
>    cost. New component `ShoppingList.jsx`, reachable from the calendar. Keep inline
>    styles, functional components, no new UI libraries.

---

## Prompt 6 — Obsidian export (DB → markdown mirror)

> Create `scripts/export-obsidian.mjs` that reads all rows from the Supabase `recipes`
> table and writes one markdown note per recipe into `vault/recipes/`. Each note has
> YAML frontmatter (`meal_id`, `chain`, `anchor`, `cuisine`, `day`, `cost_tier`,
> `calories`, `protein_g`, `est_cost_usd`, `cal_per_dollar`, `tags`) and a body with the
> recipe. Link each meal back to its anchor as `[[<anchor>]]`, and generate one anchor
> note per chain that Dataview can list its meals under. The vault is a **generated
> mirror** — the script should be safe to fully regenerate. Add `npm run export:vault`.

---

## Prompt 7 — GitHub Actions

> Add three workflows under `.github/workflows/`:
> 1. `ci.yml` — on pull_request: `npm ci`, `npm run lint`, `npm run build`.
> 2. `seed-recipes.yml` — `workflow_dispatch` + weekly schedule: runs `npm run seed`
>    using repo secrets `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
>    Because the seed is idempotent, this just backfills missing/changed recipes.
> 3. `export-obsidian.yml` — nightly (after seed): runs `npm run export:vault` and commits
>    changes to the vault folder/repo. Use a PAT or GITHUB_TOKEN with commit rights.
>
> List every secret each workflow needs so I can add them in repo settings.

---

## Optional — Claude GitHub Action for new chains

> Install Anthropic's official Claude GitHub Action so I can `@claude` an issue like
> "add a Vietnamese chain off a whole chicken" and get a PR that (a) adds the chain to
> `src/data/chains.js` in the existing shape and (b) notes that `npm run seed` will fill
> the new meals. Follow the current setup docs for the action and add the required
> `ANTHROPIC_API_KEY` secret.

---

## Commit / verification checklist (tell Claude Code to follow per prompt)

- Run `npm run lint` and `npm run build` after each change.
- After Prompt 3, verify rows exist in Supabase and re-running `npm run seed` reports
  everything skipped (proves idempotency).
- After Prompt 4, load the app and confirm **no Anthropic calls** fire for the 30 core days.
- Keep commits small and scoped to one prompt each.
