-- Fix PUBLIC_DATA_EXPOSURE: Restrict payment_providers to admin only
DROP POLICY IF EXISTS "Anyone can view active payment providers" ON payment_providers;

CREATE POLICY "Admins can view payment providers"
ON payment_providers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix MISSING_RLS: Add admin access to profiles
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));