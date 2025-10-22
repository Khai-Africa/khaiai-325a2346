-- Drop the insecure public SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create secure policy: users can only view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- For public username lookups during login, we'll use the auth-login edge function
-- which uses service role key to bypass RLS securely