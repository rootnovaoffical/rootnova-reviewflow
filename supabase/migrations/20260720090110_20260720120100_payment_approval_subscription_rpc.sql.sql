-- Phase B: Secure RPC for payment approval + subscription activation
-- Idempotent: safe to call multiple times. Only activates subscription once.
-- Security: SECURITY DEFINER + explicit rootnova admin check (not reliant on RLS)

CREATE OR REPLACE FUNCTION public.approve_payment_and_activate_subscription(
  p_payment_id uuid,
  p_reviewer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment record;
  v_plan record;
  v_existing_sub record;
  v_sub_id uuid;
  v_start_date date;
  v_end_date date;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  -- Verify caller is RootNova admin or super admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_reviewer_id
    AND role IN ('ROOTNOVA_ADMIN', 'ROOTNOVA_SUPER_ADMIN')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: only RootNova admins can approve payments');
  END IF;

  -- Fetch the payment (lock row)
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  -- Idempotency: if already approved, return existing state
  IF v_payment.status = 'APPROVED' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Payment already approved', 'subscription_id', v_payment.subscription_id);
  END IF;

  -- Only pending or under_review can be approved
  IF v_payment.status NOT IN ('PENDING', 'UNDER_REVIEW') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment is ' || v_payment.status || ', cannot approve');
  END IF;

  -- Fetch the plan
  SELECT * INTO v_plan
  FROM public.plans
  WHERE id = v_payment.plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Associated plan not found');
  END IF;

  -- Calculate dates based on billing cycle
  v_start_date := CURRENT_DATE;
  v_period_start := now();

  IF v_payment.billing_cycle = 'ANNUAL' THEN
    v_end_date := CURRENT_DATE + INTERVAL '1 year';
    v_period_end := now() + INTERVAL '1 year';
  ELSE
    v_end_date := CURRENT_DATE + INTERVAL '1 month';
    v_period_end := now() + INTERVAL '1 month';
  END IF;

  -- Check for existing active subscription for this organization
  SELECT * INTO v_existing_sub
  FROM public.subscriptions
  WHERE organization_id = v_payment.organization_id
  AND status IN ('ACTIVE', 'TRIAL')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    -- Extend/upgrade existing subscription
    UPDATE public.subscriptions SET
      plan_id = v_plan.id,
      status = 'ACTIVE',
      billing_cycle = COALESCE(v_payment.billing_cycle, 'MONTHLY'),
      contract_start_date = v_start_date,
      contract_end_date = v_end_date,
      current_period_start = v_period_start,
      current_period_end = v_period_end,
      updated_at = now()
    WHERE id = v_existing_sub.id
    RETURNING id INTO v_sub_id;
  ELSE
    -- Create new subscription
    INSERT INTO public.subscriptions (
      organization_id, plan_id, status, billing_cycle,
      contract_start_date, contract_end_date,
      current_period_start, current_period_end
    ) VALUES (
      v_payment.organization_id, v_plan.id, 'ACTIVE', COALESCE(v_payment.billing_cycle, 'MONTHLY'),
      v_start_date, v_end_date,
      v_period_start, v_period_end
    )
    RETURNING id INTO v_sub_id;
  END IF;

  -- Mark payment as approved and link subscription
  UPDATE public.payments SET
    status = 'APPROVED',
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    approved_by = p_reviewer_id,
    approved_at = now(),
    subscription_id = v_sub_id,
    updated_at = now()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'plan_name', v_plan.name,
    'start_date', v_start_date,
    'end_date', v_end_date
  );
END;
$function$;

-- Grant execute to authenticated (RLS + internal role check handles authorization)
GRANT EXECUTE ON FUNCTION public.approve_payment_and_activate_subscription(uuid, uuid) TO authenticated;

-- Also create a reject function for consistency
CREATE OR REPLACE FUNCTION public.reject_payment(
  p_payment_id uuid,
  p_reviewer_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment record;
BEGIN
  -- Verify caller is RootNova admin or super admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_reviewer_id
    AND role IN ('ROOTNOVA_ADMIN', 'ROOTNOVA_SUPER_ADMIN')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: only RootNova admins can reject payments');
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;

  IF v_payment.status = 'APPROVED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot reject an already approved payment');
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rejection reason is required');
  END IF;

  UPDATE public.payments SET
    status = 'REJECTED',
    rejection_reason = p_reason,
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_payment_id;

  RETURN jsonb_build_object('success', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reject_payment(uuid, uuid, text) TO authenticated;
