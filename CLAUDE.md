# CLAUDE.md — Ein Mehr Beissen Bitte

This file briefs Claude Code on the project so it can hit the ground running.

## What This Project Is

A React web app — a 30-day world cuisine meal calendar built around "anchor ingredients."
Each anchor (whole chicken, pork shoulder, dried beans, etc.) chains into 3–4 follow-up
meals across different world cuisines. All slow cooks are passive/WFH-friendly.
Recipes are generated on demand via the Anthropic API.

## Commands

```bash
npm run dev        # Start Vite dev server on port 5173
npm run build      # Production build to /dist
npm run preview    # Preview production build
npm run lint       # ESLint
```

## Tech Stack

- React 18 with hooks
- Vite
- Plain CSS-in-JS (inline styles, no Tailwind, no CSS modules)
- Anthropic API for recipe generation (claude-sonnet-4-20250514)
- No backend — all client-side

## Architecture

- `src/data/chains.js` — single source of truth for all meal data
- `src/hooks/useRecipe.js` — handles API calls and in-memory recipe caching
- `src/components/RecipeCalendar.jsx` — main calendar UI
- `src/components/RecipePanel.jsx` — recipe detail panel
- Recipes are cached in React state (no localStorage, no backend)

## Design System

Dark theme. Colors:
- Background: #0c0c0f
- Card: #131318
- Accent/gold: #e8a020
- Text: #e0d8c8
- Muted: #666
- Each cuisine has its own color (see CUISINE_META in RecipeCalendar.jsx)

Font: Palatino Linotype / serif stack — deliberate, not system-ui or sans-serif.

## Data Shape

Each "chain" looks like:
```js
{
  id: "c1",
  anchor: "Whole Roast Chicken + Stock",
  emoji: "🐔",
  passive: "~2 hrs roast + 8 hrs stock (overnight)",
  days: [
    { day: 1, dow: "Sun", cuisine: "French", type: "ANCHOR", meal: "Poulet Roti", cost: "$$" },
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
  "leftoversUse": "..."
}
```

## Conventions

- Functional components only, no class components
- useState / useEffect hooks
- Inline styles throughout (matches existing codebase)
- Keep components focused — one responsibility each
- No external UI libraries
- Frugal cooking context should inform all AI prompts

## Planned Features (good first issues)

- [ ] Persist loaded recipes to localStorage
- [ ] Weekly shopping list generator (aggregate ingredients by week)
- [ ] Print a single recipe as a card
- [ ] "Mark as cooked" tracking with progress indicator
- [ ] Export full calendar as PDF
- [ ] Mobile responsive layout improvements
- [ ] Add more cuisine chains (Vietnamese, Ethiopian, Japanese, Greek)

## Notes

- The project name "Ein Mehr Beissen Bitte" is German/English — means "one more bite please"
- Part of the NEINKRIMES GitHub organization
- Companion projects in the org: angular-aphorisms, silentsounder
