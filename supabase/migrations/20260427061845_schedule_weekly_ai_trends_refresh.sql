/*
  # Schedule weekly AI trends refresh

  1. Extensions
    - Enable `pg_cron` for scheduling jobs
    - Enable `pg_net` for async HTTP from Postgres

  2. Schedules (all times UTC)
    - `refresh-ai-trends-weekly`: every Sunday 22:00 UTC (= Monday 07:00 JST)
    - `translate-trend-spots-jp-weekly`: every Sunday 22:30 UTC (= Monday 07:30 JST)
      runs 30 min after refresh so newly inserted English spots get a JP variant.

  3. Notes
    - Edge functions are invoked anonymously (verify_jwt=false) via pg_net.
    - If the URL or service architecture changes, update via cron.unschedule + cron.schedule.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  v_jobid bigint;
BEGIN
  FOR v_jobid IN
    SELECT jobid FROM cron.job
    WHERE jobname IN ('refresh-ai-trends-weekly', 'translate-trend-spots-jp-weekly')
  LOOP
    PERFORM cron.unschedule(v_jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'refresh-ai-trends-weekly',
  '0 22 * * 0',
  $cron$
  SELECT net.http_post(
    url := 'https://eiaenewzpunsdkeshyku.supabase.co/functions/v1/refresh-ai-trends',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $cron$
);

SELECT cron.schedule(
  'translate-trend-spots-jp-weekly',
  '30 22 * * 0',
  $cron$
  SELECT net.http_post(
    url := 'https://eiaenewzpunsdkeshyku.supabase.co/functions/v1/translate-trend-spots-jp?limit=200',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $cron$
);
