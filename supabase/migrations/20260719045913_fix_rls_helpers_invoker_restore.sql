-- Revert: revoking EXECUTE on is_rootnova_admin / is_business_admin from
-- authenticated broke RLS policy evaluation (profiles_select_own_or_admin
-- and others call these functions), causing signed-in SELECTs to error and
-- the UI to hang on "loading profile".
--
-- Correct mitigation: keep EXECUTE on authenticated (RLS needs it), revoke
-- from anon/PUBLIC (closes the unauthenticated /rpc surface), and switch to
-- SECURITY INVOKER so a /rpc call by a signed-in user cannot escalate
-- privileges. Both functions only SELECT tables the caller already has RLS
-- access to, so INVOKER is safe.

CREATE OR REPLACE FUNCTION public.is_rootnova_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'ROOTNOVA_ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_admin(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_admins ba
    WHERE ba.business_id = p_business_id AND ba.user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_rootnova_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_business_admin(p_business_id uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_rootnova_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_admin(p_business_id uuid) TO authenticated;
