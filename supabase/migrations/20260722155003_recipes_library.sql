-- Recipe library: the finite, known 30-day meal set generated once and read
-- from the DB thereafter. Stores the full recipe plus nutrition and cost.
-- Denormalized (ingredients/steps as jsonb) to match the app's recipe shape.

create extension if not exists "pgcrypto";  -- gen_random_uuid()

create table if not exists public.recipes (
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

-- In case an earlier recipes table already exists, add the newer columns idempotently.
alter table public.recipes add column if not exists content_hash   text;
alter table public.recipes add column if not exists calories       int;
alter table public.recipes add column if not exists protein_g      int;
alter table public.recipes add column if not exists carbs_g        int;
alter table public.recipes add column if not exists fat_g          int;
alter table public.recipes add column if not exists est_cost_usd   numeric;

create index if not exists recipes_meal_id_idx      on public.recipes (meal_id);
create index if not exists recipes_content_hash_idx on public.recipes (content_hash);

-- Keep updated_at fresh on every write.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- Row Level Security: recipes are non-sensitive reference data.
alter table public.recipes enable row level security;

-- Public (anon) may read the library.
drop policy if exists "recipes public read" on public.recipes;
create policy "recipes public read"
  on public.recipes for select
  to anon, authenticated
  using (true);

-- Only the service role (seed script / Edge Function) may write.
drop policy if exists "recipes service write" on public.recipes;
create policy "recipes service write"
  on public.recipes for all
  to service_role
  using (true)
  with check (true);
