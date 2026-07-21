/*
# Module 16: Production Operations, Billing & SaaS Launch Platform

## Overview
This migration adds the final SaaS operations layer to ReviewFlow, enabling
subscription billing, usage metering, customer success tracking, production
monitoring, and deployment readiness.

## New Tables (9 tables)

1. **invoices** — Generated invoices for subscription payments. Linked to
   organizations and subscriptions. Tracks line items, totals, tax, status
   (draft/sent/paid/void/overdue), and payment reference.

2. **usage_records** — Metered usage tracking per organization per billing
   period. Tracks reviews_generated, ai_requests, messages_sent, reports_generated,
   qr_scans, customers_stored, automation_executions. Supports plan limit enforcement.

3. **plan_entitlements** — Maps plans to features/limits. Each row links a plan
   to a feature key with an allowed boolean and a numeric limit. Enables plan-based
   access control without hardcoding in UI.

4. **customer_health_scores** — Health score per organization (0-100). Tracks
   engagement_level, churn_risk, usage_trend, last_calculated_at. Reused by
   Customer Success system.

5. **customer_success_alerts** — Alerts for at-risk customers. Linked to
   organizations. Tracks alert_type (churn_risk/low_usage/payment_failure/
   onboarding_stalled), severity, status, and resolution notes.

6. **monitoring_events** — Platform health events. Tracks service_name,
   event_type (health_check/failure/recovery/degraded), severity, message,
   metadata, and resolution status.

7. **incidents** — Production incidents with status (active/resolved/investigating/
   monitoring), severity, affected_services, started_at, resolved_at, and
   postmortem notes.

8. **deployment_checks** — Deployment readiness checklist items. Each row is
   a check (env vars, secrets, migrations, RLS, edge functions, storage, API
   security) with status (pass/fail/pending/warning) and notes.

9. **feature_flag_overrides** — Per-organization or per-user feature flag
   overrides. Allows enabling/disabling features for specific tenants regardless
   of the global flag state.

## Security
- RLS enabled on all 9 new tables.
- All tables are owner-scoped via organization membership checks.
- Admin-only tables (monitoring_events, incidents, deployment_checks) are
  scoped to ROOTNOVA_SUPER_ADMIN and ROOTNOVA_ADMIN roles via profile check.
- 4 CRUD policies per table (SELECT/INSERT/UPDATE/DELETE), scoped to authenticated.

## Important Notes
1. All tables are additive — no existing tables modified.
2. Organization-scoped tables use EXISTS subquery on organization_members for ownership.
3. Admin-only tables use a profile role check.
4. Indexes added on organization_id, status, and created_at for query performance.
*/

-- ============================================================
-- 1. invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'MONTHLY',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  paid_at timestamptz,
  due_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_invoices" ON invoices;
CREATE POLICY "select_own_invoices" ON invoices FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = invoices.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_invoices" ON invoices;
CREATE POLICY "insert_own_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = invoices.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_invoices" ON invoices;
CREATE POLICY "update_own_invoices" ON invoices FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = invoices.organization_id AND om.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = invoices.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_invoices" ON invoices;
CREATE POLICY "delete_own_invoices" ON invoices FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = invoices.organization_id AND om.user_id = auth.uid())
  );

-- ============================================================
-- 2. usage_records
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  reviews_generated int NOT NULL DEFAULT 0,
  ai_requests int NOT NULL DEFAULT 0,
  messages_sent int NOT NULL DEFAULT 0,
  reports_generated int NOT NULL DEFAULT 0,
  qr_scans int NOT NULL DEFAULT 0,
  customers_stored int NOT NULL DEFAULT 0,
  automation_executions int NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_org ON usage_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_period ON usage_records(period_start DESC);

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_usage" ON usage_records;
CREATE POLICY "select_own_usage" ON usage_records FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = usage_records.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_usage" ON usage_records;
CREATE POLICY "insert_own_usage" ON usage_records FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = usage_records.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_usage" ON usage_records;
CREATE POLICY "update_own_usage" ON usage_records FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = usage_records.organization_id AND om.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = usage_records.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_usage" ON usage_records;
CREATE POLICY "delete_own_usage" ON usage_records FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = usage_records.organization_id AND om.user_id = auth.uid())
  );

-- ============================================================
-- 3. plan_entitlements
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_label text,
  is_allowed boolean NOT NULL DEFAULT true,
  limit_value int,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_plan ON plan_entitlements(plan_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_plan_feature ON plan_entitlements(plan_id, feature_key);

ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_entitlements" ON plan_entitlements;
CREATE POLICY "select_entitlements" ON plan_entitlements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_entitlements" ON plan_entitlements;
CREATE POLICY "insert_entitlements" ON plan_entitlements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "update_entitlements" ON plan_entitlements;
CREATE POLICY "update_entitlements" ON plan_entitlements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "delete_entitlements" ON plan_entitlements;
CREATE POLICY "delete_entitlements" ON plan_entitlements FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

-- ============================================================
-- 4. customer_health_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  health_score int NOT NULL DEFAULT 50,
  engagement_level text NOT NULL DEFAULT 'medium',
  churn_risk text NOT NULL DEFAULT 'low',
  usage_trend text NOT NULL DEFAULT 'stable',
  factors jsonb DEFAULT '{}'::jsonb,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_org ON customer_health_scores(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_health_org_unique ON customer_health_scores(organization_id);

ALTER TABLE customer_health_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_health" ON customer_health_scores;
CREATE POLICY "select_own_health" ON customer_health_scores FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = customer_health_scores.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_health" ON customer_health_scores;
CREATE POLICY "insert_own_health" ON customer_health_scores FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = customer_health_scores.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_health" ON customer_health_scores;
CREATE POLICY "update_own_health" ON customer_health_scores FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = customer_health_scores.organization_id AND om.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = customer_health_scores.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_health" ON customer_health_scores;
CREATE POLICY "delete_own_health" ON customer_health_scores FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = customer_health_scores.organization_id AND om.user_id = auth.uid())
  );

-- ============================================================
-- 5. customer_success_alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_success_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cs_alerts_org ON customer_success_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_cs_alerts_status ON customer_success_alerts(status);

ALTER TABLE customer_success_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cs_alerts" ON customer_success_alerts;
CREATE POLICY "select_own_cs_alerts" ON customer_success_alerts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = customer_success_alerts.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_cs_alerts" ON customer_success_alerts;
CREATE POLICY "insert_own_cs_alerts" ON customer_success_alerts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = customer_success_alerts.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_cs_alerts" ON customer_success_alerts;
CREATE POLICY "update_own_cs_alerts" ON customer_success_alerts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = customer_success_alerts.organization_id AND om.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = customer_success_alerts.organization_id AND om.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_cs_alerts" ON customer_success_alerts;
CREATE POLICY "delete_own_cs_alerts" ON customer_success_alerts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = customer_success_alerts.organization_id AND om.user_id = auth.uid())
  );

-- ============================================================
-- 6. monitoring_events
-- ============================================================
CREATE TABLE IF NOT EXISTS monitoring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_service ON monitoring_events(service_name);
CREATE INDEX IF NOT EXISTS idx_monitoring_created ON monitoring_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_resolved ON monitoring_events(is_resolved);

ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_monitoring_admin" ON monitoring_events;
CREATE POLICY "select_monitoring_admin" ON monitoring_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "insert_monitoring_admin" ON monitoring_events;
CREATE POLICY "insert_monitoring_admin" ON monitoring_events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "update_monitoring_admin" ON monitoring_events;
CREATE POLICY "update_monitoring_admin" ON monitoring_events FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "delete_monitoring_admin" ON monitoring_events;
CREATE POLICY "delete_monitoring_admin" ON monitoring_events FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

-- ============================================================
-- 7. incidents
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'minor',
  status text NOT NULL DEFAULT 'investigating',
  affected_services text[] NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  postmortem text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_started ON incidents(started_at DESC);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_incidents_admin" ON incidents;
CREATE POLICY "select_incidents_admin" ON incidents FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "insert_incidents_admin" ON incidents;
CREATE POLICY "insert_incidents_admin" ON incidents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "update_incidents_admin" ON incidents;
CREATE POLICY "update_incidents_admin" ON incidents FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "delete_incidents_admin" ON incidents;
CREATE POLICY "delete_incidents_admin" ON incidents FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

-- ============================================================
-- 8. deployment_checks
-- ============================================================
CREATE TABLE IF NOT EXISTS deployment_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_category text NOT NULL,
  check_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  checked_at timestamptz,
  checked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deploy_checks_category ON deployment_checks(check_category);
CREATE INDEX IF NOT EXISTS idx_deploy_checks_status ON deployment_checks(status);

ALTER TABLE deployment_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_deploy_checks_admin" ON deployment_checks;
CREATE POLICY "select_deploy_checks_admin" ON deployment_checks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "insert_deploy_checks_admin" ON deployment_checks;
CREATE POLICY "insert_deploy_checks_admin" ON deployment_checks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "update_deploy_checks_admin" ON deployment_checks;
CREATE POLICY "update_deploy_checks_admin" ON deployment_checks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "delete_deploy_checks_admin" ON deployment_checks;
CREATE POLICY "delete_deploy_checks_admin" ON deployment_checks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

-- ============================================================
-- 9. feature_flag_overrides
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flag_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flag_overrides_key ON feature_flag_overrides(flag_key);
CREATE INDEX IF NOT EXISTS idx_flag_overrides_org ON feature_flag_overrides(organization_id);
CREATE INDEX IF NOT EXISTS idx_flag_overrides_user ON feature_flag_overrides(user_id);

ALTER TABLE feature_flag_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_flag_overrides" ON feature_flag_overrides;
CREATE POLICY "select_own_flag_overrides" ON feature_flag_overrides FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = feature_flag_overrides.organization_id AND om.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "insert_own_flag_overrides" ON feature_flag_overrides;
CREATE POLICY "insert_own_flag_overrides" ON feature_flag_overrides FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = feature_flag_overrides.organization_id AND om.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "update_own_flag_overrides" ON feature_flag_overrides;
CREATE POLICY "update_own_flag_overrides" ON feature_flag_overrides FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = feature_flag_overrides.organization_id AND om.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = feature_flag_overrides.organization_id AND om.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );

DROP POLICY IF EXISTS "delete_own_flag_overrides" ON feature_flag_overrides;
CREATE POLICY "delete_own_flag_overrides" ON feature_flag_overrides FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = feature_flag_overrides.organization_id AND om.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('ROOTNOVA_SUPER_ADMIN', 'ROOTNOVA_ADMIN'))
  );