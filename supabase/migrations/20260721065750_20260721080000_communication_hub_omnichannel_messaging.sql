-- Module 7: Communication Hub & Omnichannel Messaging Platform
-- Additive migration only. No existing tables or migrations modified.
-- Architecture: provider-agnostic, API-first, event-driven message lifecycle.

-- =========================================================
-- COMMUNICATION_PROVIDERS: Provider registry (WhatsApp, SMS, Email, Push, In-App)
-- =========================================================
CREATE TABLE IF NOT EXISTS communication_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text NOT NULL UNIQUE, -- 'whatsapp_business', 'twilio_sms', 'sendgrid_email', 'firebase_push', 'in_app'
  display_name text NOT NULL,
  channel text NOT NULL, -- 'whatsapp', 'sms', 'email', 'push', 'in_app'
  is_active boolean NOT NULL DEFAULT true,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb, -- { supports_scheduled: true, supports_read_receipts: true, ... }
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- PROVIDER_CONFIGS: Per-business provider configuration (credentials stored as secrets)
-- =========================================================
CREATE TABLE IF NOT EXISTS provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES communication_providers(id) ON DELETE CASCADE,
  config jsonb NOT NULL DEFAULT '{}'::jsonb, -- non-secret config (sender_id, webhook_url, etc.)
  is_enabled boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false, -- default provider for its channel
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, provider_id)
);

-- =========================================================
-- MESSAGE_TEMPLATES: Reusable message templates with variables & localization
-- =========================================================
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general', -- review_request, thank_you, recovery, festival, birthday, coupon, follow_up, reminder, general
  channel text NOT NULL DEFAULT 'sms', -- whatsapp, sms, email, push, in_app
  subject text,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb, -- ["customer_name", "business_name", "rating"]
  locale text NOT NULL DEFAULT 'en',
  version integer NOT NULL DEFAULT 1,
  ai_optimized boolean NOT NULL DEFAULT false,
  ai_optimization_score numeric(3,2) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_business ON message_templates(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_message_templates_business_category ON message_templates(business_id, category);

-- =========================================================
-- MESSAGES: Unified message store — every message regardless of channel
-- =========================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  template_id uuid REFERENCES message_templates(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  automation_rule_id uuid REFERENCES automation_rules(id) ON DELETE SET NULL,
  channel text NOT NULL, -- whatsapp, sms, email, push, in_app
  provider_id uuid REFERENCES communication_providers(id) ON DELETE SET NULL,
  recipient_identifier text NOT NULL, -- phone, email, device token, user id
  recipient_name text,
  subject text,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'created', -- created, queued, scheduled, sending, delivered, read, clicked, failed, retrying, archived
  priority integer NOT NULL DEFAULT 5, -- 1 (highest) to 10 (lowest)
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  clicked_at timestamptz,
  failed_at timestamptz,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  next_retry_at timestamptz,
  provider_message_id text, -- ID returned by provider
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb, -- trigger_source, ai_generated, personalization_data, etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_business ON messages(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_business_status ON messages(business_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_business_channel ON messages(business_id, channel);
CREATE INDEX IF NOT EXISTS idx_messages_status_scheduled ON messages(status, scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_messages_status_retrying ON messages(status, next_retry_at) WHERE status = 'retrying';

-- =========================================================
-- MESSAGE_EVENTS: Event-driven lifecycle tracking for every message
-- =========================================================
CREATE TABLE IF NOT EXISTS message_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- created, queued, scheduled, sending, delivered, read, clicked, failed, retried, archived
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_response jsonb,
  latency_ms integer, -- time from send to this event
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_events_message ON message_events(message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_events_business ON message_events(business_id, created_at DESC);

-- =========================================================
-- COMMUNICATION_AUDIT_LOGS: Full audit trail for every communication action
-- =========================================================
CREATE TABLE IF NOT EXISTS communication_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  actor_id uuid, -- user who triggered, or null for system/automation
  actor_type text NOT NULL DEFAULT 'system', -- user, system, automation, ai
  action text NOT NULL, -- message_created, message_sent, message_failed, message_retried, template_created, provider_configured, etc.
  channel text,
  provider_id uuid REFERENCES communication_providers(id) ON DELETE SET NULL,
  trigger_source text, -- manual, automation, campaign, ai, scheduled
  automation_rule_id uuid REFERENCES automation_rules(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  ai_involved boolean NOT NULL DEFAULT false,
  retry_count integer DEFAULT 0,
  execution_duration_ms integer,
  outcome text, -- success, failure, pending
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communication_audit_logs_business ON communication_audit_logs(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_audit_logs_message ON communication_audit_logs(message_id);

-- =========================================================
-- SCHEDULED_MESSAGES: Scheduling engine support for recurring/delayed messages
-- =========================================================
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  schedule_type text NOT NULL DEFAULT 'immediate', -- immediate, scheduled, recurring, delayed
  scheduled_for timestamptz NOT NULL,
  recurrence_rule jsonb, -- cron-like: { frequency: 'daily', interval: 1, days: [1,3,5], until: '2026-12-31' }
  timezone text NOT NULL DEFAULT 'UTC',
  business_hours_only boolean NOT NULL DEFAULT false,
  quiet_hours_start text, -- '22:00'
  quiet_hours_end text, -- '08:00'
  expiry_at timestamptz,
  is_processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_business ON scheduled_messages(business_id, is_processed, scheduled_for);

-- =========================================================
-- DELIVERY_LOGS: Provider-level delivery diagnostics
-- =========================================================
CREATE TABLE IF NOT EXISTS delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES communication_providers(id) ON DELETE SET NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL, -- sent, delivered, failed, bounced, rejected
  provider_message_id text,
  provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  latency_ms integer,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_message ON delivery_logs(message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_business ON delivery_logs(business_id, created_at DESC);

-- =========================================================
-- RLS: Enable on all new tables
-- =========================================================
ALTER TABLE communication_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- communication_providers: global registry, readable by all authenticated users
CREATE POLICY "providers_select_all" ON communication_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "providers_insert_staff" ON communication_providers FOR INSERT TO authenticated WITH CHECK (is_rootnova_staff());
CREATE POLICY "providers_update_staff" ON communication_providers FOR UPDATE TO authenticated USING (is_rootnova_staff()) WITH CHECK (is_rootnova_staff());
CREATE POLICY "providers_delete_staff" ON communication_providers FOR DELETE TO authenticated USING (is_rootnova_staff());

-- provider_configs: business-scoped
CREATE POLICY "provider_configs_select_own" ON provider_configs FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "provider_configs_insert_own" ON provider_configs FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "provider_configs_update_own" ON provider_configs FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "provider_configs_delete_own" ON provider_configs FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- message_templates: business-scoped
CREATE POLICY "templates_select_own" ON message_templates FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "templates_insert_own" ON message_templates FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "templates_update_own" ON message_templates FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "templates_delete_own" ON message_templates FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- messages: business-scoped
CREATE POLICY "messages_select_own" ON messages FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "messages_insert_own" ON messages FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "messages_update_own" ON messages FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "messages_delete_own" ON messages FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- message_events: business-scoped
CREATE POLICY "message_events_select_own" ON message_events FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "message_events_insert_own" ON message_events FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "message_events_update_own" ON message_events FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "message_events_delete_own" ON message_events FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- communication_audit_logs: business-scoped
CREATE POLICY "comm_audit_select_own" ON communication_audit_logs FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "comm_audit_insert_own" ON communication_audit_logs FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "comm_audit_update_own" ON communication_audit_logs FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "comm_audit_delete_own" ON communication_audit_logs FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- scheduled_messages: business-scoped
CREATE POLICY "scheduled_select_own" ON scheduled_messages FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "scheduled_insert_own" ON scheduled_messages FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "scheduled_update_own" ON scheduled_messages FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "scheduled_delete_own" ON scheduled_messages FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- delivery_logs: business-scoped
CREATE POLICY "delivery_logs_select_own" ON delivery_logs FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "delivery_logs_insert_own" ON delivery_logs FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "delivery_logs_update_own" ON delivery_logs FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "delivery_logs_delete_own" ON delivery_logs FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE TRIGGER set_updated_at_communication_providers BEFORE UPDATE ON communication_providers FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_provider_configs BEFORE UPDATE ON provider_configs FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_message_templates BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_messages BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_scheduled_messages BEFORE UPDATE ON scheduled_messages FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =========================================================
-- Seed default providers
-- =========================================================
INSERT INTO communication_providers (provider_key, display_name, channel, capabilities) VALUES
  ('in_app', 'In-App Notifications', 'in_app', '{"supports_scheduled": true, "supports_read_receipts": true, "supports_click_tracking": false}'::jsonb),
  ('whatsapp_business', 'WhatsApp Business API', 'whatsapp', '{"supports_scheduled": false, "supports_read_receipts": true, "supports_click_tracking": false, "supports_templates": true}'::jsonb),
  ('twilio_sms', 'Twilio SMS', 'sms', '{"supports_scheduled": true, "supports_read_receipts": true, "supports_click_tracking": false}'::jsonb),
  ('sendgrid_email', 'SendGrid Email', 'email', '{"supports_scheduled": true, "supports_read_receipts": true, "supports_click_tracking": true, "supports_templates": true}'::jsonb),
  ('firebase_push', 'Firebase Push Notifications', 'push', '{"supports_scheduled": true, "supports_read_receipts": false, "supports_click_tracking": true}'::jsonb)
ON CONFLICT (provider_key) DO NOTHING;