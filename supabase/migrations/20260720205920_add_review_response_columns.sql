/*
# Add business response columns to review_sessions

1. Purpose
   Enables business owners to respond to customer reviews directly from the
   Review Intelligence dashboard. This adds a lightweight response management
   layer on top of the existing review_sessions table without modifying any
   existing columns, migrations, or policies.

2. Changes to existing tables
   - review_sessions: add `business_response` (text, nullable) — the owner's
     written response to a customer review.
   - review_sessions: add `business_response_at` (timestamptz, nullable) —
     timestamp marking when the response was submitted.

3. Security
   - No new tables created.
   - No existing RLS policies modified or removed.
   - The existing `review_sessions_admin_update` policy already allows
     business admins (and RootNova staff / org members) to UPDATE rows on
     review_sessions, so updating the new columns is already covered by the
     current policy set. No new policies are needed.
   - The existing `review_sessions_admin_select` policy already allows
     business admins to SELECT these new columns.

4. Important notes
   - Both new columns are nullable so existing rows are unaffected.
   - This migration is purely additive — no data is lost or transformed.
   - The public customer-facing ReviewFlow Core (generate-review edge function,
     PublicReviewPage, public RLS policies) is completely untouched.
*/

ALTER TABLE review_sessions
  ADD COLUMN IF NOT EXISTS business_response text;

ALTER TABLE review_sessions
  ADD COLUMN IF NOT EXISTS business_response_at timestamptz;
