-- Deduplicate public.recipes keeping the newest record
delete from public.recipes a
where exists (
  select 1 from public.recipes b
  where a.meal_name is not distinct from b.meal_name
    and a.cuisine is not distinct from b.cuisine
    and (
      a.updated_at < b.updated_at
      or (a.updated_at = b.updated_at and a.id < b.id)
    )
);

-- Deduplicate public.meal_library keeping the newest record
delete from public.meal_library a
where exists (
  select 1 from public.meal_library b
  where a.meal_name is not distinct from b.meal_name
    and a.cuisine is not distinct from b.cuisine
    and (
      a.updated_at < b.updated_at
      or (a.updated_at = b.updated_at and a.id < b.id)
    )
);

-- Create unique index on recipes (meal_name, cuisine)
create unique index if not exists recipes_meal_name_cuisine_idx on public.recipes (meal_name, cuisine);

-- Create unique index on meal_library (meal_name, cuisine)
create unique index if not exists meal_library_meal_name_cuisine_idx on public.meal_library (meal_name, cuisine);
