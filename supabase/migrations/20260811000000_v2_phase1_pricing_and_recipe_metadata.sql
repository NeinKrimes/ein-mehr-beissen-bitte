-- Phase 1 pricing and nutrition schema for the existing normalized recipe library.
-- Raw price observations remain immutable; price estimates retain their complete
-- USDA F-MAP/BLS CPI provenance and are deterministically recomputed on writes.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.dietary_tag as enum (
    'contains_meat',
    'contains_poultry',
    'contains_fish',
    'contains_shellfish',
    'contains_dairy',
    'contains_egg'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.price_source as enum (
    'usda_fmap',
    'bls_cpi',
    'fdc',
    'kroger',
    'manual'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.cuisines (
  code         text primary key check (btrim(code) <> ''),
  display_name text not null unique check (btrim(display_name) <> ''),
  created_at   timestamptz not null default now()
);

insert into public.cuisines (code, display_name)
values
  ('American', 'American'),
  ('Chinese', 'Chinese'),
  ('French', 'French'),
  ('Indian', 'Indian'),
  ('Italian', 'Italian'),
  ('Jamaican', 'Jamaican'),
  ('Mexican', 'Mexican'),
  ('Thai', 'Thai')
on conflict (code) do nothing;

-- Preserve cuisines already present in the library before adding the FK.
insert into public.cuisines (code, display_name)
select distinct btrim(cuisine), btrim(cuisine)
from public.recipes
where cuisine is not null and btrim(cuisine) <> ''
on conflict (code) do nothing;

alter table public.recipes
  add column if not exists dietary_tags public.dietary_tag[] not null default '{}',
  add column if not exists calories_per_serving numeric,
  add column if not exists protein_g_per_serving numeric;

update public.recipes
set calories_per_serving = calories
where calories_per_serving is null and calories is not null;

update public.recipes
set protein_g_per_serving = protein_g
where protein_g_per_serving is null and protein_g is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass
      and conname = 'recipes_cuisine_fkey'
  ) then
    alter table public.recipes
      add constraint recipes_cuisine_fkey
      foreign key (cuisine) references public.cuisines(code);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass
      and conname = 'recipes_calories_per_serving_check'
  ) then
    alter table public.recipes
      add constraint recipes_calories_per_serving_check
      check (calories_per_serving is null or calories_per_serving >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.recipes'::regclass
      and conname = 'recipes_protein_g_per_serving_check'
  ) then
    alter table public.recipes
      add constraint recipes_protein_g_per_serving_check
      check (protein_g_per_serving is null or protein_g_per_serving >= 0);
  end if;
end;
$$;

create index if not exists recipes_cuisine_idx on public.recipes (cuisine);
create index if not exists recipes_dietary_tags_idx
  on public.recipes using gin (dietary_tags);

create table if not exists public.ingredients (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null check (btrim(name) <> ''),
  fdc_food_id            bigint,
  fmap_category_code     text,
  default_grams_per_unit numeric check (default_grams_per_unit > 0),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create unique index if not exists ingredients_name_ci_uidx
  on public.ingredients (lower(btrim(name)));
create index if not exists ingredients_fdc_food_id_idx
  on public.ingredients (fdc_food_id) where fdc_food_id is not null;
create index if not exists ingredients_fmap_category_idx
  on public.ingredients (fmap_category_code) where fmap_category_code is not null;

create table if not exists public.recipe_ingredients (
  recipe_id         uuid not null references public.recipes(id) on delete cascade,
  ingredient_id     uuid not null references public.ingredients(id) on delete restrict,
  quantity_value    numeric not null check (quantity_value > 0),
  quantity_unit     text not null check (btrim(quantity_unit) <> ''),
  grams_equivalent  numeric not null check (grams_equivalent > 0),
  is_pantry_staple  boolean not null default false,
  match_confidence  numeric not null check (match_confidence between 0 and 1),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (recipe_id, ingredient_id)
);

create index if not exists recipe_ingredients_ingredient_id_idx
  on public.recipe_ingredients (ingredient_id);
create index if not exists recipe_ingredients_recipe_non_pantry_idx
  on public.recipe_ingredients (recipe_id) where not is_pantry_staple;

create table if not exists public.price_observations (
  id                 uuid primary key default gen_random_uuid(),
  ingredient_id      uuid references public.ingredients(id) on delete restrict,
  source             public.price_source not null,
  category_code      text not null check (btrim(category_code) <> ''),
  region_code        text not null default 'US' check (btrim(region_code) <> ''),
  observed_at        date not null,
  period_start       date not null,
  period_end         date not null,
  unit_value_usd     numeric,
  unit_basis_grams   numeric,
  cpi_series_id      text,
  index_value        numeric,
  source_reference   text not null check (btrim(source_reference) <> ''),
  raw_payload        jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  constraint price_observations_period_check
    check (period_end >= period_start),
  constraint price_observations_source_shape_check check (
    (
      source = 'bls_cpi'
      and ingredient_id is null
      and unit_value_usd is null
      and unit_basis_grams is null
      and cpi_series_id is not null
      and btrim(cpi_series_id) <> ''
      and index_value > 0
    )
    or
    (
      source <> 'bls_cpi'
      and ingredient_id is not null
      and unit_value_usd >= 0
      and unit_basis_grams > 0
      and cpi_series_id is null
      and index_value is null
    )
  ),
  constraint price_observations_fmap_basis_check check (
    source <> 'usda_fmap' or unit_basis_grams = 100
  )
);

create index if not exists price_observations_ingredient_source_date_idx
  on public.price_observations (ingredient_id, source, observed_at desc)
  where ingredient_id is not null;
create index if not exists price_observations_cpi_match_idx
  on public.price_observations
    (cpi_series_id, category_code, region_code, period_start, period_end)
  where source = 'bls_cpi';

create or replace function public.reject_price_observation_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'price_observations are immutable; insert a new observation instead'
    using errcode = '55000';
end;
$$;

drop trigger if exists price_observations_immutable on public.price_observations;
create trigger price_observations_immutable
  before update or delete on public.price_observations
  for each row execute function public.reject_price_observation_mutation();

create table if not exists public.price_estimates (
  id                         uuid primary key default gen_random_uuid(),
  recipe_id                  uuid not null,
  ingredient_id              uuid not null,
  region_code                text not null check (btrim(region_code) <> ''),
  as_of                      date not null,
  price_observation_id       uuid not null references public.price_observations(id) on delete restrict,
  base_cpi_observation_id    uuid not null references public.price_observations(id) on delete restrict,
  target_cpi_observation_id  uuid not null references public.price_observations(id) on delete restrict,
  estimated_cost_usd         numeric not null check (estimated_cost_usd >= 0),
  confidence_grade           text not null check (confidence_grade in ('A', 'B', 'C', 'D')),
  formula_version            text not null default 'fmap_bls_v1'
    check (formula_version = 'fmap_bls_v1'),
  computed_at                timestamptz not null default now(),
  foreign key (recipe_id, ingredient_id)
    references public.recipe_ingredients(recipe_id, ingredient_id) on delete cascade,
  unique (recipe_id, ingredient_id, region_code, as_of)
);

create index if not exists price_estimates_ingredient_region_idx
  on public.price_estimates (ingredient_id, region_code, as_of desc);
create index if not exists price_estimates_recipe_region_idx
  on public.price_estimates (recipe_id, region_code, as_of desc);

-- Recipe ingredient cost = adjusted grams / 100 * F-MAP USD per 100 g
--                          * target-period CPI / F-MAP-period CPI.
create or replace function public.fmap_bls_ingredient_cost(
  grams_equivalent numeric,
  fmap_unit_value_usd numeric,
  base_cpi_index numeric,
  target_cpi_index numeric
)
returns numeric
language sql
immutable
strict
parallel safe
as $$
  select round(
    (grams_equivalent / 100.0)
    * fmap_unit_value_usd
    * (target_cpi_index / base_cpi_index),
    4
  );
$$;

create or replace function public.derive_price_estimate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  ingredient_grams numeric;
  fmap_observation public.price_observations%rowtype;
  base_cpi public.price_observations%rowtype;
  target_cpi public.price_observations%rowtype;
begin
  select ri.grams_equivalent
    into strict ingredient_grams
  from public.recipe_ingredients ri
  where ri.recipe_id = new.recipe_id
    and ri.ingredient_id = new.ingredient_id;

  select * into strict fmap_observation
  from public.price_observations
  where id = new.price_observation_id;

  select * into strict base_cpi
  from public.price_observations
  where id = new.base_cpi_observation_id;

  select * into strict target_cpi
  from public.price_observations
  where id = new.target_cpi_observation_id;

  if fmap_observation.source <> 'usda_fmap'
     or fmap_observation.ingredient_id <> new.ingredient_id then
    raise exception 'price_observation_id must identify a USDA F-MAP observation for ingredient %',
      new.ingredient_id using errcode = '23514';
  end if;

  if base_cpi.source <> 'bls_cpi' or target_cpi.source <> 'bls_cpi' then
    raise exception 'base and target CPI observations must be BLS CPI observations'
      using errcode = '23514';
  end if;

  if base_cpi.cpi_series_id <> target_cpi.cpi_series_id
     or base_cpi.category_code <> fmap_observation.category_code
     or target_cpi.category_code <> fmap_observation.category_code then
    raise exception 'BLS CPI series and category must match the F-MAP observation category'
      using errcode = '23514';
  end if;

  if fmap_observation.observed_at not between base_cpi.period_start and base_cpi.period_end then
    raise exception 'base CPI period must contain the F-MAP observation date'
      using errcode = '23514';
  end if;

  if new.as_of not between target_cpi.period_start and target_cpi.period_end then
    raise exception 'target CPI period must contain the estimate as-of date'
      using errcode = '23514';
  end if;

  if target_cpi.region_code not in (new.region_code, 'US')
     or fmap_observation.region_code not in (new.region_code, 'US') then
    raise exception 'price and CPI observations must match the estimate region or use US fallback'
      using errcode = '23514';
  end if;

  new.estimated_cost_usd := public.fmap_bls_ingredient_cost(
    ingredient_grams,
    fmap_observation.unit_value_usd,
    base_cpi.index_value,
    target_cpi.index_value
  );
  new.formula_version := 'fmap_bls_v1';
  new.computed_at := now();
  return new;
end;
$$;

drop trigger if exists price_estimates_derive on public.price_estimates;
create trigger price_estimates_derive
  before insert or update on public.price_estimates
  for each row execute function public.derive_price_estimate();

-- Reuse the project's updated_at trigger for mutable reference data.
drop trigger if exists ingredients_set_updated_at on public.ingredients;
create trigger ingredients_set_updated_at
  before update on public.ingredients
  for each row execute function public.set_updated_at();

alter table public.cuisines enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.price_observations enable row level security;
alter table public.price_estimates enable row level security;

drop policy if exists "cuisines public read" on public.cuisines;
create policy "cuisines public read" on public.cuisines
  for select to anon, authenticated using (true);
drop policy if exists "ingredients public read" on public.ingredients;
create policy "ingredients public read" on public.ingredients
  for select to anon, authenticated using (true);
drop policy if exists "recipe ingredients public read" on public.recipe_ingredients;
create policy "recipe ingredients public read" on public.recipe_ingredients
  for select to anon, authenticated using (true);
drop policy if exists "price observations public read" on public.price_observations;
create policy "price observations public read" on public.price_observations
  for select to anon, authenticated using (true);
drop policy if exists "price estimates public read" on public.price_estimates;
create policy "price estimates public read" on public.price_estimates
  for select to anon, authenticated using (true);

drop policy if exists "cuisines service write" on public.cuisines;
create policy "cuisines service write" on public.cuisines
  for all to service_role using (true) with check (true);
drop policy if exists "ingredients service write" on public.ingredients;
create policy "ingredients service write" on public.ingredients
  for all to service_role using (true) with check (true);
drop policy if exists "recipe ingredients service write" on public.recipe_ingredients;
create policy "recipe ingredients service write" on public.recipe_ingredients
  for all to service_role using (true) with check (true);
drop policy if exists "price observations service insert" on public.price_observations;
create policy "price observations service insert" on public.price_observations
  for insert to service_role with check (true);
drop policy if exists "price estimates service write" on public.price_estimates;
create policy "price estimates service write" on public.price_estimates
  for all to service_role using (true) with check (true);
