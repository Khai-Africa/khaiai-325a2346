
-- Restrict in_app_notifications inserts to the authenticated user's own user_id
DROP POLICY IF EXISTS "System can create notifications" ON public.in_app_notifications;

CREATE POLICY "Users can create their own notifications"
ON public.in_app_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can create notifications"
ON public.in_app_notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Restrict email_logs inserts to service_role only
DROP POLICY IF EXISTS "System can insert email logs" ON public.email_logs;

CREATE POLICY "Service role can insert email logs"
ON public.email_logs
FOR INSERT
TO service_role
WITH CHECK (true);
