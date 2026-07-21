-- Module 6: Customer Engagement & Automation Platform
-- Additive migration only. No existing tables or migrations modified.

-- =========================================================
-- CUSTOMERS: Aggregated customer profiles per business
-- =========================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  identifier text, -- phone, email, or anonymous hash
  display_name text,
  total_visits integer NOT NULL DEFAULT 1,
  total_reviews integer NOT NULL DEFAULT 0,
  avg_rating numeric(3,2) DEFAULT 0,
  last_visit_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  segment text NOT NULL DEFAULT 'new', -- new, returning, loyal, promoter, passive, detractor, vip, inactive, needs_followup, returning_after_long_time
  segment_updated_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, identifier)
);

CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_segment ON customers(business_id, segment);

-- =========================================================
-- CUSTOMER_EVENTS: Timeline events for each customer
-- =========================================================
CREATE TABLE IF NOT EXISTS customer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  review_session_id uuid REFERENCES review_sessions(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- qr_scanned, review_submitted, ai_review_generated, google_review_completed, business_replied, follow_up_sent, customer_returned, reward_redeemed, became_loyal
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_events_business ON customer_events(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_customer ON customer_events(customer_id, created_at DESC);

-- =========================================================
-- AUTOMATION_RULES: Follow-up automation rules
-- =========================================================
CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_type text NOT NULL, -- review_submitted, rating_threshold, customer_segment, campaign_response
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb, -- { rating: 5, condition: "equals", segment: "detractor" }
  action_type text NOT NULL, -- send_message, notify_manager, open_recovery, add_points, send_coupon
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb, -- { message_template: "...", delay_hours: 24 }
  delay_hours integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- active, paused, archived
  trigger_count integer NOT NULL DEFAULT 0,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_business ON automation_rules(business_id, status);

-- =========================================================
-- CAMPAIGNS: Marketing/engagement campaigns
-- =========================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  campaign_type text NOT NULL DEFAULT 'review', -- review, discount, festival, referral, weekend_offer, happy_hour, new_menu
  audience_segment text, -- which customer segment to target
  status text NOT NULL DEFAULT 'draft', -- draft, active, paused, completed
  schedule_start timestamptz,
  schedule_end timestamptz,
  reach_count integer NOT NULL DEFAULT 0,
  response_count integer NOT NULL DEFAULT 0,
  conversion_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_business ON campaigns(business_id, status);

-- =========================================================
-- LOYALTY_PROGRAMS: Loyalty campaign definitions
-- =========================================================
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  program_type text NOT NULL DEFAULT 'visit_based', -- visit_based, review_based, birthday, festival
  target_count integer NOT NULL DEFAULT 5, -- e.g. visit 5 times
  reward_description text NOT NULL,
  points_per_action integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  redeemed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_programs_business ON loyalty_programs(business_id, status);

-- =========================================================
-- CUSTOMER_LOYALTY: Per-customer loyalty points tracking
-- =========================================================
CREATE TABLE IF NOT EXISTS customer_loyalty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  program_id uuid REFERENCES loyalty_programs(id) ON DELETE SET NULL,
  points integer NOT NULL DEFAULT 0,
  visits_counted integer NOT NULL DEFAULT 0,
  reward_unlocked boolean NOT NULL DEFAULT false,
  unlocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, customer_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_loyalty_business ON customer_loyalty(business_id);

-- =========================================================
-- ENGAGEMENT_NOTIFICATIONS: Smart notifications for businesses
-- =========================================================
CREATE TABLE IF NOT EXISTS engagement_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- customer_inactive, negative_unanswered, campaign_underperforming, review_rate_increasing, loyalty_improving, low_engagement
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info', -- info, warning, critical, success
  related_id uuid, -- polymorphic reference to related entity
  related_type text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_notifications_business ON engagement_notifications(business_id, is_read, created_at DESC);

-- =========================================================
-- RLS: Enable on all new tables
-- =========================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_notifications ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES: Business-scoped access using existing helpers
-- =========================================================

-- customers
CREATE POLICY "customers_select_own" ON customers FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "customers_insert_own" ON customers FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "customers_update_own" ON customers FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "customers_delete_own" ON customers FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- customer_events
CREATE POLICY "customer_events_select_own" ON customer_events FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "customer_events_insert_own" ON customer_events FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "customer_events_update_own" ON customer_events FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "customer_events_delete_own" ON customer_events FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- automation_rules
CREATE POLICY "automation_rules_select_own" ON automation_rules FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "automation_rules_insert_own" ON automation_rules FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "automation_rules_update_own" ON automation_rules FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "automation_rules_delete_own" ON automation_rules FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- campaigns
CREATE POLICY "campaigns_select_own" ON campaigns FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "campaigns_insert_own" ON campaigns FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "campaigns_update_own" ON campaigns FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "campaigns_delete_own" ON campaigns FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- loyalty_programs
CREATE POLICY "loyalty_programs_select_own" ON loyalty_programs FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "loyalty_programs_insert_own" ON loyalty_programs FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "loyalty_programs_update_own" ON loyalty_programs FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "loyalty_programs_delete_own" ON loyalty_programs FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- customer_loyalty
CREATE POLICY "customer_loyalty_select_own" ON customer_loyalty FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "customer_loyalty_insert_own" ON customer_loyalty FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "customer_loyalty_update_own" ON customer_loyalty FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "customer_loyalty_delete_own" ON customer_loyalty FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- engagement_notifications
CREATE POLICY "engagement_notifications_select_own" ON engagement_notifications FOR SELECT TO authenticated USING (is_business_admin(business_id) OR is_business_org_member(business_id) OR is_rootnova_staff());
CREATE POLICY "engagement_notifications_insert_own" ON engagement_notifications FOR INSERT TO authenticated WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "engagement_notifications_update_own" ON engagement_notifications FOR UPDATE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff()) WITH CHECK (is_business_admin(business_id) OR is_rootnova_staff());
CREATE POLICY "engagement_notifications_delete_own" ON engagement_notifications FOR DELETE TO authenticated USING (is_business_admin(business_id) OR is_rootnova_staff());

-- =========================================================
-- updated_at triggers for all new tables
-- =========================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_customers BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_automation_rules BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_campaigns BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_loyalty_programs BEFORE UPDATE ON loyalty_programs FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_customer_loyalty BEFORE UPDATE ON customer_loyalty FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();