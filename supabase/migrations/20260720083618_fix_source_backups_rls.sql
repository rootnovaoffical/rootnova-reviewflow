-- P0-1: Restrict source_backups RLS policies to RootNova staff only
-- Previously: SELECT and INSERT were open to ALL authenticated users
-- Now: SELECT restricted to RootNova staff (super admin + admin)
--       INSERT restricted to RootNova super admin only

-- Drop existing unsafe policies
DROP POLICY IF EXISTS select_source_backups ON public.source_backups;
DROP POLICY IF EXISTS insert_source_backups ON public.source_backups;

-- SELECT: only RootNova staff can read source backups
CREATE POLICY select_source_backups ON public.source_backups
  FOR SELECT TO authenticated
  USING (public.is_rootnova_staff());

-- INSERT: only RootNova super admin can create source backups
CREATE POLICY insert_source_backups ON public.source_backups
  FOR INSERT TO authenticated
  WITH CHECK (public.is_rootnova_super_admin());
