-- Fix: Signed-In Users Can Execute SECURITY DEFINER Function
--
-- is_rootnova_admin() and is_business_admin() are only referenced from RLS
-- policies (internal). RLS policy evaluation invokes the function regardless
-- of EXECUTE grants, so revoke from authenticated to close the /rpc endpoint.
REVOKE EXECUTE ON FUNCTION public.is_rootnova_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_business_admin(p_business_id uuid) FROM PUBLIC, anon, authenticated;

-- claim_initial_admin() is invoked via RPC from the /setup page by signed-in
-- users, so authenticated must retain EXECUTE. Switch to SECURITY INVOKER so
-- it runs with the caller's privileges — it only UPDATEs the caller's own
-- profile row (WHERE id = auth.uid()), which the profiles_update_own RLS
-- policy already permits. This removes the privilege-escalation surface.
CREATE OR REPLACE FUNCTION public.claim_initial_admin(p_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  SELECT count(*) INTO admin_count FROM public.profiles WHERE role = 'ROOTNOVA_ADMIN';
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'A RootNova admin already exists';
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.profiles
    SET role = 'ROOTNOVA_ADMIN', full_name = COALESCE(NULLIF(p_full_name, ''), full_name)
    WHERE id = auth.uid();
END;
$$;

-- Re-grant EXECUTE on claim_initial_admin to authenticated only (not anon/PUBLIC).
REVOKE EXECUTE ON FUNCTION public.claim_initial_admin(p_full_name text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_initial_admin(p_full_name text) TO authenticated;
