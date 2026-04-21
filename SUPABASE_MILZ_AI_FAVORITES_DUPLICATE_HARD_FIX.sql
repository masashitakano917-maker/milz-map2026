drop index if exists public.ai_favorites_user_canonical_key_unique_idx;

alter table public.ai_favorites
  add column if not exists canonical_key text;

update public.ai_favorites
set canonical_key = concat(
  'ai::',
  coalesce(nullif(area_key, ''), 'unknown'),
  '::',
  coalesce(nullif(lower(trim(city_name)), ''), 'all'),
  '::',
  to_char(round(lat::numeric, 3), 'FM999990.000'),
  '::',
  to_char(round(lng::numeric, 3), 'FM999990.000')
),
favorite_key = concat(
  'ai::',
  coalesce(nullif(area_key, ''), 'unknown'),
  '::',
  coalesce(nullif(lower(trim(city_name)), ''), 'all'),
  '::',
  to_char(round(lat::numeric, 3), 'FM999990.000'),
  '::',
  to_char(round(lng::numeric, 3), 'FM999990.000')
)
where lat is not null and lng is not null;

with grouped as (
  select
    f.user_id,
    f.canonical_key,
    (array_agg(f.id order by f.created_at asc nulls last, f.id::text asc))[1] as keep_id,
    min(f.created_at) as keep_created_at,
    jsonb_object_agg(t.key, t.value) filter (where t.key is not null) as merged_translations,
    max(f.name) as merged_name,
    max(f.reason) as merged_reason,
    max(f.details) as merged_details,
    max(f.category) as merged_category
  from public.ai_favorites f
  left join lateral jsonb_each(coalesce(f.translations, '{}'::jsonb)) as t(key, value) on true
  where f.canonical_key is not null and f.canonical_key <> ''
  group by f.user_id, f.canonical_key
),
updated as (
  update public.ai_favorites f
  set
    favorite_key = g.canonical_key,
    canonical_key = g.canonical_key,
    created_at = coalesce(g.keep_created_at, f.created_at),
    translations = coalesce(g.merged_translations, f.translations, '{}'::jsonb),
    name = coalesce(
      g.merged_translations -> 'jp' ->> 'name',
      g.merged_translations -> 'en' ->> 'name',
      g.merged_name,
      f.name
    ),
    reason = coalesce(
      g.merged_translations -> 'jp' ->> 'reason',
      g.merged_translations -> 'en' ->> 'reason',
      g.merged_reason,
      f.reason
    ),
    details = coalesce(
      g.merged_translations -> 'jp' ->> 'details',
      g.merged_translations -> 'en' ->> 'details',
      g.merged_details,
      f.details,
      f.reason
    ),
    category = coalesce(
      g.merged_translations -> 'jp' ->> 'category',
      g.merged_translations -> 'en' ->> 'category',
      g.merged_category,
      f.category
    )
  from grouped g
  where f.id = g.keep_id
)
delete from public.ai_favorites f
using grouped g
where f.user_id = g.user_id
  and f.canonical_key = g.canonical_key
  and f.id <> g.keep_id;

create unique index if not exists ai_favorites_user_canonical_key_unique_idx
  on public.ai_favorites(user_id, canonical_key);
