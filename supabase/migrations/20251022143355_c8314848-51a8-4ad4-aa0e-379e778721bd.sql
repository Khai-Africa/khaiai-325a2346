-- Fix: Move extensions to the extensions schema (Supabase best practice)
-- Drop extensions from public schema if they exist there
DROP EXTENSION IF EXISTS pg_cron CASCADE;
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Recreate extensions in the extensions schema
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Recreate the payment reminder cron job since we dropped pg_cron
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