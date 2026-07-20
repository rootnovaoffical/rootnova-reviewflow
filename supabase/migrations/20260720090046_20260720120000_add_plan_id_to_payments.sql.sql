-- Phase B: Link payments to plans for subscription activation
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id),
  ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'MONTHLY';

-- Add unique constraint on UTR to prevent duplicate submissions
CREATE UNIQUE INDEX IF NOT EXISTS payments_utr_reference_unique
  ON public.payments (utr_reference)
  WHERE utr_reference IS NOT NULL AND utr_reference <> '';

-- Allow partners to read plans (already public_select, but ensure partners can see active plans)
-- No change needed - plans_public_select already allows authenticated to see active plans

-- Add index for faster lookup of pending payments by organization
CREATE INDEX IF NOT EXISTS payments_org_status_idx
  ON public.payments (organization_id, status);
