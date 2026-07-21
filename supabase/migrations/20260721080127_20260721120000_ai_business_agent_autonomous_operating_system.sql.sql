-- ============================================================
-- MODULE 9: AI BUSINESS AGENT — AUTONOMOUS BUSINESS OS
-- 7 tables: ai_tasks, ai_recommendations, ai_memory, business_goals,
--          ai_briefings, ai_simulations, ai_agent_logs
-- All additive. RLS enabled on every table. Tenant isolation enforced.
-- ============================================================

-- ============================================================
-- 1. AI TASKS — proactive task queue
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reasoning TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence REAL NOT NULL DEFAULT 0.5,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'recommended',
  expected_impact TEXT NOT NULL DEFAULT '',
  affected_customers INTEGER NOT NULL DEFAULT 0,
  affected_workflows TEXT[] DEFAULT NULL,
  related_entity_id UUID DEFAULT NULL,
  related_entity_type TEXT DEFAULT NULL,
  scheduled_for TIMESTAMPTZ DEFAULT NULL,
  accepted_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NULL,
  result JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_tasks_business_id ON ai_tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_priority ON ai_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_created_at ON ai_tasks(created_at DESC);

ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_ai_tasks" ON ai_tasks FOR SELECT
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "insert_own_ai_tasks" ON ai_tasks FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "update_own_ai_tasks" ON ai_tasks FOR UPDATE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff())
  WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "delete_own_ai_tasks" ON ai_tasks FOR DELETE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());

-- ============================================================
-- 2. AI RECOMMENDATIONS — explainable recommendations
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  task_id UUID DEFAULT NULL REFERENCES ai_tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reasoning TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence REAL NOT NULL DEFAULT 0.5,
  expected_outcome TEXT NOT NULL DEFAULT '',
  business_impact TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_recs_business_id ON ai_recommendations(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_recs_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_recs_created_at ON ai_recommendations(created_at DESC);

ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_ai_recs" ON ai_recommendations FOR SELECT
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "insert_own_ai_recs" ON ai_recommendations FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "update_own_ai_recs" ON ai_recommendations FOR UPDATE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff())
  WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "delete_own_ai_recs" ON ai_recommendations FOR DELETE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());

-- ============================================================
-- 3. AI MEMORY — continuous learning from business behavior
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL DEFAULT 'pattern_detected',
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence REAL NOT NULL DEFAULT 0.5,
  source TEXT NOT NULL DEFAULT 'ai_agent',
  times_referenced INTEGER NOT NULL DEFAULT 0,
  last_referenced_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, key)
);

CREATE INDEX IF NOT EXISTS idx_ai_memory_business_id ON ai_memory(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_type ON ai_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_ai_memory_updated_at ON ai_memory(updated_at DESC);

ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_ai_memory" ON ai_memory FOR SELECT
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "insert_own_ai_memory" ON ai_memory FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "update_own_ai_memory" ON ai_memory FOR UPDATE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff())
  WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "delete_own_ai_memory" ON ai_memory FOR DELETE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());

-- ============================================================
-- 4. BUSINESS GOALS — AI works toward defined targets
-- ============================================================
CREATE TABLE IF NOT EXISTS business_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  target_value REAL NOT NULL DEFAULT 100,
  current_value REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  status TEXT NOT NULL DEFAULT 'active',
  deadline TIMESTAMPTZ DEFAULT NULL,
  ai_strategy TEXT DEFAULT NULL,
  progress_history JSONB DEFAULT NULL,
  achieved_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_business_id ON business_goals(business_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON business_goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_type ON business_goals(goal_type);

ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_goals" ON business_goals FOR SELECT
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "insert_own_goals" ON business_goals FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "update_own_goals" ON business_goals FOR UPDATE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff())
  WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "delete_own_goals" ON business_goals FOR DELETE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());

-- ============================================================
-- 5. AI BRIEFINGS — daily/weekly/monthly summaries
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'daily',
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary TEXT NOT NULL DEFAULT '',
  wins TEXT[] NOT NULL DEFAULT '{}',
  risks TEXT[] NOT NULL DEFAULT '{}',
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  progress TEXT[] NOT NULL DEFAULT '{}',
  upcoming_opportunities TEXT[] NOT NULL DEFAULT '{}',
  metrics_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_briefings_business_id ON ai_briefings(business_id);
CREATE INDEX IF NOT EXISTS idx_briefings_period ON ai_briefings(period);
CREATE INDEX IF NOT EXISTS idx_briefings_date ON ai_briefings(briefing_date DESC);

ALTER TABLE ai_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_briefings" ON ai_briefings FOR SELECT
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "insert_own_briefings" ON ai_briefings FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "update_own_briefings" ON ai_briefings FOR UPDATE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff())
  WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "delete_own_briefings" ON ai_briefings FOR DELETE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());

-- ============================================================
-- 6. AI SIMULATIONS — business forecasts (always labelled estimates)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  simulation_type TEXT NOT NULL DEFAULT 'custom',
  scenario TEXT NOT NULL,
  current_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  projected_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  assumptions TEXT[] NOT NULL DEFAULT '{}',
  projected_outcome TEXT NOT NULL DEFAULT '',
  confidence REAL NOT NULL DEFAULT 0.5,
  is_labelled_estimate BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sims_business_id ON ai_simulations(business_id);
CREATE INDEX IF NOT EXISTS idx_sims_type ON ai_simulations(simulation_type);
CREATE INDEX IF NOT EXISTS idx_sims_created_at ON ai_simulations(created_at DESC);

ALTER TABLE ai_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_sims" ON ai_simulations FOR SELECT
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "insert_own_sims" ON ai_simulations FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "update_own_sims" ON ai_simulations FOR UPDATE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff())
  WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "delete_own_sims" ON ai_simulations FOR DELETE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());

-- ============================================================
-- 7. AI AGENT LOGS — full audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  log_level TEXT NOT NULL DEFAULT 'info',
  action TEXT NOT NULL,
  entity_type TEXT DEFAULT NULL,
  entity_id UUID DEFAULT NULL,
  reasoning TEXT DEFAULT NULL,
  input_data JSONB DEFAULT NULL,
  output_data JSONB DEFAULT NULL,
  duration_ms INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_business_id ON ai_agent_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON ai_agent_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON ai_agent_logs(created_at DESC);

ALTER TABLE ai_agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_agent_logs" ON ai_agent_logs FOR SELECT
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "insert_own_agent_logs" ON ai_agent_logs FOR INSERT
  TO authenticated WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "update_own_agent_logs" ON ai_agent_logs FOR UPDATE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff())
  WITH CHECK (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "delete_own_agent_logs" ON ai_agent_logs FOR DELETE
  TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());

-- ============================================================
-- TRIGGERS — auto-update updated_at on all tables
-- ============================================================
CREATE TRIGGER set_updated_at_ai_tasks
  BEFORE UPDATE ON ai_tasks
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_ai_recommendations
  BEFORE UPDATE ON ai_recommendations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_ai_memory
  BEFORE UPDATE ON ai_memory
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_business_goals
  BEFORE UPDATE ON business_goals
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- SEED: Default business goals template
-- ============================================================
INSERT INTO ai_memory (business_id, memory_type, key, value, confidence, source)
SELECT b.id, 'business_preference', 'agent_initialized', '{"status": "ready"}'::jsonb, 1.0, 'system'
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM ai_memory m WHERE m.business_id = b.id AND m.key = 'agent_initialized'
);
