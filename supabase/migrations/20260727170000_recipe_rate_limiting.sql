-- Recipe Edge Function Rate Limiting Table and Helper RPC function.
--
-- This migration sets up a table to track API requests per-IP / per-user,
-- and creates an atomic `check_rate_limit` RPC function that uses Row Locking (`FOR UPDATE`)
-- to handle concurrency safely and prevent race conditions.

create table if not exists public.recipe_rate_limits (
  rate_key      text primary key, -- Format "ip:<ip_address>" or "user:<user_id>"
  bucket_start  timestamptz not null default now(),
  count         int not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Enable Row Level Security (RLS) so it's not publicly accessible
alter table public.recipe_rate_limits enable row level security;

-- Only service role has access. Anonymous and authenticated public roles have no access.
drop policy if exists "recipe_rate_limits service all" on public.recipe_rate_limits;
create policy "recipe_rate_limits service all"
  on public.recipe_rate_limits for all
  to service_role
  using (true)
  with check (true);

-- Keep updated_at fresh on every update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipe_rate_limits_set_updated_at on public.recipe_rate_limits;
create trigger recipe_rate_limits_set_updated_at
  before update on public.recipe_rate_limits
  for each row execute function public.set_updated_at();

-- RPC helper for secure, atomic, concurrent-safe rate limit checking.
-- Returns whether the request is allowed and the updated count for the current window.
create or replace function public.check_rate_limit(
  p_rate_key text,
  p_window_seconds int,
  p_max_requests int
)
returns table(allowed boolean, current_count int)
language plpgsql
security definer -- bypass RLS checks using owner/creator privileges
set search_path = public -- secure search path to prevent search-path hijacking
as $$
declare
  v_bucket_start timestamptz;
  v_count int;
begin
  -- Ensure the row exists first to avoid insert/upsert race conditions
  insert into public.recipe_rate_limits (rate_key, bucket_start, count)
  values (p_rate_key, now(), 0)
  on conflict (rate_key) do nothing;

  -- Retrieve and lock the rate limit row for the key to handle concurrency safely
  select bucket_start, count
  into v_bucket_start, v_count
  from public.recipe_rate_limits
  where rate_key = p_rate_key
  for update;

  if v_bucket_start + (p_window_seconds || ' seconds')::interval < now() then
    -- Window expired: reset bucket start and count to 1
    update public.recipe_rate_limits
    set bucket_start = now(),
        count = 1,
        updated_at = now()
    where rate_key = p_rate_key;

    return query select true, 1;
  else
    -- Within window: check if count exceeds limit
    if v_count >= p_max_requests then
      return query select false, v_count;
    else
      -- Increment request count
      update public.recipe_rate_limits
      set count = v_count + 1,
          updated_at = now()
      where rate_key = p_rate_key;

      return query select true, v_count + 1;
    end if;
  end if;
end;
$$;
