-- Add unique constraint to prevent duplicate tokens per user per provider
ALTER TABLE public.user_tokens 
ADD CONSTRAINT user_tokens_user_id_provider_key 
UNIQUE (user_id, provider);