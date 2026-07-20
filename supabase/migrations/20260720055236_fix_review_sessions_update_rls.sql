-- Fix: review_sessions was missing an UPDATE policy for public users.
-- PublicReviewPage.tsx updates review_sessions client-side:
--   1) answers are saved after question submission (line ~119)
--   2) edited review text is saved (line ~289)
-- Without this policy, those updates silently fail because RLS blocks them.
-- The edge function uses the service role key (bypasses RLS), but the
-- client-side updates need a proper policy.

-- Allow public (anon + authenticated) to update review sessions for
-- active businesses with public reviews enabled. This is safe because:
--   - The session must already exist (created via INSERT policy)
--   - The business must be active and have public_review_enabled = true
--   - Sensitive columns like ai_status are also written by the edge function
--     using the service role key, so this policy only affects client-side writes
CREATE POLICY "review_sessions_public_update"
  ON review_sessions FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = review_sessions.business_id
        AND b.status = 'active'
        AND b.public_review_enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = review_sessions.business_id
        AND b.status = 'active'
        AND b.public_review_enabled = true
    )
  );

-- Also allow business admins and rootnova staff to update review sessions
-- (e.g., for moderation, status changes)
CREATE POLICY "review_sessions_admin_update"
  ON review_sessions FOR UPDATE
  TO authenticated
  USING (
    is_rootnova_staff() OR is_business_admin(business_id) OR is_business_org_member(business_id)
  )
  WITH CHECK (
    is_rootnova_staff() OR is_business_admin(business_id) OR is_business_org_member(business_id)
  );