# Month 2 chains (days 31–46) — design notes

Four new anchor chains extend the calendar from 30 nights to 46. Same rule as
Month 1: one long **passive** cook, then three nights of leftovers that stop
looking like leftovers.

## Source of inspiration

Drawn from a shelf of *Cuisine at Home* issues — the **Splendid Soups & Stews**
special, **Cuisine Tonight: For Two / Thinner Dinners for Two**, and Issue 104
(April 2014). Nothing is copied; what was taken is the *structural* lesson those
books teach over and over, and it happens to be exactly this project's thesis:

| Pattern seen in the source | How it shows up here |
| --- | --- |
| A master stock/broth page (layer aromatics, skim once, simmer 1–2 hrs, chill, freeze) as the foundation of a whole chapter | c11's anchor is the broth itself, not a dish |
| Long, hands-off heat: slow-cooker chili at 7 hrs low, 3-hr oven stews, overnight dried-bean soaks | Every `passive` field is a real unattended window |
| Dried legumes as the cheapest possible protein (red beans & rice, split pea, spinach & lentil) | c12 days 36–38 all run under $1.25/serving |
| One cooked protein re-cast across several dishes (rotisserie chicken → pozole chili, green chili, chilaquiles, pot pie) | Every CHAIN day is a genuine derivative of its ANCHOR |
| Every main paired with a fast, cheap side | Absorbed into the meal names (injera, onigiri, quick pickles, lemon potatoes) |
| Egg-and-lemon / masa / beurre manié thickening instead of cream | c14 day 45 avgolemono; c12's onion base does the same job |

## The chains

### c11 — Beef Shank & Oxtail Phở Broth (days 31–34, Tue–Fri)
*Passive: 8 hrs low simmer + overnight rest (skim once, ignore the rest).*
Cheapest cuts on the beef counter, and the broth is the actual product.

- **31 · Vietnamese · ANCHOR** — Phở Bò with Charred Onion & Ginger `$$`
- **32 · Vietnamese** — Bún Bò Nam Bộ (shredded shank cold over noodles) `$`
- **33 · American** — Beef, Barley & Kale Broth `$`
- **34 · Vietnamese** — Bánh Mì with Braised Shank & Quick Pickles `$`

### c12 — Ethiopian Onion Base, Cooked Dry (days 35–38, Sat–Tue)
*Passive: 2 hrs dry-cooked onions + 90 min braise (stir twice an hour).*
The base is the anchor: a mountain of onions cooked down with no fat until it
turns into a paste, then berbere. It makes three completely different dinners.

- **35 · Ethiopian · ANCHOR** — Doro Wat with Hard-Boiled Eggs & Injera `$$`
- **36 · Ethiopian** — Misir Wat (red lentils in the same base) `$`
- **37 · Ethiopian** — Gomen & Atkilt — collards, cabbage, carrot `$`
- **38 · Indian** — Berbere Chicken & Chickpea Stew `$`

### c13 — Kombu-Shiitake Dashi, Cold Brew (days 39–42, Wed–Sat)
*Passive: 12 hrs cold-brew dashi (fridge, hands-off) + 40 min simmer.*
The most literally passive anchor on the calendar — it is made in the fridge.

- **39 · Japanese · ANCHOR** — Nikujaga (simmered beef & potatoes) `$$`
- **40 · Japanese** — Miso Soup with Tofu & Wakame + Onigiri `$`
- **41 · Japanese** — Oyakodon (chicken & egg over rice) `$`
- **42 · Chinese** — Dashi Fried Rice with yesterday's nikujaga `$`

### c14 — Pork Shoulder Kleftiko, Sealed & Slow (days 43–46, Sun–Wed)
*Passive: 4 hrs sealed in the oven (open it once, at the end).*
Sealed parchment means zero basting and a pan of concentrated juices that carry
the next three nights.

- **43 · Greek · ANCHOR** — Kleftiko with Lemon Potatoes & Oregano `$$`
- **44 · Greek** — Youvetsi — pork & orzo baked in the juices `$`
- **45 · Greek** — Avgolemono with shredded pork & rice `$`
- **46 · Italian** — Lemon-Pork Ragù over Pappardelle `$`

## Implementation notes

- `chains.js` now exports **`DAY_COUNT`**, derived from the data. Nothing in
  `src/` may hard-code the calendar length again — `integrity.test.js`,
  `CalendarRoom.jsx`, and `App.jsx`'s `Clock` all read it.
- `CalendarRoom` renders `ceil(DAY_COUNT / 7)` whole weeks and sizes the
  chain-connector SVG viewBox to match, so adding a Month 3 needs no layout work.
- Four cuisines were added to `CUISINE_COLORS` in `src/theme.js` — teal, deep
  rust, indigo, azure — picked for the gaps left in the existing hue wheel so no
  two dots read alike. These are new palette values and worth a design eye.
- No DB or script changes: `scripts/seed-recipes.mjs` enumerates via
  `enumerateMeals()`, so `npm run seed` picks up days 31–46 on its next run.
  **Month 2 is not seeded into `meal_library` yet** — until it is, days 31–46
  fall through to the on-demand API tier in `useRecipe`.
