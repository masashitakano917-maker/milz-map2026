alter table public.ai_favorites
  add column if not exists canonical_key text;

update public.ai_favorites
set canonical_key = concat(
  'ai::',
  coalesce(nullif(area_key, ''), 'unknown'),
  '::',
  coalesce(nullif(lower(trim(city_name)), ''), 'all'),
  '::',
  to_char(round(lat::numeric, 4), 'FM999990.0000'),
  '::',
  to_char(round(lng::numeric, 4), 'FM999990.0000')
)
where canonical_key is null or canonical_key = '';

with grouped as (
  select
    user_id,
    canonical_key,
    min(id) as keep_id,
    min(created_at) as keep_created_at,
    jsonb_object_agg(t.key, t.value) filter (where t.key is not null) as merged_translations,
    max(category) as merged_category,
    max(reason) as merged_reason,
    max(details) as merged_details
  from public.ai_favorites f
  left join lateral jsonb_each(coalesce(f.translations, '{}'::jsonb)) as t(key, value) on true
  group by user_id, canonical_key
),
updated as (
  update public.ai_favorites f
  set
    favorite_key = f.canonical_key,
    created_at = g.keep_created_at,
    translations = coalesce(g.merged_translations, f.translations, '{}'::jsonb),
    name = coalesce(
      g.merged_translations -> 'jp' ->> 'name',
      g.merged_translations -> 'en' ->> 'name',
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
  returning f.id
)
delete from public.ai_favorites f
using grouped g
where f.user_id = g.user_id
  and f.canonical_key = g.canonical_key
  and f.id <> g.keep_id;

create unique index if not exists ai_favorites_user_canonical_key_unique_idx
  on public.ai_favorites(user_id, canonical_key);
