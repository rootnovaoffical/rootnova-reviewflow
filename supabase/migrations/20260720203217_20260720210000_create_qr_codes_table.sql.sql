/*
# QR Management — qr_codes table

## Purpose
Creates the foundational table for the RootNova ReviewFlow QR Management module.
This is a scalable foundation designed to eventually support multiple QR types
(ReviewFlow, Menu, WhatsApp, Website, Campaign, Custom destination) and
scan tracking — without requiring schema changes later.

## New Table: qr_codes
- id (uuid, primary key)
- business_id (uuid, FK to businesses.id, ON DELETE CASCADE)
- name (text, not null) — human-friendly label the business owner gives the QR
- qr_type (text, not null, default 'reviewflow') — supports future types:
  reviewflow | menu | whatsapp | website | campaign | custom
- destination_url (text, not null) — the URL the QR encodes
- status (text, not null, default 'active') — active | inactive
- scan_count (integer, not null, default 0) — scan tracking foundation
- metadata (jsonb, default '{}') — extensible future fields (e.g. campaign tags, expiry)
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

## Security
- RLS enabled on qr_codes.
- 4 separate CRUD policies scoped to authenticated business admins who own the business.
- Ownership verified via business_admins table (same pattern as existing questions/reviews).
- No public/anon access — QR management is a business-owner-only feature.

## Indexes
- business_id (for listing QR codes per business)
- (business_id, status) (for filtering active/inactive)

## Notes
1. This migration does NOT modify any existing table, migration, or RLS policy.
2. The frozen customer-facing ReviewFlow Core is completely untouched.
3. The existing basic QR display in MyBusiness remains unchanged — this adds a dedicated management page.
4. scan_count is a foundation for future QR analytics; it is not incremented by this migration.
*/

CREATE TABLE IF NOT EXISTS qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  qr_type text NOT NULL DEFAULT 'reviewflow',
  destination_url text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  scan_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Business admins can read QR codes for businesses they own
DROP POLICY IF EXISTS "select_own_qr_codes" ON qr_codes;
CREATE POLICY "select_own_qr_codes" ON qr_codes FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM business_admins
      WHERE business_admins.business_id = qr_codes.business_id
      AND business_admins.user_id = auth.uid()
    )
  );

-- Business admins can insert QR codes for businesses they own
DROP POLICY IF EXISTS "insert_own_qr_codes" ON qr_codes;
CREATE POLICY "insert_own_qr_codes" ON qr_codes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_admins
      WHERE business_admins.business_id = qr_codes.business_id
      AND business_admins.user_id = auth.uid()
    )
  );

-- Business admins can update QR codes for businesses they own
DROP POLICY IF EXISTS "update_own_qr_codes" ON qr_codes;
CREATE POLICY "update_own_qr_codes" ON qr_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM business_admins
      WHERE business_admins.business_id = qr_codes.business_id
      AND business_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_admins
      WHERE business_admins.business_id = qr_codes.business_id
      AND business_admins.user_id = auth.uid()
    )
  );

-- Business admins can delete QR codes for businesses they own
DROP POLICY IF EXISTS "delete_own_qr_codes" ON qr_codes;
CREATE POLICY "delete_own_qr_codes" ON qr_codes FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM business_admins
      WHERE business_admins.business_id = qr_codes.business_id
      AND business_admins.user_id = auth.uid()
    )
  );

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_qr_codes_business_id ON qr_codes(business_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_business_status ON qr_codes(business_id, status);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_qr_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_qr_codes_updated_at ON qr_codes;
CREATE TRIGGER trigger_qr_codes_updated_at
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_qr_codes_updated_at();
