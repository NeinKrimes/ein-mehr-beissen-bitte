## 2026-07-30 - [Extract Clock to reduce re-renders]
**Learning:** The `useClock` hook triggered a re-render of the entire `App` component and all of its heavy children (`BoardRoom`, `CalendarRoom`, etc.) every 30 seconds due to `setNow` updating the state at the root level.
**Action:** Extracted the hook into its own isolated `<Clock />` component to contain the frequent timer-based state updates, preventing expensive global re-renders. Next time, always check if periodic state updates can be isolated to a small child component.

## 2026-07-31 - [Optimize getPalateKey execution]
**Learning:** The `getRecipe` function within `useRecipe` is called frequently during rendering loops (such as aggregating recipes for the `ShoppingList` component). Deriving a cache key using expensive array operations (spreads, sorts, joins) on the `palate` object inside these callbacks causes significant redundant computation and garbage collection pressure.
**Action:** Memoize derived keys using `useMemo` and depend on the primitive result string, drastically reducing redundant operations when object dependencies haven't changed.

## 2026-08-02 - [Memoize list rendering in App Rooms]
**Learning:** React re-renders components frequently during state updates or navigation. Large list rendering (e.g. 35 `MealCard` instances in `CalendarRoom`) or heavy mapping/filtering of data (e.g. `MEALS.filter` in `ChainsRoom` and `KitchenRoom`) causes unnecessary garbage collection and main thread blockages when parent components re-render without the underlying data actually changing.
**Action:** Applied `React.memo` to complex stateless list items (`MealCard`, `ChainConnectors`) and `useMemo` for derived dataset computations in heavy view components to avoid O(N) redundant calculations on simple state changes. Next time, preemptively memoize expensive derivations based on global constants that are manipulated locally.

## 2026-08-06 - [Avoid O(N) Array.includes in large maps]
**Learning:** Inside `LibraryRoom.jsx`, checking `basket?.has(r.id)` within a `.map` loop over `rows` was an O(N) operation per row because `basket.has` wraps `Array.includes`. For 400+ recipes, this is O(N*M), slowing down filter re-renders. Additionally, `LeaderRow` was completely re-rendering when parent state like `query` changed because it wasn't wrapped in `React.memo`.
**Action:** Pre-compute an O(1) `Set` inside `useMemo` (e.g., `basketSet`) for list inclusion checks. Wrap list rows like `LeaderRow` in `React.memo()` to prevent unnecessary re-renders when parent primitive props don't change.
