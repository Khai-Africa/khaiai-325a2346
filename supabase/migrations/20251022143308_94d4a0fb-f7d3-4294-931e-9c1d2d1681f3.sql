-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule the job if it already exists (to allow updates)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-payment-reminders') THEN
    PERFORM cron.unschedule('daily-payment-reminders');
  END IF;
END $$;

-- Schedule the payment reminder cron job
-- Runs daily at 9:00 AM UTC
SELECT cron.schedule(
  'daily-payment-reminders',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://olofegxhytctncyhsmpy.supabase.co/functions/v1/check-payment-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sb2ZlZ3hoeXRjdG5jeWhzbXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTYwNTUsImV4cCI6MjA3NjU3MjA1NX0.fzvter_Y_YKinrt09Ca64luIc2v333SEnJj1ZxmXxuM"}'::jsonb,
      body:=concat('{"triggered_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);