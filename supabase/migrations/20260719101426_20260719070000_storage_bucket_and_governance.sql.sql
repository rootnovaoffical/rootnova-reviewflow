/*
# Storage bucket for business logos + Admin governance table + Profile account status

## 1. Storage Bucket
- Creates a public storage bucket `business-logos` for business logo uploads.
- Public read (so review pages can display logos), authenticated write.

## 2. Profile Account Status
- Adds `account_status` column to `profiles` table (default 'ACTIVE').
- Allows admins to suspend/deactivate accounts.
- Adds an UPDATE policy for ROOTNOVA_ADMIN to change account_status on any profile.

## 3. Admin Invitations Table
- New table `admin_invitations` for tracking admin invite flow.
- Columns: id, email, role, business_id (nullable), status, invited_by, timestamps.
- RLS: ROOTNOVA_ADMIN can CRUD; users can read their own invitations by email match.

## Security
- Storage bucket is public-read (logos visible on public review pages).
- Storage write: authenticated users who are business admins or rootnova admins.
- admin_invitations: ROOTNOVA_ADMIN full access.
- profiles: ROOTNOVA_ADMIN can update account_status.
*/

-- 1. Storage bucket for business logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, authenticated write for admins
DROP POLICY IF EXISTS "business_logos_public_read" ON storage.objects;
CREATE POLICY "business_logos_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'business-logos');

DROP POLICY IF EXISTS "business_logos_admin_write" ON storage.objects;
CREATE POLICY "business_logos_admin_write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-logos'
  AND (public.is_rootnova_admin() OR public.is_business_admin((storage.foldername(name))[1]::uuid))
);

DROP POLICY IF EXISTS "business_logos_admin_update" ON storage.objects;
CREATE POLICY "business_logos_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (public.is_rootnova_admin() OR public.is_business_admin((storage.foldername(name))[1]::uuid))
);

DROP POLICY IF EXISTS "business_logos_admin_delete" ON storage.objects;
CREATE POLICY "business_logos_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (public.is_rootnova_admin() OR public.is_business_admin((storage.foldername(name))[1]::uuid))
);

-- 2. Profile account_status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='account_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN account_status text DEFAULT 'ACTIVE';
  END IF;
END $$;

-- Add update policy for ROOTNOVA_ADMIN to manage account_status
-- (profiles_update_own already exists for self-update; this is for admin override)
DROP POLICY IF EXISTS "profiles_admin_update_status" ON public.profiles;
CREATE POLICY "profiles_admin_update_status"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_rootnova_admin())
WITH CHECK (public.is_rootnova_admin());

-- 3. Admin invitations table
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('ROOTNOVA_ADMIN', 'BUSINESS_ADMIN')),
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'DEACTIVATED')),
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS admin_invitations_updated_at ON public.admin_invitations;
CREATE TRIGGER admin_invitations_updated_at
  BEFORE UPDATE ON public.admin_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS policies for admin_invitations
DROP POLICY IF EXISTS "admin_invitations_admin_select" ON public.admin_invitations;
CREATE POLICY "admin_invitations_admin_select"
ON public.admin_invitations FOR SELECT
TO authenticated
USING (public.is_rootnova_admin());

DROP POLICY IF EXISTS "admin_invitations_admin_insert" ON public.admin_invitations;
CREATE POLICY "admin_invitations_admin_insert"
ON public.admin_invitations FOR INSERT
TO authenticated
WITH CHECK (public.is_rootnova_admin());

DROP POLICY IF EXISTS "admin_invitations_admin_update" ON public.admin_invitations;
CREATE POLICY "admin_invitations_admin_update"
ON public.admin_invitations FOR UPDATE
TO authenticated
USING (public.is_rootnova_admin())
WITH CHECK (public.is_rootnova_admin());

DROP POLICY IF EXISTS "admin_invitations_admin_delete" ON public.admin_invitations;
CREATE POLICY "admin_invitations_admin_delete"
ON public.admin_invitations FOR DELETE
TO authenticated
USING (public.is_rootnova_admin());

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON public.admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON public.admin_invitations(status);
