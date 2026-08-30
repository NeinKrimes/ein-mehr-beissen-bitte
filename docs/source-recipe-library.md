# The source recipe library

A library of real, tested recipes adapted from the *Cuisine at Home* issues on
the project's shelf. It is **not** the calendar — `chains.js` still owns the 46
nights and is untouched. The library is a pool the app can draw on, and a
fallback that saves an API call when a calendar meal happens to match one.

## Two-stage pipeline

```
source PDFs (local, not in the repo)
  │
  │  stage 1 — RECIPE_PDF_DIR=~/recipes python3 scripts/extract-source-recipes.py
  ▼
data/source-recipes.raw.json        ← GITIGNORED. holds the publisher's prose.
  │
  │  + data/authored-steps.json     ← COMMITTED. our own rewritten method.
  │
  │  stage 2 — npm run build:recipes
  ▼
src/data/sourceRecipes.js           ← COMMITTED, generated. the index.
src/data/sourceRecipes.data.js      ← COMMITTED, generated. the full records.
```

Both generated files are written by the same build — never hand-edit either.

### Why it splits that way

A list of ingredients is a statement of fact and carries no copyright, so
quantities, units, yields and the printed per-serving nutrition come through
**verbatim**. The method prose is authored work, so none of it is committed:
`data/source-recipes.raw.json` is gitignored, and the build refuses to emit any
recipe that does not have hand-written steps in `data/authored-steps.json`.
`sourceRecipes.test.js` asserts that no extractor field (`sourceSteps`,
`sourceText`, `lead`, `page`) ever reaches the bundle.

## Stage 1: reading the typography, not the word order

The naive approach — find "Makes 4 servings", read forward to "Per serving:" —
gets the title wrong **34%** of the time, because the magazine's two-column
layout puts a recipe's nutrition footer next to its *neighbour's* title in the
PDF content stream.

The fix is that the magazine sets every element in a distinct style, so the
layout already encodes the schema:

| Style | Element |
| --- | --- |
| 12.0pt, red or bold | recipe title (a second line continues it; a lowercase line is the subtitle) |
| 9.0pt bold | the lead-in that opens each method step |
| 9.3pt regular | ingredient lines |
| 9.0pt regular | method body |
| 8.0pt | `Makes N servings` / `Total time:` |
| 6.0pt | `Per serving:` nutrition footer |
| 8.8pt semibold | photo caption / sidebar tip — dropped |
| 9.0pt italic | headnote prose — dropped |

Reading spans instead of text took the title error rate from 34% to **3%**.

Three template variants exist across the nine issues and the parser handles all
of them: issue 125 uses a red one hex digit off (`c4161c`), the C-series sets
step lead-ins in black bold, and C1801 has no accent colour at all. So the
parser keys on **weight and size**, and treats red as a channel range rather
than an exact value.

Other things the layout forces:

- A row is assembled left-to-right from separate PDF line objects — the quantity
  (`3`) and its text (`Tbsp. tamari`) are different lines at the same `y`.
- Stacked fractions are three fragments at slightly different `y` (`1`, `/`,
  `4`), so `y` is snapped into rows before sorting, or they read `1 / 4` after
  the text instead of before it.
- A wrapped ingredient (`shiitake mushrooms,` / `stemmed`) has to be told apart
  from a genuinely new unquantified one (`Salt and black pepper`). Indentation
  plus a lowercase first letter distinguishes them.
- The nutrition footer wraps over two or three lines, so the recipe closes on
  the *next* element, not on the first footer line — otherwise protein and carbs
  are lost.

Current yield: **506 recipes**, 454 with calories and 453 with the full
macro set.

## Stage 2: the authored steps

`data/authored-steps.json` maps a recipe id to our own method, and optionally
overrides the cuisine (the extractor's keyword guesser is only a hint — it had
Pork Phở down as Mexican and Jamaican Jerk Pork as Mexican).

```json
"coq-au-vin-stew": {
  "cuisine": "French",
  "steps": [
    { "title": "Shake and brown", "text": "Shake the flour, salt and pepper..." }
  ]
}
```

Technical facts inside a step — temperatures, times, pan sizes, quantities —
are facts and stay accurate. The phrasing is ours.

**Status: 113 of 506 authored.** The pipeline is complete and the remaining 393
are extracted and waiting; each new tranche is a matter of adding ids to
`authored-steps.json` and re-running `npm run build:recipes`.

### Checking a tranche

`scripts/check-authored-steps.py` compares each authored step against the source
method for the same recipe and reports the longest run of consecutive words they
share. Ingredient names and standard technique vocabulary are stripped first —
"in a large sauté pan over medium-high" is the only way to say that, and an
ingredient list is a fact — so what it measures is shared *sentence structure*,
which is the thing that must not survive the rewrite. A run of six or more is
worth looking at; a run of ten is a copied clause.

It is a review aid, not a gate: a handful of six-word technique sequences
survive in the corpus because rewriting them further would only make the
instruction worse.

A recipe the extractor mangled beyond repair — steps out of order, or a method
that defers to a crust recipe on a page we never scanned — goes under
`_skipped` with a reason, so it stops resurfacing at the top of the ranking.

Recipes were prioritised by fit with the project's thesis — passive cooking,
frugal cuts, world cuisines — which is what surfaced pot roasts, bean soups,
daube, feijoada, caldo verde and lamb shanks ahead of the desserts.

## How the app uses it

`useRecipe` gained a tier:

1. Supabase `meal_library`
2. localStorage
3. **the source library**, matched on meal name via `findSourceRecipe()`
4. Edge Function generation

Tier 3 is canonical (palate-independent), so like tier 1 it is skipped when the
user has active palate preferences. `findSourceRecipe` needs a 60% word overlap
before it will claim a match — a false positive would serve the wrong recipe for
a calendar night, so it returns `null` rather than guess.

### Why it is split in two

`sourceRecipes.js` holds only an index — id, title, subtitle, cuisine, calories,
cost. It is small enough to import eagerly, and it is all `findSourceRecipe`
needs to answer *is this meal in the library?*. The ingredients and steps live in
`sourceRecipes.data.js`, which is only ever reached through
`await import(...)` inside `loadSourceRecipe()`, so Vite gives it its own chunk
and a tier-3 **miss** downloads nothing at all.

At 113 recipes: 428 kB entry (124 kB gzip) + a 262 kB corpus chunk (60 kB gzip)
that most sessions never fetch.

## Known follow-ups

- **Index size.** The corpus itself is now a lazy chunk, but the index still
  grows linearly — roughly 0.2 KB per recipe, so all 506 would put ~100 KB back
  in the entry bundle. If the library gets that far, the index belongs in
  Supabase with a search endpoint rather than in the client.
- **No UI yet.** Nothing browses the library; it is only reachable as the
  `useRecipe` fallback. A library room is the natural next step.
- **`est_cost_usd` is derived**, not printed in the source — it is estimated
  from ingredient count and protein load, and is good enough to sort and filter
  by, not to promise a price.
- Roughly 2 of 506 titles are still junk (a stray "Cuisine Lite Sauce Savings").
  They are caught when a recipe is authored, so they never reach the bundle.
