# Ein Mehr Beissen Bitte

A React/Vite web app: a 30-day world-cuisine, WFH-friendly meal calendar built around
"anchor ingredients" (whole chicken, pork shoulder, dried beans...). Each anchor chains
into 3–4 follow-up meals across cuisines; all slow cooks are passive. Recipes are generated
on demand via the Anthropic API, proxied server-side. Name is German/English for "one more
bite please." Part of the NEINKRIMES org (siblings: angular-aphorisms, silentsounder).

## Architecture map
<!-- Read THIS instead of grepping to rediscover structure. Load-bearing paths only. -->

- **Entry points:** `index.html` → `src/main.jsx` (React root) → `src/App.jsx` (the whole UI).
- **Core files:**
  - `src/App.jsx` — everything: `CUISINE_META`, the inline `chains` meal data (single source
    of truth), calendar grid, recipe detail panel. Calls `callClaude` directly for generation.
  - `src/lib/claude.js` — `callClaude(prompt)`; invokes the Supabase `recipe` Edge Function,
    strips ```json fences, returns parsed recipe JSON. Never hits Anthropic directly.
  - `src/lib/supabase.js` — Supabase client from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
  - `src/hooks/useRecipe.js` — tiered loader (Supabase library → localStorage → AI) + caching.
  - `src/hooks/usePalate.js` — user palate/preferences (localStorage + Supabase); `toPalatePrompt()`
    serializes prefs into a prompt fragment (hard blocks, soft dislikes, likes, skill, time).
  - `src/components/PaletteQuestionnaire.jsx` — palate onboarding UI, backed by `usePalate`.
  - `supabase/functions/recipe/index.ts` — Deno Edge Function; proxies Anthropic with the
    server-side `ANTHROPIC_API_KEY` secret. Default model `claude-sonnet-5`; see
    `supabase/functions/README.md` to deploy.
- **Data flow:** UI event → `callClaude(prompt)` → `supabase.functions.invoke("recipe")` →
  Edge Function → Anthropic → JSON recipe back. (`useRecipe`/`usePalate`/`PaletteQuestionnaire`
  are richer machinery not yet wired into `App.jsx`.)
- **Where NOT to look:** `node_modules/`, `dist/`, `.git/`, `supabase/.temp/`, the vendored `.zip`.

## Data shapes
- **Chain:** `{ id, anchor, emoji, passive, days: [{ day, dow, cuisine, type: "ANCHOR"|"CHAIN", meal, cost }] }`.
- **Recipe JSON (from the API):** `{ description, servings, prepTime, cookTime, passiveTip,
  ingredients: [{amount, unit, item}], steps: [{n, title, text}], frugalTips: [...], leftoversUse }`.

## Conventions
- Functional components + hooks only (`useState`/`useEffect`); no class components.
- Inline CSS-in-JS styles throughout — no Tailwind, CSS modules, or external UI libraries.
- Dark theme: bg `#0c0c0f`, card `#131318`, gold accent `#e8a020`, text `#e0d8c8`, muted `#666`;
  per-cuisine colors live in `CUISINE_META` (`src/App.jsx`). Font: Palatino Linotype / serif — deliberate.
- Keep components single-responsibility. Frugal-cooking context should inform all AI prompts.
- Anthropic key stays server-side (Edge Function secret) — never in the client bundle.

## Deeper context lives in the vault
Curated, durable knowledge lives in the Obsidian vault under `vault/` (architecture deep-dives,
per-module notes, decisions/ADRs, known gotchas). When a task touches an area, open the matching
note **before** reading source. (Scaffold the vault when the project starts accruing such notes.)

## Bash commands
```bash
npm run dev        # Vite dev server on port 5173
npm run build      # production build → /dist
npm run preview    # preview the production build
npm run lint       # eslint src --ext .js,.jsx
```
Prefer `rg` over `grep`, `fd` over `find`, `jq` for JSON, `gh` for GitHub. Typecheck-free
project (plain JS/JSX). Supabase functions are Deno/TypeScript — deploy via `supabase` CLI.

## Working agreement (token discipline)
- Use the map above (and the vault) before searching; only grep/open files when it can't answer.
- When I name a file or symbol, start there — don't re-scan the tree to "confirm" it.
- Prefer signatures over full bodies for supporting files; read a whole file only to edit it.
- Do side investigations in a subagent so this conversation's context stays lean.
- End-of-task: if you learned something durable, propose a short vault note (or a CLAUDE.md edit
  if a structural fact changed) so we don't re-derive it next session.

## Do NOT
- Don't edit this file mid-task — it breaks the prompt cache. Edit between tasks.
- Don't put the Anthropic API key in client code or commit `.env` / `.env.local`.
- Don't add Tailwind, CSS modules, or UI libraries — match the inline-style convention.
- Don't reformat or mass-rename outside the task's scope.
