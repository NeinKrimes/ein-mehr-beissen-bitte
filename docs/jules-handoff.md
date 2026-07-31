# Hand-off — tasks for Jules (Google's async coding agent)

Self-contained task briefs for [Jules](https://jules.google). Each task is scoped to
be **its own PR**: independent, verifiable, and small enough to review. Pick tasks in
priority order; nothing here depends on a task below it unless stated.

---

## Repo orientation (read first)

- **Stack:** React 18 + Vite, plain inline-style components (no Tailwind/CSS-modules).
  Node 22. `npm run dev` (port 5173), `npm run build`, `npm run lint` (ESLint 9 flat).
- **Backend is live** on Supabase project **EBBM2** (`unhwjxccbknojmllmdjx`):
  - `meal_library` table — all 30 core recipes (description, ingredients, steps, macros,
    `est_cost_usd`, generated `cal_per_dollar`). Public anon read; service-role write.
  - `recipe` edge function — Anthropic proxy (key server-side) for off-plan meals.
  - Client env in `.env.local` (gitignored): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
    You need a `.env.local` with those two to run against real data. **Never** put the
    service-role key in any `VITE_` var or the client bundle.
- **Data flow:** `src/data/chains.js` (source of truth for meals) → `src/hooks/useRecipe.js`
  (tiered loader: `meal_library` → localStorage → edge fn) → the views.
- **Deploy:** push to `master` → `.github/workflows/deploy-pages.yml` builds and publishes to
  GitHub Pages at `https://neinkrimes.github.io/ein-mehr-beissen-bitte/`. `vite.config.js`
  sets `base` from the `GITHUB_PAGES` env var; keep that intact.

### UI = the "cookbook after dark" design system (do not violate these)

Implemented from the Gloam design system. Tokens live in `src/theme.js`; primitives in
`src/components/Gloam.jsx`. The four rooms are `BoardView`, `CalendarView`, `ChainsView`,
`MyKitchen`, composed by `src/App.jsx`; `RecipePanel` is the detail overlay.

**Rules — every new UI element must obey these:**
1. **Gold `#e8a020` is raised once per view.** If two things are gold, one is wrong.
2. **Cuisine hue is only a dot, a hairline, or a wash under 8% — never a fill, never an icon.**
3. **No emoji, ever.** A dish is identified by its photograph slot + cuisine rule, not an icon.
   Allowed non-type marks: `·`, `◆`, `→`, `↓` only.
4. **Numbers are IBM Plex Mono (`T.mono`), unrounded for money** (`$2.35`, not `$2`).
5. **Fonts:** Instrument Serif (display, `T.display`), Newsreader (body, `T.body`),
   Space Grotesk (labels, `T.sans`), IBM Plex Mono (numbers, `T.mono`).
6. **Motion:** `cubic-bezier(.22,.61,.36,1)`; nothing snaps; honor `prefers-reduced-motion`
   (it keeps final state). Detail opens on click, never on hover.

**Definition of done for every task:** `npm run lint` and `npm run build` both pass; you
ran the app and confirmed the change renders with no console errors; no design rule above
is broken; the diff is limited to the task's scope.

---

## Priority 1 — quick, isolated

### T1. Restyle the shopping-list modal to the cookbook design
`src/components/ShoppingList.jsx` still uses the pre-redesign styling (old colors, no
gloam tokens/fonts). Bring it in line with `RecipePanel`.
- **Files:** `src/components/ShoppingList.jsx` only.
- **Do:** import `T` from `../theme`; use `T.mono` for quantities, `T.body`/`T.display` for
  text, hairline `T.line` dividers, `T.surface` panels, gold used once (the header or a
  single action). Present ingredients as dotted-leader rows (`.leader`/`.leader-fill`,
  already in `GlobalStyle.jsx`): `ingredient …… quantity`. Modal on a plum veil like
  `RecipePanel` (`backdrop-filter: blur(18px)`).
- **Done when:** the modal is visually consistent with the recipe page; aggregation logic
  is unchanged; opens from the nav "Shopping list →" and My Kitchen.

### T2. Lock the edge-function CORS to the deployed origin
Currently `Access-Control-Allow-Origin: *`.
- **Files:** `supabase/functions/recipe/index.ts` (`corsHeaders`).
- **Do:** set the allowed origin to `https://neinkrimes.github.io` (keep `*` only for local
  dev via an allow-list of `[deployed, http://localhost:5173]` if you want dev to keep
  working). Redeploy is a maintainer step (`supabase functions deploy recipe`), so just note
  it in the PR body — **do not** deploy.
- **Done when:** the function still returns JSON for an allowed origin; PR body documents the
  deploy command.

## Priority 2 — responsive & accessibility

### T3. Mobile / narrow-viewport pass for the editorial layouts
The two-column spreads don't collapse on small screens. Every fixed 2-col grid needs a
single-column fallback.
- **Files:** `GlobalStyle.jsx` (add responsive rules) + inline grids in `ChainsView.jsx`
  (`0.9fr 1fr` spread), `CalendarView.jsx` (`1fr 300px` list+rail), `MyKitchen.jsx`
  (`1fr 1fr` highlights), `RecipePanel.jsx` (full-width sheet under ~640px), `Nav.jsx` (wrap).
- **Approach:** prefer CSS classes with `@media (max-width: 820px)` in `GlobalStyle.jsx` over
  inline media queries (inline styles can't do media queries). Add class hooks to the grids.
- **Done when:** at 375px, 768px and 1280px widths nothing overflows horizontally, the recipe
  sheet is full-width on mobile, and the calendar rail stacks under the contents list.

### T4. Accessibility audit
- Give every photo-slot (`Plate`, board plates) a meaningful `aria-label` / `role="img"`.
- Ensure all clickable cards/rows are real buttons or have `role="button"` + `tabIndex={0}`
  + Enter/Space handlers (most already do — verify and fill gaps).
- Check color contrast of `T.ink2`/`T.ink3` on `T.surface`; bump where it fails WCAG AA for
  body text.
- Trap focus in the `RecipePanel` overlay and restore focus on close; close on `Esc`.
- **Done when:** keyboard-only navigation can reach and open every meal and close the overlay;
  no element relies on color alone.

## Priority 3 — features

### T5. Light theme ("daylight prep, same bones")
The design ships a light palette: `paper #f6efe2 · ink #2b2317 · gold #b06f0c · green #138a56
· amber #b8571b`. Add a theme toggle.
- **Do:** convert `src/theme.js` colors into CSS custom properties on `:root` (+ a
  `:root[data-theme="light"]` block) and reference `var(--…)` from components, OR add a
  `THEMES` map and thread the active theme via React context. Persist choice to localStorage.
  Keep gold-used-once and all rules intact in both themes.
- **Done when:** a control in the masthead switches themes, the choice persists, and both
  themes pass the design rules and contrast.

### T6. Wire palate preferences into generation + My Kitchen
`src/hooks/usePalate.js` and `src/components/PaletteQuestionnaire.jsx` exist but aren't
surfaced. The `user_preference_palate` table already exists on EBBM2.
- **Do:** add a palate section to **My Kitchen** that opens the questionnaire; pass the palate
  into `useRecipe.loadRecipe(...)` (it already accepts a `palate` arg → `toPalatePrompt`) so
  off-plan generations respect excludes/likes. Gate DB sync behind auth (see T7) or keep it
  localStorage-only for now.
- **Done when:** setting a hard-exclude protein visibly changes a freshly generated recipe.

### T7. Community board backend (the biggest task — split if needed)
Turn the read-first Board into a real one. `user_recipes` / `recipe_edits` already exist as a
foundation.
- **Schema (new migration under `supabase/migrations/`):** `profiles` (handle, avatar),
  `cook_posts` (id, meal_id, author_id, photo_path, caption, cuisine, created_at),
  `saves` (user_id, post_id). RLS: public read, authenticated write-own.
- **Storage:** a `cooks/` bucket, public-read + authenticated write.
- **Auth:** Supabase Auth (magic link or OAuth). Add sign-in UI.
- **Client:** replace the placeholder plates in `BoardView.jsx` with real `cook_posts`
  (fall back to the labelled `Plate` slot when a post has no photo yet); make Save write to
  `saves`. Keep round photographs, plate captions, no icons.
- **Done when:** a signed-in user can post a photo of a meal and it appears on the Board for
  everyone; save persists server-side. **Ship in sub-PRs:** (a) schema+storage, (b) auth+profile,
  (c) posting, (d) saves — don't land it all at once.

### T8. Add cuisine chains
Add Vietnamese, Ethiopian, Japanese, and Greek anchor chains to `src/data/chains.js` following
the existing shape (anchor → 3–4 follow-on meals across cuisines, WFH/passive-friendly).
- **After adding:** the library must be reseeded (maintainer runs `npm run seed` with
  `ANTHROPIC_API_KEY` + service-role key, or the seed GitHub Action). Note this in the PR body;
  don't seed yourself. Add the new cuisines to `CUISINE_META` in `src/theme.js` with a hue.
- **Done when:** the new chains render in Chains/Calendar; unseeded meals fall back to on-demand
  generation without error.

---

## Notes for Jules

- Keep PRs small and single-purpose; reference the task id (e.g. "T3") in the PR title.
- Match the existing code style: functional components, inline styles referencing `T`, small
  focused components. Reuse `Gloam.jsx` primitives and `DataChip`/`MacroDonut`/`ValueGauge`.
- If a task needs the live DB and you don't have `.env.local`, say so in the PR — the app still
  builds and lints without it (it just can't fetch data at runtime).
- Full design reference: the Claude Design project "Ein Mehr Beissen Bitte UI Design" and
  `docs/claude-design-brief.md`.
