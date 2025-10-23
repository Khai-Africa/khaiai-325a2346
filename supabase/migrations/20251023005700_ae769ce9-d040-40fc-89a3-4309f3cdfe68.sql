-- Add secret_word column to profiles table for password recovery
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS secret_word TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_secret_word ON public.profiles(secret_word);