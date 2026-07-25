-- meal_library: the app's denormalized 30-day core recipe library.
--
-- NOTE ON NAMING: this project's EBBM2 Supabase database already contains an
-- unrelated, normalized `public.recipes` table (216 rows, different schema:
-- recipe_ingredients / recipe_steps side tables). To avoid colliding with that
-- data, this app reads/writes its own flat, self-contained table `meal_library`.
-- One row per meal, ingredients/steps/nutrition inlined as jsonb — matches the
-- shape the client and seeder expect (see src/hooks/useRecipe.js, scripts/seed-recipes.mjs).

create extension if not exists "pgcrypto";  -- gen_random_uuid()

create table if not exists public.meal_library (
  id            uuid primary key default gen_random_uuid(),

  -- Stable key derived from chains.js, format "<chainId>-d<day>" (e.g. c1-d2).
  meal_id       text not null unique,
  chain_id      text,
  day           int,
  cuisine       text,
  anchor        text,
  meal_name     text,
  cost_tier     text,

  -- Hash of the meal definition + prompt version; drives idempotent reseeding.
  content_hash  text not null,

  -- Recipe body (matches the app's recipe JSON shape).
  description   text,
  servings      int,
  prep_time     text,
  cook_time     text,
  passive_tip   text,
  ingredients   jsonb,
  steps         jsonb,
  frugal_tips   jsonb,
  leftovers_use text,

  -- Nutrition + cost (per serving).
  calories      int,
  protein_g     int,
  carbs_g       int,
  fat_g         int,
  est_cost_usd  numeric,
  cal_per_dollar numeric generated always as (calories / nullif(est_cost_usd, 0)) stored,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists meal_library_meal_id_idx      on public.meal_library (meal_id);
create index if not exists meal_library_content_hash_idx on public.meal_library (content_hash);

-- Keep updated_at fresh on every write (reuse a shared trigger fn).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meal_library_set_updated_at on public.meal_library;
create trigger meal_library_set_updated_at
  before update on public.meal_library
  for each row execute function public.set_updated_at();

-- Row Level Security: this library is non-sensitive reference data.
alter table public.meal_library enable row level security;

-- Public (anon) may read the library.
drop policy if exists "meal_library public read" on public.meal_library;
create policy "meal_library public read"
  on public.meal_library for select
  to anon, authenticated
  using (true);

-- Only the service role (seed script / Edge Function) may write.
drop policy if exists "meal_library service write" on public.meal_library;
create policy "meal_library service write"
  on public.meal_library for all
  to service_role
  using (true)
  with check (true);
