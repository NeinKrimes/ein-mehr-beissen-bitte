# Claude Design — Build Brief

**Paste the block below into Claude Design (or any generative design tool) to produce
a high-fidelity redesign of _Ein Mehr Beissen Bitte_.** It is written to stand alone —
it carries the full context, identity, data, and the three headline concepts so the
tool doesn't need the codebase. Companion visual reference: the published
[UI Design Direction](https://claude.ai/code/artifact/33148228-ecdf-4c9a-884d-876fd0807a63).

---

## The prompt

> **Design a high-fidelity UI for a web app called _Ein Mehr Beissen Bitte_ ("one more
> bite, please") — a 30-day world-cuisine, frugal, work-from-home meal calendar built
> around "anchor ingredients."** One anchor (a whole roast chicken, a pork shoulder, a
> pot of dried beans) is cooked once and _chains_ into 3–4 follow-on meals across
> different cuisines. All slow-cooks are passive / WFH-friendly. Every meal already has
> real data: calories, protein/carbs/fat, cost-per-serving, and a `cal/$` value score.
>
> **Keep and extend this visual identity — do NOT restyle it into a generic look:**
> - **Mood:** "kitchen at night." Dark, warm, deliberate — not a bright SaaS dashboard.
> - **Palette (dark, primary):** ground `#0c0c0f`, surfaces `#16161d` / `#1d1d26`,
>   hairline `#26262f`, parchment text `#ece3d2`. **Single accent: gold `#e8a020`.**
>   Two semantic colors only — frugal/value green `#46d18a`, calorie amber `#ff9d3c`.
> - **Cuisine palette (categorical, for identity + data encoding, never UI chrome):**
>   Mexican `#e84040`, Italian `#4a9eff`, Indian `#ff9500`, French `#a78bfa`,
>   Jamaican `#22c55e`, Thai `#f472b6`, Chinese `#facc15`, American `#94a3b8`.
> - **Type:** a warm **serif** (Palatino / Book Antiqua / Georgia stack) for everything
>   human — dish names, descriptions, headings — paired with a **monospace** for
>   everything measured (calories, `cal/$`, cost). Numbers use tabular figures.
> - Support a considered **light theme** too (warm oatmeal paper, not cream cliché),
>   but design the dark theme as the primary.
>
> **Three concepts to design (these are the point of the redesign):**
>
> 1. **The anchor chain, made visible.** Render each anchor as a vertical **spine**: the
>    anchor is the trunk; each day branches off, tinted by its cuisine, carrying the
>    dish name and an inline `cal/$` read. Hover lifts and tints a branch; tapping opens
>    the recipe while keeping the spine in view. Branches animate in sequentially to
>    trace the anchor → follow-on flow. _Example chain to mock up (real data):_
>    **🐔 Whole Roast Chicken + Stock** → Day 1 French _Poulet Roti_ (520 kcal, $2.35,
>    221 cal/$) · Day 2 Mexican _Chicken Tinga Tacos_ (410, $2.05, 200) · Day 3 Thai
>    _Khao Soi_ (560, $2.45, 229) · Day 4 Indian _Chicken Stock Dal_ (380, $1.35, 281).
>
> 2. **The data lens.** A segmented toggle — **Value / Calories / Protein / Time** — that
>    recolors and re-sorts the whole calendar. Design the read-outs: a **macro donut**
>    (stacked protein/carb/fat, kcal in the center), a **value gauge** placing a meal on
>    the plan's 200→644 `cal/$` range, and a **comparison bar list**. Data should animate
>    to fill on reveal so magnitude is felt. _Real "best value" data:_ Homemade Bagels
>    644 cal/$, Frijoles de la Olla 473, Congee 341, Spaghetti al Pomodoro 335,
>    Jamaican Rice & Peas 304.
>
> 3. **A Pinterest-style community board.** A masonry grid of real "cooks" of these meals:
>    a cuisine-tinted photo, a floating **Save**, dish/remix title, author row, save count.
>    This is the app's new **front door**. Hover reveals the save; tiles never split
>    across columns. It should feel warm and browsable, not a cold feed.
>
> **Also deliver:** a design-system sheet (color tokens, the serif+mono type scale, a
> component kit — chain branch, macro donut, value gauge, cook pin, lens toggle, data
> chip, layered panel), and a primary navigation of four rooms: **Board · Calendar ·
> Chains · My Kitchen**.
>
> **Principles:** overview first, detail on interaction (layered, not flat); spend all
> boldness on the single gold accent and keep everything else quiet; motion must explain
> structure, never just decorate; respect reduced-motion. Use the real dish names and
> numbers above throughout — no lorem, no placeholder food names.

---

## Tips for driving the tool

- **Start with one screen, then expand.** Ask for the **Calendar with the data lens**
  first (it's the core loop), then the **Chains / spine view**, then the **Board**.
- **Anchor it to real data.** Paste the example chain and the "best value" list into each
  request so mockups stay grounded — generic tools drift to stock photos and fake dishes.
- **Protect the identity in every prompt.** Re-state "dark kitchen-at-night, single gold
  accent, serif + mono" each time; tools tend to regress toward a bright generic dashboard.
- **Name the anti-patterns.** Explicitly say: no cream-and-terracotta landing-page look,
  no purple gradient hero, no emoji as section headers, no rounded-card-with-accent-bar.
- **Ask for both themes and the reduced-motion state** as part of the deliverable.

## For the engineer implementing the result

- The backend is live (Supabase project **EBBM2**): `meal_library` holds all 30 meals with
  macros + cost; the `recipe` edge function generates anything off-plan. See `DEPLOY.md`.
- Ship in the phases from the design direction: **P0** visual refresh → **P1** data lens →
  **P2** chain spine → **P3** community board (the board can ship read-first, before auth
  + photo upload, so design isn't blocked on social plumbing).
- New tables the board needs: `profiles`, `cook_posts`, `saves`/`collections`, plus a
  Supabase Storage `cooks/` bucket (public-read, RLS write). `user_recipes`,
  `recipe_edits`, and `user_preference_palate` already exist as a foundation.
