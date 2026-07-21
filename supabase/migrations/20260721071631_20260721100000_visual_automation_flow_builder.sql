-- Module 8: Visual Automation Flow Builder
-- Additive migration only. No existing tables or migrations modified.
-- Architecture: node registry, execution engine, versioning, audit, analytics.

-- =========================================================
-- WORKFLOWS: Workflow definitions
-- =========================================================
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft', -- draft, active, paused, archived
  trigger_type text NOT NULL DEFAULT 'manual', -- qr_scanned, review_submitted, negative_review, positive_review, customer_created, segment_changed, campaign_completed, reward_earned, message_delivered, message_failed, birthday, festival, manual, scheduled, webhook, api_event
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  canvas_data jsonb NOT NULL DEFAULT '{}'::jsonb, -- full visual editor state: nodes, edges, viewport
  variables jsonb NOT NULL DEFAULT '[]'::jsonb, -- workflow-level variables
  version integer NOT NULL DEFAULT 1,
  is_ai_generated boolean NOT NULL DEFAULT false,
  ai_explanation text, -- AI's explanation of why it created this workflow
  execution_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  last_executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflows_business ON workflows(business_id, status);
CREATE INDEX IF NOT EXISTS idx_workflows_business_trigger ON workflows(business_id, trigger_type);

-- =========================================================
-- WORKFLOW_NODES: Individual nodes within a workflow
-- =========================================================
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  node_key text NOT NULL, -- unique within workflow (e.g. "node_1", "trigger_1")
  node_type text NOT NULL, -- trigger, action, condition, delay, ai_decision, notification, campaign, loyalty, communication, review, action_center
  node_category text NOT NULL DEFAULT 'action', -- trigger, condition, action, delay, ai_decision
  label text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb, -- node-specific configuration
  position_x numeric(10,2) NOT NULL DEFAULT 0,
  position_y numeric(10,2) NOT NULL DEFAULT 0,
  is_collapsed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, node_key)
);

CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow ON workflow_nodes(workflow_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_business ON workflow_nodes(business_id);

-- =========================================================
-- WORKFLOW_EDGES: Connections between nodes
-- =========================================================
CREATE TABLE IF NOT EXISTS workflow_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  source_node_key text NOT NULL,
  target_node_key text NOT NULL,
  edge_label text, -- e.g. "true", "false", "default" for condition branches
  edge_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, source_node_key, target_node_key)
);

CREATE INDEX IF NOT EXISTS idx_workflow_edges_workflow ON workflow_edges(workflow_id);

-- =========================================================
-- WORKFLOW_EXECUTIONS: Every execution tracked
-- =========================================================
CREATE TABLE IF NOT EXISTS workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workflow_version integer NOT NULL,
  trigger_source text NOT NULL DEFAULT 'manual', -- manual, automation, scheduled, webhook, api
  trigger_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'running', -- running, completed, failed, paused, cancelled
  current_node_key text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  node_history jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of { node_key, node_type, status, started_at, completed_at, duration_ms, error }
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_business ON workflow_executions(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status) WHERE status = 'running';

-- =========================================================
-- WORKFLOW_LOGS: Detailed execution logs per node
-- =========================================================
CREATE TABLE IF NOT EXISTS workflow_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  execution_id uuid NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  node_key text NOT NULL,
  node_type text NOT NULL,
  node_label text NOT NULL,
  log_level text NOT NULL DEFAULT 'info', -- info, warn, error, debug
  message text NOT NULL,
  log_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_reasoning text, -- for AI decision nodes
  provider_used text, -- for communication nodes
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_execution ON workflow_logs(execution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_business ON workflow_logs(business_id, created_at DESC);

-- =========================================================
-- WORKFLOW_TEMPLATES: Pre-built workflow templates
-- =========================================================
CREATE TABLE IF NOT EXISTS workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE, -- 'review_recovery', 'happy_customer', etc.
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general', -- review_recovery, customer_engagement, loyalty, campaigns, retention, referral
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of node definitions
  edges jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of edge definitions
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_ai_generated boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category, is_active);

-- =========================================================
-- WORKFLOW_VERSIONS: Version history for workflows
-- =========================================================
CREATE TABLE IF NOT EXISTS workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  version integer NOT NULL,
  canvas_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  edges jsonb NOT NULL DEFAULT '[]'::jsonb,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  change_note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, version)
);

CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow ON workflow_versions(workflow_id, version DESC);

-- =========================================================
-- RLS: Enable on all new tables
-- =========================================================
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- workflows: business-scoped
CREATE POLICY "workflows_select_own" ON workflows FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "workflows_insert_own" ON workflows FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "workflows_update_own" ON workflows FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "workflows_delete_own" ON workflows FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- workflow_nodes: business-scoped
CREATE POLICY "wf_nodes_select_own" ON workflow_nodes FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_nodes_insert_own" ON workflow_nodes FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_nodes_update_own" ON workflow_nodes FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_nodes_delete_own" ON workflow_nodes FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- workflow_edges: business-scoped
CREATE POLICY "wf_edges_select_own" ON workflow_edges FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_edges_insert_own" ON workflow_edges FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_edges_update_own" ON workflow_edges FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_edges_delete_own" ON workflow_edges FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- workflow_executions: business-scoped
CREATE POLICY "wf_exec_select_own" ON workflow_executions FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_exec_insert_own" ON workflow_executions FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_exec_update_own" ON workflow_executions FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_exec_delete_own" ON workflow_executions FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- workflow_logs: business-scoped
CREATE POLICY "wf_logs_select_own" ON workflow_logs FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_logs_insert_own" ON workflow_logs FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_logs_update_own" ON workflow_logs FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_logs_delete_own" ON workflow_logs FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- workflow_templates: global registry, readable by all authenticated
CREATE POLICY "wf_templates_select_all" ON workflow_templates FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "wf_templates_insert_staff" ON workflow_templates FOR INSERT TO authenticated WITH CHECK (is_rootnova_staff());
CREATE POLICY "wf_templates_update_staff" ON workflow_templates FOR UPDATE TO authenticated USING (is_rootnova_staff()) WITH CHECK (is_rootnova_staff());
CREATE POLICY "wf_templates_delete_staff" ON workflow_templates FOR DELETE TO authenticated USING (is_rootnova_staff());

-- workflow_versions: business-scoped
CREATE POLICY "wf_versions_select_own" ON workflow_versions FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_versions_insert_own" ON workflow_versions FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_versions_update_own" ON workflow_versions FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "wf_versions_delete_own" ON workflow_versions FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE TRIGGER set_updated_at_workflows BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_workflow_nodes BEFORE UPDATE ON workflow_nodes FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_workflow_templates BEFORE UPDATE ON workflow_templates FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =========================================================
-- Seed default workflow templates
-- =========================================================
INSERT INTO workflow_templates (template_key, name, description, category, trigger_type, trigger_config, nodes, edges, variables) VALUES
  (
    'review_recovery',
    'Negative Review Recovery',
    'Automatically reach out to customers who leave a 1-2 star review with a recovery message and create an action item for the manager.',
    'review_recovery',
    'negative_review',
    '{"rating_max": 2}'::jsonb,
    '[
      {"key":"trigger_1","type":"trigger","category":"trigger","label":"Negative Review Received","config":{"rating_max":2},"position_x":0,"position_y":200},
      {"key":"action_1","type":"action","category":"action","label":"Send Recovery Message","config":{"action":"send_message","channel":"sms","template":"recovery","message":"We are so sorry about your experience. We would love to make it right."},"position_x":300,"position_y":100},
      {"key":"action_2","type":"action","category":"action","label":"Create Action Item","config":{"action":"create_action_item","priority":"high","title":"Follow up on negative review"},"position_x":300,"position_y":300}
    ]'::jsonb,
    '[{"source":"trigger_1","target":"action_1"},{"source":"trigger_1","target":"action_2"}]'::jsonb,
    '["customer_name","rating","review_text"]'::jsonb
  ),
  (
    'happy_customer',
    'Happy Customer Thank You',
    'Send a personalized thank-you message to customers who leave a 5-star review and add loyalty points.',
    'customer_engagement',
    'positive_review',
    '{"rating_min": 5}'::jsonb,
    '[
      {"key":"trigger_1","type":"trigger","category":"trigger","label":"5-Star Review Received","config":{"rating_min":5},"position_x":0,"position_y":200},
      {"key":"action_1","type":"action","category":"action","label":"Send Thank You","config":{"action":"send_message","channel":"sms","template":"thank_you","message":"Thank you for the amazing review! We love having you as a customer."},"position_x":300,"position_y":100},
      {"key":"action_2","type":"action","category":"action","label":"Add Loyalty Points","config":{"action":"add_loyalty_points","points":10},"position_x":600,"position_y":100}
    ]'::jsonb,
    '[{"source":"trigger_1","target":"action_1"},{"source":"action_1","target":"action_2"}]'::jsonb,
    '["customer_name","rating"]'::jsonb
  ),
  (
    'birthday_wishes',
    'Birthday Wishes',
    'Send a warm birthday message with a special offer to customers on their birthday.',
    'customer_engagement',
    'birthday',
    '{}'::jsonb,
    '[
      {"key":"trigger_1","type":"trigger","category":"trigger","label":"Customer Birthday","config":{},"position_x":0,"position_y":200},
      {"key":"action_1","type":"action","category":"action","label":"Send Birthday Message","config":{"action":"send_message","channel":"whatsapp","template":"birthday","message":"Happy Birthday! Enjoy a special treat on us today."},"position_x":300,"position_y":200}
    ]'::jsonb,
    '[{"source":"trigger_1","target":"action_1"}]'::jsonb,
    '["customer_name"]'::jsonb
  ),
  (
    'inactive_customer',
    'Inactive Customer Re-engagement',
    'Reach out to customers who have not visited in 60+ days with a we miss you message and discount offer.',
    'retention',
    'scheduled',
    '{"frequency":"daily","check_inactive_days":60}'::jsonb,
    '[
      {"key":"trigger_1","type":"trigger","category":"trigger","label":"Scheduled: Check Inactive","config":{"frequency":"daily"},"position_x":0,"position_y":200},
      {"key":"cond_1","type":"condition","category":"condition","label":"Inactive 60+ Days","config":{"field":"days_since_last_visit","operator":">=","value":60},"position_x":300,"position_y":200},
      {"key":"action_1","type":"action","category":"action","label":"Send We Miss You","config":{"action":"send_message","channel":"sms","template":"coupon","message":"We miss you! Here is 20% off your next visit."},"position_x":600,"position_y":200}
    ]'::jsonb,
    '[{"source":"trigger_1","target":"cond_1"},{"source":"cond_1","target":"action_1","label":"true"}]'::jsonb,
    '["customer_name","days_since_last_visit"]'::jsonb
  ),
  (
    'review_reminder',
    'Review Reminder',
    'Send a gentle reminder to customers who scanned the QR code but did not complete a review.',
    'customer_engagement',
    'scheduled',
    '{"frequency":"daily","delay_hours":24}'::jsonb,
    '[
      {"key":"trigger_1","type":"trigger","category":"trigger","label":"Scheduled: Check Incomplete","config":{"frequency":"daily"},"position_x":0,"position_y":200},
      {"key":"action_1","type":"action","category":"action","label":"Send Reminder","config":{"action":"send_message","channel":"sms","template":"reminder","message":"You started a review but did not finish. It only takes 30 seconds!"},"position_x":300,"position_y":200}
    ]'::jsonb,
    '[{"source":"trigger_1","target":"action_1"}]'::jsonb,
    '["customer_name"]'::jsonb
  ),
  (
    'vip_reward',
    'VIP Reward',
    'Automatically add loyalty points and send a VIP message when a customer reaches VIP status.',
    'loyalty',
    'segment_changed',
    '{"segment":"vip"}'::jsonb,
    '[
      {"key":"trigger_1","type":"trigger","category":"trigger","label":"Customer Became VIP","config":{"segment":"vip"},"position_x":0,"position_y":200},
      {"key":"action_1","type":"action","category":"action","label":"Add Bonus Points","config":{"action":"add_loyalty_points","points":50},"position_x":300,"position_y":100},
      {"key":"action_2","type":"action","category":"action","label":"Send VIP Message","config":{"action":"send_message","channel":"whatsapp","template":"general","message":"You are now a VIP! Enjoy exclusive perks and rewards."},"position_x":300,"position_y":300}
    ]'::jsonb,
    '[{"source":"trigger_1","target":"action_1"},{"source":"trigger_1","target":"action_2"}]'::jsonb,
    '["customer_name"]'::jsonb
  )
ON CONFLICT (template_key) DO NOTHING;