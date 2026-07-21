
-- Fix infinite RLS recursion by making helper functions SECURITY DEFINER
-- is_business_admin and is_rootnova_admin were NOT security definer,
-- causing infinite recursion when RLS policies on business_admins/profiles
-- called these functions which in turn queried those same tables.

-- Fix is_rootnova_admin: make it SECURITY DEFINER so it bypasses RLS on profiles
CREATE OR REPLACE FUNCTION public.is_rootnova_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN')
  );
$$;

-- Fix is_business_admin: make it SECURITY DEFINER so it bypasses RLS on business_admins
CREATE OR REPLACE FUNCTION public.is_business_admin(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_admins ba
    WHERE ba.business_id = p_business_id AND ba.user_id = auth.uid()
  );
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.is_rootnova_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_admin(UUID) TO authenticated;
