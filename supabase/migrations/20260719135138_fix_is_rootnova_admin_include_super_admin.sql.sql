/*
# Fix is_rootnova_admin() to include ROOTNOVA_SUPER_ADMIN

## Why
The existing `is_rootnova_admin()` function checks ONLY `profiles.role = 'ROOTNOVA_ADMIN'`,
excluding `ROOTNOVA_SUPER_ADMIN`. Several RLS policies (admin_invitations, business_admins,
profiles admin update) rely on `is_rootnova_admin()`, which means the Super Admin cannot
manage business admins or admin invitations — a critical authorization gap.

## Change
Recreate `is_rootnova_admin()` to check `role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN')`,
matching the same pattern already used by `is_rootnova_staff()`.

## Security impact
- ROOTNOVA_SUPER_ADMIN now has access to admin_invitations and business_admins management,
  which is the intended behavior for platform-wide control.
- ROOTNOVA_ADMIN permissions are unchanged.
- No partner or business admin access is affected.
- This is additive — it grants more access to the super admin, never less.

## Important notes
1. The function remains INVOKER security type (unchanged).
2. `is_rootnova_staff()` already covers both roles and is unaffected.
3. `is_rootnova_super_admin()` is separate and unaffected.
4. No data is modified or deleted.
*/

CREATE OR REPLACE FUNCTION public.is_rootnova_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
SELECT EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN')
);
$function$;
