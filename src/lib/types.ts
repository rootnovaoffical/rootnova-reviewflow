export type AdminRole = "super_admin" | "partner_admin" | "business_admin";

export interface Business {
  id: string; name: string; slug: string; logo_url: string | null;
  primary_color: string; secondary_color: string; welcome_message: string;
  google_place_id: string | null; google_maps_url: string | null; google_review_url: string | null;
  google_review_url_derived: string | null; public_review_enabled: boolean; status: string;
  organization_id: string | null; business_category: string | null; contact_email: string | null;
  contact_phone: string | null; location_city: string | null; onboarding_completed: boolean;
  created_at: string; updated_at: string;
}

export interface Organization {
  id: string; name: string; slug: string | null; status: string | null;
  plan_id: string | null; created_at: string; updated_at: string;
}

export interface Profile {
  id: string; full_name: string; email: string; role: string;
  account_status: string; avatar_url: string | null;
  created_at: string; updated_at: string;
}

export interface ReviewSession {
  id: string; business_id: string; rating: number;
  answers: Record<string, unknown>[]; ai_generated_review: string | null;
  ai_status: string; google_place_id_snapshot: string | null;
  created_at: string; completed_at: string | null;
  business_response: string | null; business_response_at: string | null;
}

export interface AnalyticsEvent {
  id: string; business_id: string | null; session_id: string | null;
  event_type: string; metadata: Record<string, unknown>; created_at: string;
}

export interface Question {
  id: string; business_id: string; question_text: string;
  question_type: string; flow_type: string; options: string[];
  is_required: boolean; is_active: boolean; sort_order: number;
  created_at: string; updated_at: string;
}

export interface QrCode {
  id: string; business_id: string; name: string; qr_type: string;
  destination_url: string; status: string; scan_count: number;
  metadata: Record<string, unknown>; created_at: string; updated_at: string;
}

export interface AutomationRule {
  id: string; business_id: string; name: string; trigger_type: string;
  trigger_config: Record<string, unknown>; action_type: string;
  action_config: Record<string, unknown>; delay_hours: number; status: string;
  trigger_count: number; last_triggered_at: string | null;
  created_at: string; updated_at: string;
}

export interface Workflow {
  id: string; business_id: string; name: string | null; status: string;
  trigger_type: string | null; nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[]; variables: Record<string, unknown>[];
  created_at: string; updated_at: string;
}

export interface WorkflowTemplate {
  id: string; template_key: string; name: string; description: string;
  category: string; trigger_type: string;
  trigger_config: Record<string, unknown>; nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[]; variables: Record<string, unknown>[];
  is_ai_generated: boolean; is_active: boolean; use_count: number;
  created_at: string; updated_at: string;
}

export interface Message {
  id: string; business_id: string; customer_id: string | null;
  channel: string; content: string; status: string;
  sent_at: string | null; delivered_at: string | null;
  created_at: string;
}

export interface MessageTemplate {
  id: string; business_id: string | null; name: string;
  channel: string; content: string; variables: string[];
  is_active: boolean; created_at: string; updated_at: string;
}

export interface Customer {
  id: string; business_id: string; name: string | null;
  email: string | null; phone: string | null;
  status: string | null; created_at: string; updated_at: string;
}

export interface LoyaltyProgram {
  id: string; business_id: string; name: string; description: string;
  points_per_visit: number; reward_threshold: number; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface Plan {
  id: string; name: string; description: string | null; price_monthly: number;
  price_yearly: number; features: string[]; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface Subscription {
  id: string; organization_id: string; plan_id: string; status: string;
  current_period_start: string; current_period_end: string;
  created_at: string; updated_at: string;
}

export interface Payment {
  id: string; subscription_id: string | null; amount: number; currency: string;
  status: string; provider: string; provider_payment_id: string | null;
  created_at: string;
}

export interface Invoice {
  id: string; organization_id: string; subscription_id: string | null;
  amount: number; currency: string; status: string; due_date: string;
  paid_at: string | null; created_at: string;
}

export interface IntegrationProvider {
  id: string; name: string; slug: string; category: string;
  description: string; logo_url: string | null; is_active: boolean;
  created_at: string;
}

export interface InstalledIntegration {
  id: string; business_id: string; provider_id: string; status: string;
  config: Record<string, unknown>; sync_frequency: string | null;
  last_sync_at: string | null; last_sync_status: string | null;
  health_score: number | null; created_at: string; updated_at: string;
}

export interface ApiKey {
  id: string; business_id: string; key_name: string; key_prefix: string;
  key_hash: string; scopes: string[]; rate_limit_per_hour: number;
  last_used_at: string | null; expires_at: string | null; is_active: boolean;
  created_at: string;
}

export interface DeveloperApp {
  id: string; business_id: string; name: string; description: string;
  status: string; created_at: string; updated_at: string;
}

export interface Webhook {
  id: string; business_id: string; name: string; url: string;
  events: string[]; secret: string; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface ReportTemplate {
  id: string; business_id: string | null; user_id: string | null;
  name: string; description: string; report_type: string;
  selected_kpis: string[]; selected_charts: string[];
  date_range_preset: string; is_system_template: boolean; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface ScheduledReport {
  id: string; business_id: string; template_id: string; name: string;
  frequency: string; delivery_channels: string[]; delivery_emails: string[];
  next_run_at: string | null; last_run_at: string | null;
  is_active: boolean; created_at: string; updated_at: string;
}

export interface FeatureFlag {
  id: string; key: string; name: string; description: string;
  enabled: boolean; rollout_percentage: number; created_at: string; updated_at: string;
}

export interface AuditLog {
  id: string; actor_id: string | null; actor_email: string;
  action: string; target_type: string; target_id: string | null;
  organization_id: string | null; metadata: Record<string, unknown>;
  created_at: string;
}

export interface AiTask {
  id: string; business_id: string; task_type: string; title: string;
  description: string; reasoning: string; confidence: number;
  priority: string; status: string; expected_impact: string;
  created_at: string; updated_at: string;
}

export interface AiRecommendation {
  id: string; business_id: string; task_id: string | null;
  title: string; description: string; reasoning: string;
  confidence: number; expected_outcome: string; business_impact: string;
  category: string; status: string; created_at: string; updated_at: string;
}

export interface ActionItem {
  id: string; business_id: string; title: string; explanation: string;
  why_it_matters: string; recommended_action: string; priority_level: string;
  confidence: string; status: string; created_at: string; updated_at: string;
}

export interface AiBriefing {
  id: string; business_id: string; period: string; briefing_date: string;
  summary: string; wins: string[]; risks: string[];
  recommendations: string[]; progress: string[];
  upcoming_opportunities: string[]; created_at: string;
}

export interface AiSimulation {
  id: string; business_id: string; simulation_type: string;
  scenario: string; projected_outcome: string; confidence: number;
  is_labelled_estimate: boolean; created_at: string;
}

export interface BusinessGoal {
  id: string; business_id: string; goal_type: string; target_value: number;
  current_value: number; period: string; status: string;
  created_at: string; updated_at: string;
}

export interface Campaign {
  id: string; business_id: string; name: string; channel: string;
  status: string; start_date: string | null; end_date: string | null;
  created_at: string; updated_at: string;
}

export interface ScheduledMessage {
  id: string; business_id: string; customer_id: string | null;
  channel: string; content: string; scheduled_for: string;
  status: string; created_at: string;
}

export interface OrganizationMember {
  id: string; organization_id: string; user_id: string;
  role: string; status: string; created_at: string;
}

export interface BusinessAdmin {
  id: string; business_id: string; user_id: string;
  role: string; status: string; created_at: string;
}

export interface EnterpriseBranch {
  id: string; organization_id: string; name: string;
  location: string | null; status: string; created_at: string;
}

export interface EnterpriseRegion {
  id: string; organization_id: string; name: string;
  status: string; created_at: string;
}

export interface CommunicationProvider {
  id: string; provider_key: string; display_name: string;
  channel: string; is_active: boolean;
  capabilities: Record<string, unknown>; metadata: Record<string, unknown>;
  created_at: string; updated_at: string;
}

export interface ProviderConfig {
  id: string; business_id: string; provider_id: string;
  config: Record<string, unknown>; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface UsageRecord {
  id: string; organization_id: string; period_start: string;
  period_end: string; reviews_generated: number; ai_requests: number;
  messages_sent: number; reports_generated: number; qr_scans: number;
  customers_stored: number; automation_executions: number;
  metadata: Record<string, unknown>; created_at: string; updated_at: string;
}
