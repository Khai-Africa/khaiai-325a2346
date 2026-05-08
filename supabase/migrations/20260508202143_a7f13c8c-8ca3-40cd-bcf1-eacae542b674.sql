
-- Revoke EXECUTE from anon/authenticated on internal SECURITY DEFINER functions.
-- These are either trigger functions or are only invoked from edge functions
-- using the service_role (which retains all privileges).

REVOKE EXECUTE ON FUNCTION public.hash_secret_word() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.hash_reset_token() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_conversation_timestamp() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_reset_tokens() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.verify_secret_word(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.verify_reset_token(text) FROM anon, authenticated, public;

-- has_role is referenced inside RLS policies but evaluated by the policy
-- engine using the table owner's privileges (SECURITY DEFINER), so we can
-- safely revoke direct EXECUTE from clients without breaking RLS checks.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
