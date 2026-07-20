-- Fix: Allow anon/authenticated to SELECT review_sessions rows for active, public businesses.
-- Without this, the public review flow's insert(...).select().single() returns null data,
-- causing a TypeError on data.id before setStage("questions") is reached.
CREATE POLICY "review_sessions_public_select"
ON public.review_sessions
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = review_sessions.business_id
      AND b.status = 'active'
      AND b.public_review_enabled = true
  )
);
