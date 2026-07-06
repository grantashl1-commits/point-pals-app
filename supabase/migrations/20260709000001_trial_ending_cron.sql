-- ============================================================================
-- Trial Ending Notification — sends a nudge email ~3 days before trial expiry.
--
-- Runs once daily (0 9 * * * = 9:00 AM UTC / 9:00 PM NZT), finding
-- households whose 14-day free trial ends in 1–4 days. The edge function
-- handles idempotency via email_trial_ending_sent_at.
--
-- Auth: uses x-cron-secret header (read from Supabase Vault).
-- ============================================================================

-- Clean up if re-running
DO $$ BEGIN PERFORM cron.unschedule('notify-trial-ending'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'notify-trial-ending',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tcpbvcgvtwrqsrzerwwr.supabase.co/functions/v1/notify-trial-ending',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body    := '{}'::jsonb
  );
  $$
);
