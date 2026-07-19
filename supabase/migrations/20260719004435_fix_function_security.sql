-- Fix: Function Search Path Mutable
-- Pin search_path on the two helper/trigger functions that lacked it.
ALTER FUNCTION public.url_encode(p_text text) SET search_path TO 'public';
ALTER FUNCTION public.set_updated_at() SET search_path TO 'public';

-- Fix: Public Can Execute SECURITY DEFINER Function
-- Revoke EXECUTE from anon and PUBLIC on all SECURITY DEFINER functions.
-- For trigger-only functions (derive_google_review_url, handle_new_user),
-- revoke from authenticated too — they are never invoked via RPC.
-- For RLS helper functions (is_business_admin, is_rootnova_admin) and the
-- first-admin claim function (claim_initial_admin), keep EXECUTE on
-- authenticated because they are invoked from RLS policies / RPC by signed-in
-- users and rely on auth.uid().

REVOKE EXECUTE ON FUNCTION public.derive_google_review_url() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_initial_admin(p_full_name text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_business_admin(p_business_id uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_rootnova_admin() FROM PUBLIC, anon;

-- Also lock down the two non-SECURITY-DEFINER helpers to internal use only.
REVOKE EXECUTE ON FUNCTION public.url_encode(p_text text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
