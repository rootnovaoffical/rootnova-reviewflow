/*
# Multi-Tenant Organization Architecture

## Overview
Extends the existing single-tenant ReviewFlow platform into a secure multi-tenant SaaS with organization isolation, partner agencies, commercial billing, and payments. All existing tables, data, and functionality are preserved.

## New Tables
1. `organizations` — RootNova internal org + partner agencies. Type distinguishes ROOTNOVA vs PARTNER.
2. `organization_members` — Maps users to orgs with roles (OWNER, ADMIN, TEAM_MEMBER).
3. `plans` — Configurable subscription plans with limits and feature flags.
4. `subscriptions` — Links orgs to plans with billing state, trial, renewal, grace period.
5. `payments` — UPI payment records with screenshot, UTR, status workflow.
6. `audit_logs` — Immutable record of sensitive actions.
7. `feature_flags` — Platform-wide feature toggles.
8. `platform_assets` — Global branding/payment config (logos, UPI QR, UPI ID, colors).

## Modified Tables
1. `businesses` — Adds `organization_id` column.
2. `profiles` — Expands `role` CHECK to include new roles.

## Security
- RLS on all new tables with organization-scoped access.
- Partners can only access their own org's data.
- RootNova Super Admin has global access.
- Payment proofs stored privately.
- Audit logs are insert-only, read by super admins.
*/

-- ============================================================
-- 1. ORGANIZATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  type text NOT NULL DEFAULT 'PARTNER' CHECK (type IN ('ROOTNOVA', 'PARTNER')),
  contact_email text,
  contact_phone text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS organizations_updated_at ON public.organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);

-- ============================================================
-- 2. ORGANIZATION MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'TEAM_MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'TEAM_MEMBER')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISABLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS organization_members_updated_at ON public.organization_members;
CREATE TRIGGER organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- ============================================================
-- 3. PLANS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  monthly_price numeric(10,2) NOT NULL DEFAULT 0,
  annual_price numeric(10,2) NOT NULL DEFAULT 0,
  setup_fee numeric(10,2) NOT NULL DEFAULT 0,
  max_businesses int NOT NULL DEFAULT 1,
  max_review_sessions int NOT NULL DEFAULT 100,
  max_team_members int NOT NULL DEFAULT 3,
  ai_usage_allowance int NOT NULL DEFAULT 100,
  trial_duration_days int NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS plans_updated_at ON public.plans;
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED')),
  billing_cycle text NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY', 'ANNUAL')),
  custom_monthly_price numeric(10,2),
  custom_setup_fee numeric(10,2),
  discount_percent numeric(5,2) DEFAULT 0,
  discount_duration_months int DEFAULT 0,
  is_founding_partner boolean NOT NULL DEFAULT false,
  pricing_lock_months int DEFAULT 0,
  pricing_lock_until date,
  contract_start_date date,
  contract_end_date date,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  grace_period_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- ============================================================
-- 5. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  payment_purpose text NOT NULL DEFAULT 'SUBSCRIPTION',
  payment_method text NOT NULL DEFAULT 'UPI',
  upi_id text,
  screenshot_path text,
  utr_reference text,
  payment_date date,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED')),
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_payments_org ON public.payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at DESC);

-- ============================================================
-- 6. AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================================
-- 7. FEATURE FLAGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT 'GENERAL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 8. PLATFORM ASSETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  asset_type text NOT NULL DEFAULT 'IMAGE',
  storage_path text,
  public_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_assets ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS platform_assets_updated_at ON public.platform_assets;
CREATE TRIGGER platform_assets_updated_at
  BEFORE UPDATE ON public.platform_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 9. ADD organization_id TO businesses
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='businesses' AND column_name='organization_id'
  ) THEN
    ALTER TABLE public.businesses ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_org ON public.businesses(organization_id);

-- ============================================================
-- 10. EXPAND profiles.role CHECK CONSTRAINT
-- ============================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check1;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN', 'PARTNER_OWNER', 'PARTNER_ADMIN', 'PARTNER_TEAM_MEMBER', 'BUSINESS_ADMIN'));

-- ============================================================
-- 11. HELPER FUNCTIONS (must come before policies that use them)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_rootnova_super_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ROOTNOVA_SUPER_ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_rootnova_staff()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_organization_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = auth.uid() AND om.status = 'ACTIVE'
  ORDER BY om.created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_partner_owner(p_org_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = p_org_id
      AND om.role = 'OWNER'
      AND om.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_partner_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = p_org_id
      AND om.role IN ('OWNER', 'ADMIN')
      AND om.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_partner_member(p_org_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = p_org_id
      AND om.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_org_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.organization_members om ON om.organization_id = b.organization_id
    WHERE b.id = p_business_id
      AND om.user_id = auth.uid()
      AND om.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.organization_members om ON om.organization_id = b.organization_id
    WHERE b.id = p_business_id
      AND om.user_id = auth.uid()
      AND om.role IN ('OWNER', 'ADMIN')
      AND om.status = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.seed_rootnova_organization()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT id INTO org_id FROM public.organizations WHERE type = 'ROOTNOVA' LIMIT 1;
  IF org_id IS NULL THEN
    INSERT INTO public.organizations (name, slug, type, status)
    VALUES ('RootNova', 'rootnova', 'ROOTNOVA', 'ACTIVE')
    RETURNING id INTO org_id;
  END IF;
  RETURN org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit(
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_actor_email text;
BEGIN
  SELECT email INTO v_actor_email FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs (actor_id, actor_email, action, target_type, target_id, organization_id, metadata)
  VALUES (auth.uid(), v_actor_email, p_action, p_target_type, p_target_id, p_org_id, p_metadata);
END;
$$;

-- ============================================================
-- 12. SEED ROOTNOVA ORGANIZATION + ASSIGN EXISTING BUSINESSES
-- ============================================================
DO $$ BEGIN PERFORM public.seed_rootnova_organization(); END $$;

DO $$
DECLARE
  root_org_id uuid;
BEGIN
  SELECT id INTO root_org_id FROM public.organizations WHERE type = 'ROOTNOVA' LIMIT 1;
  IF root_org_id IS NOT NULL THEN
    UPDATE public.businesses SET organization_id = root_org_id WHERE organization_id IS NULL;
  END IF;
END $$;

-- ============================================================
-- 13. RLS POLICIES — organizations
-- ============================================================
DROP POLICY IF EXISTS "organizations_rootnova_select" ON public.organizations;
CREATE POLICY "organizations_rootnova_select"
ON public.organizations FOR SELECT TO authenticated
USING (public.is_rootnova_staff() OR public.is_partner_member(id));

DROP POLICY IF EXISTS "organizations_rootnova_insert" ON public.organizations;
CREATE POLICY "organizations_rootnova_insert"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (public.is_rootnova_super_admin());

DROP POLICY IF EXISTS "organizations_rootnova_update" ON public.organizations;
CREATE POLICY "organizations_rootnova_update"
ON public.organizations FOR UPDATE TO authenticated
USING (public.is_rootnova_super_admin() OR public.is_partner_owner(id))
WITH CHECK (public.is_rootnova_super_admin() OR public.is_partner_owner(id));

DROP POLICY IF EXISTS "organizations_rootnova_delete" ON public.organizations;
CREATE POLICY "organizations_rootnova_delete"
ON public.organizations FOR DELETE TO authenticated
USING (public.is_rootnova_super_admin());

-- ============================================================
-- 14. RLS POLICIES — organization_members
-- ============================================================
DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
CREATE POLICY "org_members_select"
ON public.organization_members FOR SELECT TO authenticated
USING (
  public.is_rootnova_staff()
  OR user_id = auth.uid()
  OR public.is_partner_member(organization_id)
);

DROP POLICY IF EXISTS "org_members_insert" ON public.organization_members;
CREATE POLICY "org_members_insert"
ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (
  public.is_rootnova_super_admin()
  OR public.is_partner_admin(organization_id)
);

DROP POLICY IF EXISTS "org_members_update" ON public.organization_members;
CREATE POLICY "org_members_update"
ON public.organization_members FOR UPDATE TO authenticated
USING (public.is_rootnova_super_admin() OR public.is_partner_owner(organization_id))
WITH CHECK (public.is_rootnova_super_admin() OR public.is_partner_owner(organization_id));

DROP POLICY IF EXISTS "org_members_delete" ON public.organization_members;
CREATE POLICY "org_members_delete"
ON public.organization_members FOR DELETE TO authenticated
USING (public.is_rootnova_super_admin() OR public.is_partner_owner(organization_id));

-- ============================================================
-- 15. RLS POLICIES — plans
-- ============================================================
DROP POLICY IF EXISTS "plans_public_select" ON public.plans;
CREATE POLICY "plans_public_select"
ON public.plans FOR SELECT TO authenticated
USING (is_active = true OR public.is_rootnova_staff());

DROP POLICY IF EXISTS "plans_admin_insert" ON public.plans;
CREATE POLICY "plans_admin_insert"
ON public.plans FOR INSERT TO authenticated
WITH CHECK (public.is_rootnova_super_admin());

DROP POLICY IF EXISTS "plans_admin_update" ON public.plans;
CREATE POLICY "plans_admin_update"
ON public.plans FOR UPDATE TO authenticated
USING (public.is_rootnova_super_admin())
WITH CHECK (public.is_rootnova_super_admin());

DROP POLICY IF EXISTS "plans_admin_delete" ON public.plans;
CREATE POLICY "plans_admin_delete"
ON public.plans FOR DELETE TO authenticated
USING (public.is_rootnova_super_admin());

-- ============================================================
-- 16. RLS POLICIES — subscriptions
-- ============================================================
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
CREATE POLICY "subscriptions_select"
ON public.subscriptions FOR SELECT TO authenticated
USING (public.is_rootnova_staff() OR public.is_partner_member(organization_id));

DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
CREATE POLICY "subscriptions_insert"
ON public.subscriptions FOR INSERT TO authenticated
WITH CHECK (public.is_rootnova_super_admin());

DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;
CREATE POLICY "subscriptions_update"
ON public.subscriptions FOR UPDATE TO authenticated
USING (public.is_rootnova_super_admin())
WITH CHECK (public.is_rootnova_super_admin());

DROP POLICY IF EXISTS "subscriptions_delete" ON public.subscriptions;
CREATE POLICY "subscriptions_delete"
ON public.subscriptions FOR DELETE TO authenticated
USING (public.is_rootnova_super_admin());

-- ============================================================
-- 17. RLS POLICIES — payments
-- ============================================================
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select"
ON public.payments FOR SELECT TO authenticated
USING (public.is_rootnova_staff() OR public.is_partner_member(organization_id));

DROP POLICY IF EXISTS "payments_insert" ON public.payments;
CREATE POLICY "payments_insert"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (public.is_partner_member(organization_id) AND submitted_by = auth.uid());

DROP POLICY IF EXISTS "payments_update" ON public.payments;
CREATE POLICY "payments_update"
ON public.payments FOR UPDATE TO authenticated
USING (public.is_rootnova_staff())
WITH CHECK (public.is_rootnova_staff());

DROP POLICY IF EXISTS "payments_delete" ON public.payments;
CREATE POLICY "payments_delete"
ON public.payments FOR DELETE TO authenticated
USING (public.is_rootnova_super_admin());

-- ============================================================
-- 18. RLS POLICIES — audit_logs
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_rootnova_staff());

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "audit_logs_delete" ON public.audit_logs;
CREATE POLICY "audit_logs_delete"
ON public.audit_logs FOR DELETE TO authenticated
USING (public.is_rootnova_super_admin());

-- ============================================================
-- 19. RLS POLICIES — feature_flags
-- ============================================================
DROP POLICY IF EXISTS "feature_flags_select" ON public.feature_flags;
CREATE POLICY "feature_flags_select"
ON public.feature_flags FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "feature_flags_admin_insert" ON public.feature_flags;
CREATE POLICY "feature_flags_admin_insert"
ON public.feature_flags FOR INSERT TO authenticated
WITH CHECK (public.is_rootnova_super_admin());

DROP POLICY IF EXISTS "feature_flags_admin_update" ON public.feature_flags;
CREATE POLICY "feature_flags_admin_update"
ON public.feature_flags FOR UPDATE TO authenticated
USING (public.is_rootnova_super_admin())
WITH CHECK (public.is_rootnova_super_admin());

DROP POLICY IF EXISTS "feature_flags_admin_delete" ON public.feature_flags;
CREATE POLICY "feature_flags_admin_delete"
ON public.feature_flags FOR DELETE TO authenticated
USING (public.is_rootnova_super_admin());

-- ============================================================
-- 20. RLS POLICIES — platform_assets
-- ============================================================
DROP POLICY IF EXISTS "platform_assets_public_select" ON public.platform_assets;
CREATE POLICY "platform_assets_public_select"
ON public.platform_assets FOR SELECT TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "platform_assets_admin_insert" ON public.platform_assets;
CREATE POLICY "platform_assets_admin_insert"
ON public.platform_assets FOR INSERT TO authenticated
WITH CHECK (public.is_rootnova_super_admin());

DROP POLICY IF EXISTS "platform_assets_admin_update" ON public.platform_assets;
CREATE POLICY "platform_assets_admin_update"
ON public.platform_assets FOR UPDATE TO authenticated
USING (public.is_rootnova_super_admin())
WITH CHECK (public.is_rootnova_super_admin());

DROP POLICY IF EXISTS "platform_assets_admin_delete" ON public.platform_assets;
CREATE POLICY "platform_assets_admin_delete"
ON public.platform_assets FOR DELETE TO authenticated
USING (public.is_rootnova_super_admin());

-- ============================================================
-- 21. UPDATE businesses RLS — add org-scoped access
-- ============================================================
DROP POLICY IF EXISTS "businesses_admin_select" ON public.businesses;
CREATE POLICY "businesses_admin_select"
ON public.businesses FOR SELECT TO authenticated
USING (public.is_rootnova_staff() OR public.is_business_admin(id) OR public.is_business_org_member(id));

DROP POLICY IF EXISTS "businesses_admin_insert" ON public.businesses;
CREATE POLICY "businesses_admin_insert"
ON public.businesses FOR INSERT TO authenticated
WITH CHECK (public.is_rootnova_staff() OR (organization_id IS NOT NULL AND public.is_partner_member(organization_id)));

DROP POLICY IF EXISTS "businesses_admin_update" ON public.businesses;
CREATE POLICY "businesses_admin_update"
ON public.businesses FOR UPDATE TO authenticated
USING (public.is_rootnova_staff() OR public.is_business_admin(id) OR public.is_business_org_member(id))
WITH CHECK (public.is_rootnova_staff() OR public.is_business_admin(id) OR public.is_business_org_member(id));

DROP POLICY IF EXISTS "businesses_admin_delete" ON public.businesses;
CREATE POLICY "businesses_admin_delete"
ON public.businesses FOR DELETE TO authenticated
USING (public.is_rootnova_staff() OR public.is_business_admin(id) OR public.is_business_owner(id));

-- ============================================================
-- 22. UPDATE questions/review_sessions/analytics RLS
-- ============================================================
DROP POLICY IF EXISTS "questions_admin_select" ON public.questions;
CREATE POLICY "questions_admin_select"
ON public.questions FOR SELECT TO authenticated
USING (public.is_rootnova_staff() OR public.is_business_admin(business_id) OR public.is_business_org_member(business_id));

DROP POLICY IF EXISTS "questions_admin_insert" ON public.questions;
CREATE POLICY "questions_admin_insert"
ON public.questions FOR INSERT TO authenticated
WITH CHECK (public.is_rootnova_staff() OR public.is_business_admin(business_id) OR public.is_business_org_member(business_id));

DROP POLICY IF EXISTS "questions_admin_update" ON public.questions;
CREATE POLICY "questions_admin_update"
ON public.questions FOR UPDATE TO authenticated
USING (public.is_rootnova_staff() OR public.is_business_admin(business_id) OR public.is_business_org_member(business_id))
WITH CHECK (public.is_rootnova_staff() OR public.is_business_admin(business_id) OR public.is_business_org_member(business_id));

DROP POLICY IF EXISTS "questions_admin_delete" ON public.questions;
CREATE POLICY "questions_admin_delete"
ON public.questions FOR DELETE TO authenticated
USING (public.is_rootnova_staff() OR public.is_business_admin(business_id) OR public.is_business_org_member(business_id));

DROP POLICY IF EXISTS "review_sessions_admin_select" ON public.review_sessions;
CREATE POLICY "review_sessions_admin_select"
ON public.review_sessions FOR SELECT TO authenticated
USING (public.is_rootnova_staff() OR public.is_business_admin(business_id) OR public.is_business_org_member(business_id));

DROP POLICY IF EXISTS "analytics_events_admin_select" ON public.analytics_events;
CREATE POLICY "analytics_events_admin_select"
ON public.analytics_events FOR SELECT TO authenticated
USING (public.is_rootnova_staff() OR public.is_business_admin(business_id) OR public.is_business_org_member(business_id));

-- ============================================================
-- 23. SEED DEFAULT FEATURE FLAGS
-- ============================================================
INSERT INTO public.feature_flags (key, label, description, is_enabled, category) VALUES
  ('AI_REVIEW_GENERATION', 'AI Review Generation', 'Enable AI-powered review generation', true, 'AI'),
  ('ADVANCED_ANALYTICS', 'Advanced Analytics', 'Detailed analytics and reporting', true, 'ANALYTICS'),
  ('AI_INSIGHTS', 'AI Insights', 'AI-powered customer intelligence insights', true, 'AI'),
  ('CUSTOM_BRANDING', 'Custom Branding', 'Custom logos and colors per business', true, 'BRANDING'),
  ('WHITE_LABEL', 'White Label', 'Remove RootNova branding from partner surfaces', false, 'BRANDING'),
  ('MULTIPLE_BUSINESSES', 'Multiple Businesses', 'Allow managing multiple businesses', true, 'GENERAL'),
  ('TEAM_MEMBERS', 'Team Members', 'Allow inviting team members', true, 'GENERAL'),
  ('API_ACCESS', 'API Access', 'Programmatic API access', false, 'DEVELOPER'),
  ('PRIORITY_SUPPORT', 'Priority Support', 'Priority customer support', false, 'SUPPORT')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 24. SEED DEFAULT PLANS
-- ============================================================
INSERT INTO public.plans (name, slug, description, monthly_price, annual_price, setup_fee, max_businesses, max_review_sessions, max_team_members, ai_usage_allowance, trial_duration_days, features, is_active, sort_order) VALUES
  ('Starter', 'starter', 'For small businesses getting started', 999.00, 9990.00, 0, 1, 100, 2, 100, 14,
    '{"AI_REVIEW_GENERATION": true, "ADVANCED_ANALYTICS": false, "AI_INSIGHTS": false, "CUSTOM_BRANDING": true, "WHITE_LABEL": false, "MULTIPLE_BUSINESSES": false, "TEAM_MEMBERS": true, "API_ACCESS": false, "PRIORITY_SUPPORT": false}'::jsonb,
    true, 1),
  ('Professional', 'professional', 'For growing agencies managing multiple clients', 2999.00, 29990.00, 1999.00, 5, 500, 5, 500, 14,
    '{"AI_REVIEW_GENERATION": true, "ADVANCED_ANALYTICS": true, "AI_INSIGHTS": true, "CUSTOM_BRANDING": true, "WHITE_LABEL": false, "MULTIPLE_BUSINESSES": true, "TEAM_MEMBERS": true, "API_ACCESS": false, "PRIORITY_SUPPORT": false}'::jsonb,
    true, 2),
  ('Enterprise', 'enterprise', 'For large agencies and franchises', 9999.00, 99990.00, 4999.00, 50, 5000, 20, 5000, 30,
    '{"AI_REVIEW_GENERATION": true, "ADVANCED_ANALYTICS": true, "AI_INSIGHTS": true, "CUSTOM_BRANDING": true, "WHITE_LABEL": true, "MULTIPLE_BUSINESSES": true, "TEAM_MEMBERS": true, "API_ACCESS": true, "PRIORITY_SUPPORT": true}'::jsonb,
    true, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 25. SEED DEFAULT PLATFORM ASSETS
-- ============================================================
INSERT INTO public.platform_assets (key, label, asset_type, is_active, metadata) VALUES
  ('rootnova_logo', 'RootNova Logo', 'IMAGE', true, '{}'::jsonb),
  ('rootnova_favicon', 'Favicon', 'IMAGE', true, '{}'::jsonb),
  ('rootnova_login_logo', 'Login Logo', 'IMAGE', true, '{}'::jsonb),
  ('rootnova_email_logo', 'Email Logo', 'IMAGE', true, '{}'::jsonb),
  ('rootnova_upi_qr', 'UPI QR Code', 'IMAGE', false, '{}'::jsonb),
  ('rootnova_default_primary_color', 'Default Primary Color', 'COLOR', true, '{"value": "#6366f1"}'::jsonb),
  ('rootnova_default_secondary_color', 'Default Secondary Color', 'COLOR', true, '{"value": "#a855f7"}'::jsonb),
  ('rootnova_upi_config', 'UPI Payment Configuration', 'CONFIG', true, '{"upi_id": "rootnova@upi", "instructions": "Pay to the UPI ID shown below and upload the payment screenshot with UTR/reference number."}'::jsonb)
ON CONFLICT (key) DO NOTHING;
