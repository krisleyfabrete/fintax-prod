-- 0003_cron_schedules.sql
-- Agendamentos via pg_cron. Os URLs abaixo devem ser o URL público da Edge Function.
-- Configure PROJECT_URL e FUNCTIONS_TOKEN via `supabase secrets set` ou via env injection.

do $$
declare
  base_url text;
  fn_token text;
  cron_secret text;
begin
  base_url := current_setting('app.project_url', true);
  fn_token := current_setting('app.functions_token', true);
  cron_secret := current_setting('app.cron_secret', true);

  if base_url is null then base_url := ''; end if;
  if fn_token is null then fn_token := ''; end if;
  if cron_secret is null then cron_secret := ''; end if;

  -- Remove jobs antigos se existirem
  perform cron.unschedule('check-pending-pix-job') where exists (select 1 from cron.job where jobname = 'check-pending-pix-job');
  perform cron.unschedule('pix-renewal-reminders-job') where exists (select 1 from cron.job where jobname = 'pix-renewal-reminders-job');
  perform cron.unschedule('process-auto-deposits-job') where exists (select 1 from cron.job where jobname = 'process-auto-deposits-job');
  perform cron.unschedule('goal-reminders-job') where exists (select 1 from cron.job where jobname = 'goal-reminders-job');

  -- Cada job chama uma edge function via pg_net
  perform cron.schedule(
    'check-pending-pix-job', '*/15 * * * *',
    format($cmd$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),
        body := '{}'::jsonb
      );
    $cmd$, base_url || '/functions/v1/check-pending-pix', cron_secret)
  );

  perform cron.schedule(
    'pix-renewal-reminders-job', '0 */6 * * *',
    format($cmd$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),
        body := '{}'::jsonb
      );
    $cmd$, base_url || '/functions/v1/pix-renewal-reminders', cron_secret)
  );

  perform cron.schedule(
    'process-auto-deposits-job', '0 8 * * *',
    format($cmd$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',%L),
        body := '{}'::jsonb
      );
    $cmd$, base_url || '/functions/v1/process-auto-deposits', cron_secret)
  );

  perform cron.schedule(
    'goal-reminders-job', '0 9 * * *',
    format($cmd$
      select net.http_post(
        url := %L,
        headers := jsonb_object('Content-Type','application/json','x-cron-secret',%L),
        body := '{}'::jsonb
      );
    $cmd$, base_url || '/functions/v1/goal-reminders', cron_secret)
  );
end $$;