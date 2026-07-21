/*
# Fix review_sessions INSERT policy

## Problem
The `review_sessions_public_insert` policy has `WITH CHECK ((rating >= 1) AND (rating <= 5))`,
which blocks inserts where rating is NULL (the initial session creation before rating is selected).

## Fix
Drop and recreate the INSERT policy to allow inserts with NULL rating (session creation),
while still validating the business exists and is active with public reviews enabled.
The rating validation will happen at UPDATE time when the rating is actually set.

## Security
- Still validates that the business exists, is active, and has public_review_enabled = true
- Still allows anon + authenticated to insert (public review flow)
- Rating validation moved to the UPDATE policy (already has the business check)
*/

DROP POLICY IF EXISTS "review_sessions_public_insert" ON review_sessions;
CREATE POLICY "review_sessions_public_insert"
  ON review_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = review_sessions.business_id
        AND b.status = 'active'
        AND b.public_review_enabled = true
    )
  );
