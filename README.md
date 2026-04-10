# Ein Mehr Beissen Bitte 🌍🍽️

> *"One more bite, please."*

A world cuisine frugal meal calendar built around **anchor ingredients** that spin across multiple cuisines. Cook once, eat worldly, waste nothing.

## The Concept

Every chain starts with one slow-cook anchor — a whole chicken, a pork shoulder, a pot of beans — and branches into 3–4 meals across different world cuisines. All passive cook times are designed for working from home: set it and forget it while you work.

**Cuisines covered:** Mexican 🇲🇽 · Italian 🇮🇹 · Indian 🇮🇳 · French 🇫🇷 · Jamaican 🇯🇲 · Thai 🇹🇭 · Chinese 🇨🇳 · American 🇺🇸

## Features

- 📅 30-day interactive meal calendar
- 🔗 Anchor → chain ingredient threading (cook once, eat 3–4 times)
- 🤖 AI-generated recipes on demand for every meal
- ⏱️ WFH-optimized — all slow cooks are passive
- 💰 Frugal tips and leftover usage built into every recipe
- 🌍 Filter calendar by cuisine

## Project Structure

```
ein-mehr-beissen-bitte/
├── README.md
├── CLAUDE.md                  ← Claude Code briefing file
├── src/
│   ├── components/
│   │   ├── RecipeCalendar.jsx  ← Main AI-powered calendar
│   │   ├── ChainCard.jsx       ← Anchor + chain meal group
│   │   ├── RecipePanel.jsx     ← Full recipe display
│   │   └── CuisineFilter.jsx   ← Filter by cuisine
│   ├── data/
│   │   └── chains.js           ← All 10 meal chains + 30 days
│   ├── hooks/
│   │   └── useRecipe.js        ← Recipe fetch + cache logic
│   └── App.jsx
├── public/
├── package.json
└── vite.config.js
```

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## The Meal Chains

| Chain | Anchor | Cuisines |
|-------|--------|----------|
| 1 | Whole Roast Chicken + Stock | French → Mexican → Thai → Indian |
| 2 | Pork Shoulder Low & Slow | Jamaican → Chinese → Mexican |
| 3 | Dried Black Beans | Mexican → Jamaican → Mexican |
| 4 | Whole Chicken #2 Poached | French → Thai → Italian |
| 5 | Slow Tomato Sauce (double batch) | Italian → Italian → Mexican |
| 6 | Red Lentils Big Pot | Indian → French → Mexican |
| 7 | Pork Belly Braise | Chinese → Chinese → Jamaican |
| 8 | Whole Chicken #3 World Tour | Jamaican → Thai → Italian → Indian |
| 9 | Rice + Congee Base | Chinese → Thai |
| 10 | Bagel Dough Cold Proof | American → French |

## Frugal Philosophy

- Dried beans and whole chickens are the foundation
- Every carcass becomes stock
- Every double batch gets half frozen
- Day-old rice is an asset, not a leftover
- The freezer is your pantry

## Part of NEINKRIMES

This project lives under the [NEINKRIMES](https://github.com/NEINKRIMES) organization.
