-- Background verifier job: every minute, ask the app to send pending attempts to the
-- IndicConformer verifier. If the verifier is asleep, attempts simply stay 'pending'.
-- Requires the pg_cron and pg_net extensions (enable them in the Supabase dashboard).
-- Set the two settings below once per project:
--   alter database postgres set app.jobs_url = 'https://<your-app>.vercel.app/api/jobs/verify';
--   alter database postgres set app.jobs_secret = '<JOBS_SECRET>';

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'phirse-verify-pending',
  '* * * * *',
  $$
  select net.http_post(
    url := current_setting('app.jobs_url', true),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-jobs-secret', current_setting('app.jobs_secret', true)
    ),
    body := '{}'::jsonb
  )
  where current_setting('app.jobs_url', true) is not null
    and exists (select 1 from public.attempt where verifier_status = 'pending' and verifier_attempts < 3);
  $$
);

-- Judge-mode sessions are deleted after 24 hours.
select cron.schedule(
  'phirse-purge-judge-sessions',
  '17 * * * *',
  $$ delete from public.session where kind = 'judge_demo' and started_at < now() - interval '24 hours'; $$
);
