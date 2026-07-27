-- Defensive revert of Ein Mehr Beissen Bitte additions to public.recipes
-- originally introduced by the stale migration 20260722155003_recipes_library.sql.
--
-- This migration runs defensively to ensure that:
-- 1. On shared environments where the old migration was applied, we drop
--    only our specific added columns and indexes/policies, leaving the
--    pre-existing normalized public.recipes table and its rows intact.
-- 2. On fresh environments, this runs as a no-op since public.recipes is not
--    created by this codebase anymore.

-- Drop indexes created by our stale migration, if they exist
drop index if exists public.recipes_content_hash_idx;
drop index if exists public.recipes_meal_id_idx;

-- Drop trigger created by our stale migration, if it exists
drop trigger if exists recipes_set_updated_at on public.recipes;

-- Drop policies created by our stale migration, if they exist
drop policy if exists "recipes public read" on public.recipes;
drop policy if exists "recipes service write" on public.recipes;

-- Drop our added columns if the table and columns exist.
-- Only dropping the unambiguous columns added via "add column if not exists" in the old migration,
-- plus the calculated generated column "cal_per_dollar".
alter table if exists public.recipes drop column if exists cal_per_dollar;
alter table if exists public.recipes drop column if exists content_hash;
alter table if exists public.recipes drop column if exists calories;
alter table if exists public.recipes drop column if exists protein_g;
alter table if exists public.recipes drop column if exists carbs_g;
alter table if exists public.recipes drop column if exists fat_g;
alter table if exists public.recipes drop column if exists est_cost_usd;
