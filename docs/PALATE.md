# Palate Strategy & Architecture

This document outlines the palate strategy for **Ein Mehr Beissen Bitte**, clarifying how dietary preferences and palate questionnaires are handled across all layers of the application to ensure consistency, high performance, and high caching efficiency.

---

## The Decision: Canonical Shared Store with Client Personalization (Option A)

To fulfill the goal of a **shared, reusable store (generate once, reuse)**, we chose **Option A: Store a canonical recipe as the shared base and treat palate as an optional client-side personalization layer**.

### Why Option A?

1. **Maximizes Cache Reuse ("Generate Once, Reuse")**
   If we keyed the database cache by the user's specific palate (which contains a highly variable combination of protein hard blocks, soft dislikes, liked flavours, etc.), different users would almost never hit the same cache. The store would fail to be a truly "shared, reusable store" and would require redundant, expensive LLM calls for minor difference combinations.
2. **Prevents Combinatorial Cache Key Explosion**
   There are millions of possible palate questionnaire outcomes. Under Option B (keying by palate hash), the database size and generation count would scale with the number of users rather than the number of unique meals.
3. **Avoids Unnecessary Schema Migrations**
   Our table `meal_library` is flat and denormalized. Option A keeps the database model simple and elegant without needing extra metadata/hash columns.
4. **Maintains High UI Performance**
   Serving canonical recipes from the database (Tier 1) has near-zero latency, and the client personalization runs instantaneously on render.

---

## Palate Handling Across All Tiers

Our architecture is consistently organized across 4 tiers:

### Tier 1: Supabase `meal_library` (Database)
- **Role**: Shared, immutable reference database for the 30 core meals plus custom runtime recipes.
- **Palate Handling**: Stores the canonical, base recipe for every meal. It contains the standard ingredients and steps without applying user-specific dietary preferences or exclusions to the core generation.
- **Idempotency**: Unique constraint on `meal_id` ensuring a single, shared canonical copy is kept for each unique meal.

### Tier 2: `localStorage` (Browser Cache)
- **Role**: Per-browser local cache to bypass network round-trips for recently loaded/generated recipes.
- **Palate Handling**: Stores the canonical, base recipe.

### Tier 3: Supabase Edge Function (`recipe`)
- **Role**: Invoked on a cache-miss in Tier 1. It acts as a server-side proxy to the Anthropic API.
- **Palate Handling**: Accepts `palate` in the request body for interface consistency but ignores it during prompt assembly to generate the **canonical** base recipe.
- **Privilege/Security**: Connects using `service_role` permissions to safely write/upsert the newly generated canonical recipe into the `meal_library` database. The client remains completely read-only.

### Tier 4: Client-Side UI Personalization (React)
- **Role**: Render the recipe to the active user.
- **Palate Handling**: Accesses the current user's active `palate` preferences using the `usePalate` hook in `src/App.jsx`. It passes the `palate` state down to `RecipePage` and `RecipePanel`.
- **Dynamic personalizations applied**:
  - Checks if any recipe ingredient matches the user's `proteinBlocks` (hard avoids). If so, it displays the item with a **strike-through** style and appends a red `[Avoid: Blocked]` badge.
  - Checks if any recipe ingredient matches the user's `dislikes` (soft avoids). If so, it displays the item with a faded style and appends a gold `[Disliked: Substitute if possible]` badge.

---

## Summary of Benefits

This approach achieves the best of both worlds:
- **Perfect Frugality**: No double-generation or wasted LLM costs.
- **Instant Sharing**: If User A triggers a fallback generation, User B immediately gets that recipe instantly from the database with zero waiting.
- **Dynamic Personalization**: User B still sees their personal dislikes/blocked proteins highlighted or crossed out on the exact same recipe card.
