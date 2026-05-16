# RLS Audit — public schema

Generated: 2026-05-16

Source of truth: `pg_policies` + `pg_tables.rowsecurity` (live database).
Re-run with the SQL at the bottom of this file.

## Summary

- All 16 public tables have RLS enabled.
- Anonymous (anon) SELECT is granted to: `admin_places`, `admin_filter_options`, `ai_cache`, `ai_recommendation_metrics`, `ai_trend_spots`, `ai_trend_mentions`, `ai_trend_weekly`, `stations`, `profiles` (after fix: authenticated only).
- Anonymous INSERT is granted only to `milz_events` (analytics, by design, no PII fields).
- All other writes require `authenticated` and check `auth.uid() = <owner column>` or admin role.
- `email_verification_tokens` has no policies → only service_role (edge functions) can access. Correct.

## Findings

### Fixed

- `profiles` exposed `email` to anonymous users via `Public profiles are viewable USING (true) TO public`.
  - All call sites read profiles inside authenticated flows (admin views, signed-in user checks).
  - Tightened SELECT role from `public` → `authenticated`.
- `admin_places` write policies allowed any authenticated user whose `auth.uid()`
  matched `created_by` to INSERT/UPDATE/DELETE rows. Spot management is admin-only
  per product spec; the front-end UI hid the controls but the API was open.
  Replaced with admin-only INSERT/UPDATE/DELETE policies. Public SELECT unchanged.

### Accepted as designed

| Table | Public read | Notes |
| --- | --- | --- |
| admin_places | yes | Public catalog of curated places. |
| admin_filter_options | yes | Filter chips shown on landing pages. |
| ai_trend_spots / ai_trend_mentions / ai_trend_weekly | yes | Public trend feed. |
| ai_cache | yes | Generated text cache. No PII. |
| ai_recommendation_metrics | yes | Aggregate counters. No PII. |
| stations | yes | Public station master. |
| milz_events INSERT (anon) | yes | Pageview/click analytics, no auth required. Schema does not store PII. |

### Watch list (low risk)

- `place_translations`: any authenticated user can INSERT/UPDATE rows (`WITH CHECK (true)`).
  Acts as a shared translation cache. A malicious authenticated user could poison
  cached translations. Mitigation if it ever becomes a problem: restrict writes
  to admins or hash-verify inputs server-side.

## Per-table policies

```text
admin_filter_options
  SELECT  public         USING (true)
  INSERT  authenticated  WITH CHECK (admin)
  UPDATE  authenticated  USING (admin) / WITH CHECK (admin)
  DELETE  authenticated  USING (admin)

admin_places
  SELECT  public         USING (true)
  INSERT  authenticated  WITH CHECK (admin)
  UPDATE  authenticated  USING (admin) / WITH CHECK (admin)
  DELETE  authenticated  USING (admin)

ai_cache
  SELECT  public         USING (true)
  INSERT  authenticated  WITH CHECK (auth.uid() IS NOT NULL)
  UPDATE  authenticated  USING (auth.uid() IS NOT NULL) / WITH CHECK (...)

ai_editor_suggestions
  SELECT  authenticated  USING (own OR admin)
  INSERT  authenticated  WITH CHECK (auth.uid() = user_id)
  UPDATE  authenticated  USING (admin) / WITH CHECK (admin)
  DELETE  authenticated  USING (own AND status='pending')

ai_favorites / ai_trend_favorites / favorites
  SELECT/INSERT/UPDATE/DELETE  authenticated  (auth.uid() = user_id)

ai_recommendation_metrics
  SELECT  public         USING (true)
  INSERT  authenticated  WITH CHECK (auth.uid() IS NOT NULL)
  UPDATE  authenticated  USING (auth.uid() IS NOT NULL)

ai_trend_spots / ai_trend_mentions / ai_trend_weekly
  SELECT  public         USING (true)
  (writes: service_role only)

email_verification_tokens
  (no policies — service_role only)

milz_events
  SELECT  authenticated  USING (admin)
  INSERT  anon,authenticated  WITH CHECK (true)

place_translations
  SELECT  authenticated  USING (true)
  INSERT  authenticated  WITH CHECK (true)
  UPDATE  authenticated  USING (true) / WITH CHECK (true)

profiles  (after fix)
  SELECT  authenticated  USING (true)
  INSERT  authenticated  WITH CHECK (auth.uid() = id)
  UPDATE  authenticated  USING (auth.uid() = id) / WITH CHECK (auth.uid() = id)

stations
  SELECT  anon,authenticated  USING (true)
```

## Re-run

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename;

SELECT tablename, policyname, cmd, roles::text, qual, with_check
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, cmd, policyname;
```
