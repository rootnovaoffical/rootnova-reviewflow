/*
# Storage Buckets: Payment Proofs (private) + Platform Assets (private)

## 1. payment-proofs bucket
- PRIVATE bucket for partner payment screenshot uploads.
- Partners can upload their own payment proofs.
- Only RootNova staff can read/review payment proofs.
- Partners can read their own org's payment proofs via signed URLs.

## 2. platform-assets bucket
- PRIVATE bucket for RootNova global branding assets (logos, UPI QR).
- Only RootNova Super Admin can upload/update.
- Public read for active assets (logos shown on login page etc).
*/

-- payment-proofs bucket (PRIVATE)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- platform-assets bucket (PUBLIC read for logos, PRIVATE write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PAYMENT PROOFS STORAGE POLICIES
-- ============================================================
-- Partners can upload to their org's folder: <org_id>/<filename>
DROP POLICY IF EXISTS "payment_proofs_partner_upload" ON storage.objects;
CREATE POLICY "payment_proofs_partner_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1]::uuid = public.user_organization_id()
);

-- RootNova staff can read all payment proofs
DROP POLICY IF EXISTS "payment_proofs_staff_read" ON storage.objects;
CREATE POLICY "payment_proofs_staff_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.is_rootnova_staff()
);

-- Partners can read their own org's payment proofs
DROP POLICY IF EXISTS "payment_proofs_partner_read" ON storage.objects;
CREATE POLICY "payment_proofs_partner_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1]::uuid = public.user_organization_id()
);

-- RootNova staff can delete payment proofs
DROP POLICY IF EXISTS "payment_proofs_staff_delete" ON storage.objects;
CREATE POLICY "payment_proofs_staff_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.is_rootnova_staff()
);

-- ============================================================
-- PLATFORM ASSETS STORAGE POLICIES
-- ============================================================
-- Public read for active platform assets
DROP POLICY IF EXISTS "platform_assets_public_read" ON storage.objects;
CREATE POLICY "platform_assets_public_read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'platform-assets');

-- Only RootNova Super Admin can upload
DROP POLICY IF EXISTS "platform_assets_admin_upload" ON storage.objects;
CREATE POLICY "platform_assets_admin_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'platform-assets'
  AND public.is_rootnova_super_admin()
);

-- Only RootNova Super Admin can update
DROP POLICY IF EXISTS "platform_assets_admin_update" ON storage.objects;
CREATE POLICY "platform_assets_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'platform-assets'
  AND public.is_rootnova_super_admin()
)
WITH CHECK (
  bucket_id = 'platform-assets'
  AND public.is_rootnova_super_admin()
);

-- Only RootNova Super Admin can delete
DROP POLICY IF EXISTS "platform_assets_admin_delete" ON storage.objects;
CREATE POLICY "platform_assets_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'platform-assets'
  AND public.is_rootnova_super_admin()
);
