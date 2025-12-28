-- Fix 1: Drop overly permissive "Profiles are viewable by everyone" policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Fix 2: Add secret_word_hash column for secure storage
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS secret_word_hash TEXT;

-- Fix 3: Create a function to hash secret words using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to hash secret words on insert/update
CREATE OR REPLACE FUNCTION public.hash_secret_word()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If secret_word is provided and changed, hash it and clear plaintext
  IF NEW.secret_word IS NOT NULL AND NEW.secret_word != '' THEN
    NEW.secret_word_hash := crypt(LOWER(NEW.secret_word), gen_salt('bf', 10));
    NEW.secret_word := NULL; -- Clear plaintext after hashing
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-hash secret words
DROP TRIGGER IF EXISTS hash_secret_word_trigger ON public.profiles;
CREATE TRIGGER hash_secret_word_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.hash_secret_word();

-- Create a secure function to verify secret words (for use in edge functions)
CREATE OR REPLACE FUNCTION public.verify_secret_word(user_id UUID, provided_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT secret_word_hash INTO stored_hash
  FROM public.profiles
  WHERE id = user_id;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN stored_hash = crypt(LOWER(provided_secret), stored_hash);
END;
$$;