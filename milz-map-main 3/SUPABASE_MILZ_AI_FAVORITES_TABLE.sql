create extension if not exists pgcrypto;

create table if not exists public.ai_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite_key text not null,
  name text not null,
  reason text,
  category text,
  details text,
  lat double precision not null,
  lng double precision not null,
  area_key text,
  city_name text,
  translations jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_favorites_user_key_unique unique (user_id, favorite_key)
);

create index if not exists ai_favorites_user_id_idx on public.ai_favorites(user_id);
create index if not exists ai_favorites_area_city_idx on public.ai_favorites(area_key, city_name);

create or replace function public.set_ai_favorites_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ai_favorites_updated_at on public.ai_favorites;
create trigger set_ai_favorites_updated_at
before update on public.ai_favorites
for each row
execute function public.set_ai_favorites_updated_at();

alter table public.ai_favorites enable row level security;

drop policy if exists "Users can view own ai favorites" on public.ai_favorites;
create policy "Users can view own ai favorites"
on public.ai_favorites
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own ai favorites" on public.ai_favorites;
create policy "Users can insert own ai favorites"
on public.ai_favorites
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own ai favorites" on public.ai_favorites;
create policy "Users can update own ai favorites"
on public.ai_favorites
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own ai favorites" on public.ai_favorites;
create policy "Users can delete own ai favorites"
on public.ai_favorites
for delete
using (auth.uid() = user_id);
