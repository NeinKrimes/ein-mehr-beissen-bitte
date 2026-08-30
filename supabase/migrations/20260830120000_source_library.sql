-- source_library: the adapted reference library of 466 recipes.
--
-- NOTE ON NAMING: this project's EBBM2 database already contains an unrelated,
-- normalized `public.recipes` table, and this app's own 46-night calendar lives
-- in `meal_library`. This is a THIRD, separate thing: a browsable reference pool
-- adapted from the Cuisine at Home source shelf, which the calendar consults but
-- is not built from. It gets its own table for the same reason meal_library did.
--
-- Why it is in Postgres at all: the generated index was ~100 kB and shipped in
-- the entry bundle, and the full corpus another 1.2 MB as a lazy chunk. Serving
-- both from here means a browser downloads the rows it actually looks at. The
-- generated files remain in the repo as an offline fallback, so the Library room
-- still works with no network and no Supabase project configured.
--
-- Content note: ingredient lists and nutrition are reproduced as printed (facts,
-- not authorship). Every method step is rewritten in the app's own voice — see
-- data/authored-steps.json. The publisher's original prose is never stored.

create table if not exists public.source_library (
  -- The slug from data/authored-steps.json. Stable across rebuilds, and the key
  -- the client already holds in localStorage for the shopping basket, so it is
  -- the primary key rather than a surrogate uuid.
  id             text primary key,

  title          text not null,
  subtitle       text not null default '',
  cuisine        text not null,

  servings       text,
  total_time     text,

  -- [{ amount, unit, item, group }] and [{ n, title, text }], matching the
  -- shape the client renders directly.
  ingredients    jsonb not null default '[]'::jsonb,
  steps          jsonb not null default '[]'::jsonb,
  attribution    jsonb,

  calories       int,
  protein_g      numeric,
  carbs_g        numeric,
  fat_g          numeric,
  fiber_g        numeric,
  sodium_mg      numeric,
  est_cost_usd   numeric,

  -- Generated, like meal_library.cal_per_dollar, so the "most calories per
  -- dollar" sort cannot drift from the numbers it sorts on.
  cal_per_dollar numeric generated always as (calories / nullif(est_cost_usd, 0)) stored,

  updated_at     timestamptz not null default now()
);

-- The Library room's three access patterns: filter by cuisine, sort by value or
-- cost, and search titles. Everything else is a primary-key lookup.
create index if not exists source_library_cuisine_idx on public.source_library (cuisine);
create index if not exists source_library_value_idx   on public.source_library (cal_per_dollar desc nulls last);
create index if not exists source_library_cost_idx    on public.source_library (est_cost_usd asc nulls last);

-- Title search. pg_trgm gives case- and substring-insensitive matching, which is
-- what the room's search box does client-side today.
create extension if not exists pg_trgm;
create index if not exists source_library_title_trgm_idx
  on public.source_library using gin ((title || ' ' || subtitle) gin_trgm_ops);

alter table public.source_library enable row level security;

-- Read-only to the world. This is reference content the app ships anyway; the
-- anon key can select it and nothing else. Writes go through the seeder, which
-- uses the service-role key and bypasses RLS.
drop policy if exists "source_library public read" on public.source_library;
create policy "source_library public read"
  on public.source_library for select
  using (true);
