# Cookbook UI ("cookbook after dark")

Implemented 2026-07-25 from the claude.ai/design project **"Ein Mehr Beissen
Bitte UI Design"** (project `e77cde77-85f6-4e4b-bc60-09b28f8b77a9`, turn 2 —
"the printed cookbook, lit by one lamp"). Replaced the original single-file
accordion UI in `App.jsx`.

## Structure

Four rooms behind one masthead (`src/App.jsx` is now just the shell):

| Room | File | Answers |
|------|------|---------|
| Board | `components/BoardRoom.jsx` | others — community plates (static roster), filters, save |
| Calendar | `components/CalendarRoom.jsx` | when — 30 nights, dotted leaders, lens toggle, detail rail |
| Chains | `components/ChainsRoom.jsx` | why — chapter spread per anchor, prev/next chapter nav |
| My Kitchen | `components/KitchenRoom.jsx` | mine — month ledger, saved plates, shopping list |

Plus `components/RecipePage.jsx` — the "level two" recipe overlay; opens via
`openRecipe(day)` in App, which still calls `loadRecipe()` from `useRecipe`
(Supabase library → localStorage → AI, unchanged).

## Data

- `src/theme.js` — tokens: fonts, colors, `label()`/`mono()`/`display()` style
  factories, `parch()`/`rgba()` helpers. Import these, don't restate hex values.
- `src/data/mealStats.js` — static per-day baseline (kcal, cost, protein,
  active minutes, short name, blurb) merged onto `chains.js`; exports `MEALS`,
  `LENSES` (value/calories/protein/time with computed min/max), `mealByDay()`.
  DB recipe numbers override these in `RecipePage` when present.

## Design rules (from the design-system sheet)

- One gold (`#e8a020`) thing per page. Frugal green `#46d18a` = value only;
  amber `#ff9d3c` = energy only. Cuisine hue only as dot/hairline/wash — never a fill.
- No icons, no emoji. A dish is identified by its photograph (tinted plate
  circle for now) and its cuisine rule.
- Fonts (Google, loaded in `index.html`): Instrument Serif (display),
  Newsreader (body), Space Grotesk (labels), IBM Plex Mono (every number).
  This replaced Palatino.
- Motion: `embRise` 520ms stagger (160ms apart) for chain rows; 320ms lens
  transitions; 420ms gauge needle; ease `cubic-bezier(.22,.61,.36,1)`;
  `prefers-reduced-motion` kills all animation (keyframes live in App.jsx).

## Gotchas

- The Chains left page has a decorative radial-glow div — it needs
  `pointerEvents:"none"` or it swallows clicks on the chapter arrows.
- `ShoppingList` takes `MEALS` directly (it only reads `.day` and `.mealId`).
- `PaletteQuestionnaire`/`usePalate` remain unwired (unchanged from before).
