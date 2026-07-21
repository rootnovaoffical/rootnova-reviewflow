/*
# Module 15: Enterprise Reporting & Automation Platform

## Purpose
Adds report templates, scheduled reports, report snapshots, and report delivery logs
to support the complete Enterprise Reporting & Automation Platform.

## New Tables

1. **report_templates** — Reusable report templates with KPI selections, chart configs,
   date ranges, branch filters, branding, and layout configuration. Owner-scoped per business.

2. **scheduled_reports** — Scheduled report definitions with frequency (daily/weekly/monthly/
   quarterly/yearly/custom), delivery channels (email/whatsapp/download), and next-run tracking.

3. **report_snapshots** — Generated report snapshots storing the rendered data, AI summary,
   metrics, and export file references. Supports caching and background generation.

4. **report_deliveries** — Delivery log tracking each scheduled report delivery with status,
   recipient, channel, and error information.

5. **report_audit_logs** — Audit trail for all report operations (generated, downloaded,
   scheduled, deleted, template created/modified).

## Security
- RLS enabled on all 5 tables, owner-scoped via auth.uid() = user_id
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE), TO authenticated
- All tables have user_id NOT NULL DEFAULT auth.uid()

## Notes
- Additive only — no existing tables modified
- All tables are multi-tenant safe via business_id + user_id scoping
*/

-- ============================================================
-- 1. report_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  description text,
  report_type text NOT NULL DEFAULT 'custom',
  selected_kpis text[] DEFAULT '{}',
  selected_charts text[] DEFAULT '{}',
  date_range_preset text DEFAULT 'last_30_days',
  custom_date_start date,
  custom_date_end date,
  branch_ids text[] DEFAULT '{}',
  employee_ids text[] DEFAULT '{}',
  customer_segments text[] DEFAULT '{}',
  branding_config jsonb DEFAULT '{}',
  layout_config jsonb DEFAULT '{}',
  is_system_template boolean DEFAULT false,
  is_active boolean DEFAULT true,
  cloned_from uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_report_templates" ON report_templates;
CREATE POLICY "select_own_report_templates" ON report_templates FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_report_templates" ON report_templates;
CREATE POLICY "insert_own_report_templates" ON report_templates FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_report_templates" ON report_templates;
CREATE POLICY "update_own_report_templates" ON report_templates FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_report_templates" ON report_templates;
CREATE POLICY "delete_own_report_templates" ON report_templates FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 2. scheduled_reports
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  template_id uuid REFERENCES report_templates(id) ON DELETE SET NULL,
  name text NOT NULL,
  frequency text NOT NULL DEFAULT 'monthly',
  custom_cron text,
  delivery_channels text[] DEFAULT '{}',
  delivery_emails text[] DEFAULT '{}',
  delivery_phones text[] DEFAULT '{}',
  next_run_at timestamptz,
  last_run_at timestamptz,
  is_active boolean DEFAULT true,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_scheduled_reports" ON scheduled_reports;
CREATE POLICY "select_own_scheduled_reports" ON scheduled_reports FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_scheduled_reports" ON scheduled_reports;
CREATE POLICY "insert_own_scheduled_reports" ON scheduled_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_scheduled_reports" ON scheduled_reports;
CREATE POLICY "update_own_scheduled_reports" ON scheduled_reports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_scheduled_reports" ON scheduled_reports;
CREATE POLICY "delete_own_scheduled_reports" ON scheduled_reports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 3. report_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  template_id uuid REFERENCES report_templates(id) ON DELETE SET NULL,
  scheduled_report_id uuid REFERENCES scheduled_reports(id) ON DELETE SET NULL,
  report_type text NOT NULL,
  title text NOT NULL,
  date_range_start timestamptz,
  date_range_end timestamptz,
  metrics jsonb DEFAULT '{}',
  chart_data jsonb DEFAULT '{}',
  ai_summary jsonb,
  ai_recommendations jsonb,
  ai_confidence double precision,
  export_formats text[] DEFAULT '{}',
  file_urls jsonb DEFAULT '{}',
  status text DEFAULT 'generated',
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_report_snapshots" ON report_snapshots;
CREATE POLICY "select_own_report_snapshots" ON report_snapshots FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_report_snapshots" ON report_snapshots;
CREATE POLICY "insert_own_report_snapshots" ON report_snapshots FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_report_snapshots" ON report_snapshots;
CREATE POLICY "update_own_report_snapshots" ON report_snapshots FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_report_snapshots" ON report_snapshots;
CREATE POLICY "delete_own_report_snapshots" ON report_snapshots FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 4. report_deliveries
-- ============================================================
CREATE TABLE IF NOT EXISTS report_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  scheduled_report_id uuid REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  snapshot_id uuid REFERENCES report_snapshots(id) ON DELETE SET NULL,
  channel text NOT NULL,
  recipient text,
  status text DEFAULT 'pending',
  error_message text,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_report_deliveries" ON report_deliveries;
CREATE POLICY "select_own_report_deliveries" ON report_deliveries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_report_deliveries" ON report_deliveries;
CREATE POLICY "insert_own_report_deliveries" ON report_deliveries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_report_deliveries" ON report_deliveries;
CREATE POLICY "update_own_report_deliveries" ON report_deliveries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_report_deliveries" ON report_deliveries;
CREATE POLICY "delete_own_report_deliveries" ON report_deliveries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 5. report_audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS report_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_report_audit_logs" ON report_audit_logs;
CREATE POLICY "select_own_report_audit_logs" ON report_audit_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_report_audit_logs" ON report_audit_logs;
CREATE POLICY "insert_own_report_audit_logs" ON report_audit_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_report_audit_logs" ON report_audit_logs;
CREATE POLICY "update_own_report_audit_logs" ON report_audit_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_report_audit_logs" ON report_audit_logs;
CREATE POLICY "delete_own_report_audit_logs" ON report_audit_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_report_templates_business ON report_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_business ON scheduled_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_report_snapshots_business ON report_snapshots(business_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_template ON report_snapshots(template_id);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_scheduled ON report_deliveries(scheduled_report_id);
CREATE INDEX IF NOT EXISTS idx_report_audit_logs_business ON report_audit_logs(business_id);