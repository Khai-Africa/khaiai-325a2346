-- Add token_hash column for secure storage of password reset tokens
ALTER TABLE public.password_reset_tokens 
ADD COLUMN IF NOT EXISTS token_hash TEXT;

-- Create function to hash tokens on insert (keeping original token column for backward compatibility)
CREATE OR REPLACE FUNCTION public.hash_reset_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hash the token using SHA-256 and store it
  IF NEW.token IS NOT NULL AND NEW.token != '' THEN
    NEW.token_hash := encode(digest(NEW.token, 'sha256'), 'hex');
    -- Clear plaintext token after hashing for security
    NEW.token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-hash reset tokens
DROP TRIGGER IF EXISTS hash_reset_token_trigger ON public.password_reset_tokens;
CREATE TRIGGER hash_reset_token_trigger
  BEFORE INSERT OR UPDATE ON public.password_reset_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_reset_token();

-- Create function to verify reset tokens (compares against hashed value)
CREATE OR REPLACE FUNCTION public.verify_reset_token(provided_token TEXT)
RETURNS TABLE(user_id UUID, is_valid BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashed_token TEXT;
  found_user_id UUID;
  token_valid BOOLEAN := FALSE;
BEGIN
  hashed_token := encode(digest(provided_token, 'sha256'), 'hex');
  
  SELECT prt.user_id INTO found_user_id
  FROM public.password_reset_tokens prt
  WHERE prt.token_hash = hashed_token
    AND prt.expires_at > NOW()
    AND prt.used = FALSE
  LIMIT 1;
  
  IF found_user_id IS NOT NULL THEN
    token_valid := TRUE;
    -- Mark token as used
    UPDATE public.password_reset_tokens 
    SET used = TRUE 
    WHERE token_hash = hashed_token;
  END IF;
  
  RETURN QUERY SELECT found_user_id, token_valid;
END;
$$;