-- Remove insecure secret_word_hash column and add proper password reset tokens
ALTER TABLE public.profiles DROP COLUMN IF EXISTS secret_word_hash;

-- Create table for secure password reset tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access tokens (backend only)
CREATE POLICY "Service role can manage reset tokens"
ON public.password_reset_tokens
FOR ALL
USING (auth.role() = 'service_role');

-- Create indexes for faster token lookups
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires ON public.password_reset_tokens(expires_at);

-- Auto-cleanup expired tokens (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$;