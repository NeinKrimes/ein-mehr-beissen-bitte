-- Migration file to define ingredients, recipe_ingredients, recipe_steps,
-- and user_preference_palate tables, their relationships, indexes, and RLS policies.

create extension if not exists "pgcrypto";

-- 1. ingredients table
create table if not exists public.ingredients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- RLS for ingredients
alter table public.ingredients enable row level security;

drop policy if exists "ingredients public read" on public.ingredients;
create policy "ingredients public read"
  on public.ingredients for select
  to anon, authenticated
  using (true);

drop policy if exists "ingredients service write" on public.ingredients;
create policy "ingredients service write"
  on public.ingredients for all
  to service_role
  using (true)
  with check (true);


-- 2. recipe_ingredients table
create table if not exists public.recipe_ingredients (
  id             uuid primary key default gen_random_uuid(),
  recipe_id      uuid not null references public.recipes(id) on delete cascade,
  ingredient_id  uuid not null references public.ingredients(id) on delete cascade,
  amount         text,
  unit           text,
  item           text,
  created_at     timestamptz not null default now()
);

-- Indexes for recipe_ingredients
create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);
create index if not exists recipe_ingredients_ingredient_id_idx on public.recipe_ingredients (ingredient_id);

-- RLS for recipe_ingredients
alter table public.recipe_ingredients enable row level security;

drop policy if exists "recipe_ingredients public read" on public.recipe_ingredients;
create policy "recipe_ingredients public read"
  on public.recipe_ingredients for select
  to anon, authenticated
  using (true);

drop policy if exists "recipe_ingredients service write" on public.recipe_ingredients;
create policy "recipe_ingredients service write"
  on public.recipe_ingredients for all
  to service_role
  using (true)
  with check (true);


-- 3. recipe_steps table
create table if not exists public.recipe_steps (
  id           uuid primary key default gen_random_uuid(),
  recipe_id    uuid not null references public.recipes(id) on delete cascade,
  step_number  int not null,
  title        text,
  text         text not null,
  created_at   timestamptz not null default now()
);

-- Indexes for recipe_steps
create index if not exists recipe_steps_recipe_id_idx on public.recipe_steps (recipe_id);

-- RLS for recipe_steps
alter table public.recipe_steps enable row level security;

drop policy if exists "recipe_steps public read" on public.recipe_steps;
create policy "recipe_steps public read"
  on public.recipe_steps for select
  to anon, authenticated
  using (true);

drop policy if exists "recipe_steps service write" on public.recipe_steps;
create policy "recipe_steps service write"
  on public.recipe_steps for all
  to service_role
  using (true)
  with check (true);


-- 4. user_preference_palate table
create table if not exists public.user_preference_palate (
  user_id            uuid primary key references auth.users(id) on delete cascade not null,
  protein_blocks     jsonb not null default '[]'::jsonb,
  dislikes           jsonb not null default '[]'::jsonb,
  liked_flavours     jsonb not null default '[]'::jsonb,
  liked_proteins     jsonb not null default '[]'::jsonb,
  household_size     int,
  skill_level        text,
  weekday_time_mins  int,
  weekend_time_mins  int,
  cooking_methods    jsonb not null default '[]'::jsonb,
  protein_ratings    jsonb not null default '{}'::jsonb,
  flavour_ratings    jsonb not null default '{}'::jsonb,
  cuisine_priorities jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- RLS for user_preference_palate
alter table public.user_preference_palate enable row level security;

drop policy if exists "users can read own palate" on public.user_preference_palate;
create policy "users can read own palate"
  on public.user_preference_palate for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users can insert own palate" on public.user_preference_palate;
create policy "users can insert own palate"
  on public.user_preference_palate for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can update own palate" on public.user_preference_palate;
create policy "users can update own palate"
  on public.user_preference_palate for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can delete own palate" on public.user_preference_palate;
create policy "users can delete own palate"
  on public.user_preference_palate for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "service role can do anything on palate" on public.user_preference_palate;
create policy "service role can do anything on palate"
  on public.user_preference_palate for all
  to service_role
  using (true)
  with check (true);

-- Ensure we keep updated_at fresh
drop trigger if exists user_preference_palate_set_updated_at on public.user_preference_palate;
create trigger user_preference_palate_set_updated_at
  before update on public.user_preference_palate
  for each row execute function public.set_updated_at();
