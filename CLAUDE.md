# CLAUDE.md — Ein Mehr Beissen Bitte

This file briefs Claude Code on the project so it can hit the ground running.

## What This Project Is

A React web app — a 30-day world cuisine meal calendar built around "anchor ingredients."
Each anchor (whole chicken, pork shoulder, dried beans, etc.) chains into 3–4 follow-up
meals across different world cuisines. All slow cooks are passive/WFH-friendly.
Recipes are generated on demand via the Anthropic API.

## Commands

```bash
npm run dev          # Start Vite dev server on port 5173
npm run build        # Production build to /dist
npm run preview      # Preview production build
npm run lint         # ESLint
npm run seed         # Idempotent batch recipe seeder via Message Batches API
npm run export:vault # Export recipes from Supabase to vault/ as Obsidian notes
```

## Tech Stack

- React 18 with hooks
- Vite
- Plain CSS-in-JS (inline styles, no Tailwind/CSS modules, tokens in `src/theme.js`)
- Anthropic API for recipe generation (`claude-sonnet-5`), proxied through a Supabase Edge Function so the API key stays server-side (never in the client bundle)
- Supabase (Postgres recipe library + Edge Functions)

## Architecture

- `src/App.jsx` — Entry shell and room navigator; preloads/primes the recipe library
- `src/data/chains.js` — Single source of truth for 30-day calendar structure (exports `chains`, `mealId`, `enumerateMeals`)
- `src/data/mealStats.js` — Baseline derived nutrition/cost stats (exports `MEALS`, `LENSES`, `mealByDay`)
- `src/hooks/useRecipe.js` — Tiered recipe loader (Supabase `meal_library` → localStorage → API fallback)
- `src/hooks/useCooked.js` — Progress tracker ("mark as cooked"), persisted in localStorage
- `src/components/` — Room-based UI ("cookbook after dark" redesign):
  - `BoardRoom.jsx` (Community plates/photos), `CalendarRoom.jsx` (Dotted leaders, lens toggle, detail rail), `ChainsRoom.jsx` (Anchor & follow-up spreads), `KitchenRoom.jsx` (Month ledger, saved plates, shopping list link)
  - `RecipePage.jsx` (Recipe detail overlay sheet), `ShoppingList.jsx` (Dotted-leader ingredient list)
- **Wiring status:** `useRecipe` and `ShoppingList` are fully wired to `App.jsx`. `usePalate` and `PaletteQuestionnaire` exist but are currently **unwired** (planned T6).
- **Database & Scripts:** `supabase/migrations/` defines schema. `scripts/seed-recipes.mjs` runs batch seeding. `scripts/export-obsidian.mjs` exports vault.
- **GitHub Workflows:** `ci.yml` (lint/build), `claude.yml` (agent background), `deploy-pages.yml` (pages deploy), `export-obsidian.yml` (obsidian export), `seed-recipes.yml` (recipe seeding).

> ⚠️ **NAMING TRAP:** The DB table is **`meal_library`**, NOT `recipes`. The project database has an unrelated, normalized `recipes` table. DB operations must only read/write `meal_library` (all core 30 recipes are pre-seeded here).

## Design System

Dark theme ("cookbook after dark"). Tokens in `src/theme.js`. Colors:
- Background: `#0c0c0f` (`COLORS.ground`)
- Card: `#15151b` (`COLORS.page` / `pageAlt`)
- Accent/gold: `#e8a020` (`COLORS.gold`) — raised at most once per view
- Text: `#ece3d2` (`COLORS.parchment`)
- Muted: `#a29a8b` (`COLORS.muted`)
- Cuisines: Specific hues (see `CUISINE_COLORS` in `src/theme.js`) only used as a dot/hairline/wash — never a fill or icon

Fonts (Google, loaded in `index.html`): Instrument Serif (display), Newsreader (body), Space Grotesk (labels), IBM Plex Mono (numbers/every number). Replaced Palatino stack.

## Data Shape

Each "chain" looks like:
```js
{
  id: "c1",
  anchor: "Whole Roast Chicken + Stock",
  emoji: "🐔",
  passive: "~2 hrs roast + 8 hrs stock (overnight)",
  days: [
    { day: 1, dow: "Sun", cuisine: "French", type: "ANCHOR", meal: "Poulet Roti with Herbed Butter", cost: "$$" },
    { day: 2, dow: "Mon", cuisine: "Mexican", type: "CHAIN",  meal: "Chicken Tinga Tacos", cost: "$" },
    ...
  ]
}
```

## Recipe API Response Shape

The Anthropic API is prompted to return JSON:
```json
{
  "description": "...",
  "servings": "4",
  "prepTime": "15 min",
  "cookTime": "45 min",
  "passiveTip": "...",
  "ingredients": [{ "amount": "2", "unit": "lbs", "item": "chicken thighs" }],
  "steps": [{ "n": 1, "title": "Short title", "text": "Full instruction." }],
  "frugalTips": ["tip 1", "tip 2"],
  "leftoversUse": "...",
  "calories": 540,
  "protein_g": 32,
  "carbs_g": 48,
  "fat_g": 22,
  "est_cost_usd": 2.10
}
```
*Note: The Postgres `meal_library` table stores these fields, plus a generated column: `cal_per_dollar` numeric generated always as `(calories / nullif(est_cost_usd, 0))` stored.*

## Conventions

- Functional components only, no class components
- useState / useEffect / useCallback / useRef hooks
- Inline styles throughout (matches existing codebase, using `src/theme.js` style factories like `display`, `label`, `mono`, `parch`)
- Keep components focused — one responsibility each
- No external UI libraries
- Frugal cooking context should inform all AI prompts

## Planned Features (good first issues)

- [ ] Wire palate preferences (`usePalate` and `PaletteQuestionnaire`) into generation + My Kitchen (T6)
- [ ] Mobile responsive layout improvements (T3)
- [ ] Community board backend with profiles and posts (T7)
- [ ] Add more cuisine chains (Vietnamese, Ethiopian, Japanese, Greek) (T8)

## Notes

- The project name "Ein Mehr Beissen Bitte" is German/English — means "one more bite please"
- Part of the NEINKRIMES GitHub organization
- Companion projects in the org: angular-aphorisms, silentsounder
