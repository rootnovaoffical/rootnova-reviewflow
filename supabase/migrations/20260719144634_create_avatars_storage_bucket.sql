/*
# Create avatars storage bucket with RLS

1. New Storage Bucket
- `avatars` (public) — stores profile avatars for all internal users (super admins, partners, team members, business owners).

2. Security
- Public read (anon + authenticated) — avatars are visible across the platform.
- Upload/Update/Delete: only the owner can modify their own avatar (folder = user_id), or a RootNova admin.
- Uses existing `is_rootnova_admin()` helper.

3. Notes
- Folder structure: `avatars/<user_id>/<filename>`
- The frontend Avatar component reads from profiles.avatar_url which points to this bucket.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');

-- Owner upload (folder = user_id)
DROP POLICY IF EXISTS "avatars_owner_upload" ON storage.objects;
CREATE POLICY "avatars_owner_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND ((storage.foldername(name))[1])::uuid = auth.uid()
);

-- Owner update
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND ((storage.foldername(name))[1])::uuid = auth.uid()
)
WITH CHECK (
  bucket_id = 'avatars'
  AND ((storage.foldername(name))[1])::uuid = auth.uid()
);

-- Admin can delete any avatar
DROP POLICY IF EXISTS "avatars_admin_delete" ON storage.objects;
CREATE POLICY "avatars_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND is_rootnova_admin()
);
