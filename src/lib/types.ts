export type AdminRole = 'super_admin' | 'partner_admin' | 'business_admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  welcome_message: string | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  google_review_url: string | null;
  google_review_url_derived: string | null;
  public_review_enabled: boolean;
  status: string;
  organization_id: string | null;
  business_category: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location_city: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string | null;
  created_at: string;
}

export interface BusinessAdmin {
  id: string;
  business_id: string;
  user_id: string;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface ReviewSession {
  id: string;
  business_id: string;
  rating: number | null;
  answers: Record<string, unknown> | null;
  ai_generated_review: string | null;
  ai_status: string;
  created_at: string;
}

export interface Question {
  id: string;
  business_id: string;
  question_text: string;
  flow_type: string;
  options: string[] | null;
  question_type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface QrCode {
  id: string;
  business_id: string;
  name: string;
  qr_type: string;
  target_url: string;
  scan_count: number;
  is_active: boolean;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  business_id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  delay_hours: number | null;
  status: string;
  trigger_count: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workflow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string;
  category: string;
  trigger_type: string;
  is_active: boolean;
  use_count: number;
  created_at: string;
}

export interface Message {
  id: string;
  business_id: string;
  customer_id: string | null;
  channel: string;
  direction: string;
  content: string;
  status: string;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  business_id: string;
  name: string;
  channel: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export interface ScheduledMessage {
  id: string;
  business_id: string;
  customer_id: string | null;
  channel: string;
  content: string;
  scheduled_for: string;
  status: string;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  identifier: string | null;
  display_name: string | null;
  total_visits: number;
  total_reviews: number;
  avg_rating: number | null;
  last_visit_at: string | null;
  first_seen_at: string;
  segment: string;
  created_at: string;
}

export interface LoyaltyProgram {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  points_per_review: number;
  reward_threshold: number;
  reward_description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AiTask {
  id: string;
  business_id: string;
  task_type: string;
  title: string;
  description: string | null;
  reasoning: string | null;
  confidence: string;
  priority: string;
  status: string;
  expected_impact: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiRecommendation {
  id: string;
  business_id: string;
  task_id: string | null;
  title: string;
  description: string | null;
  reasoning: string | null;
  confidence: number;
  category: string;
  status: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  business_id: string;
  title: string;
  explanation: string | null;
  why_it_matters: string | null;
  recommended_action: string | null;
  priority_level: string;
  confidence: string;
  status: string;
  created_at: string;
}

export interface AiBriefing {
  id: string;
  business_id: string;
  period: string;
  briefing_date: string;
  summary: string;
  wins: string[];
  risks: string[];
  recommendations: string[];
  created_at: string;
}

export interface AiSimulation {
  id: string;
  business_id: string;
  simulation_type: string;
  scenario: string;
  current_state: string | null;
  projected_state: string | null;
  projected_outcome: string | null;
  confidence: number;
  created_at: string;
}

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  campaign_type: string;
  audience_segment: string | null;
  status: string;
  schedule_start: string | null;
  schedule_end: string | null;
  reach_count: number;
  response_count: number;
  conversion_count: number;
  created_at: string;
}

export interface BusinessGoal {
  id: string;
  business_id: string;
  goal_type: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
  deadline: string | null;
  ai_strategy: string | null;
  created_at: string;
}

export interface ReportTemplate {
  id: string;
  business_id: string;
  name: string;
  report_type: string;
  description: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface ScheduledReport {
  id: string;
  business_id: string;
  template_id: string | null;
  name: string;
  frequency: string;
  format: string;
  recipients: string[];
  next_run: string | null;
  last_run: string | null;
  status: string;
  created_at: string;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InstalledIntegration {
  id: string;
  business_id: string;
  provider_id: string;
  config: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  business_id: string;
  key_name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_hour: number;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DeveloperApp {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  client_id: string;
  client_secret_hash: string | null;
  scopes: string[];
  redirect_uris: string[];
  is_active: boolean;
  created_at: string;
}

export interface Webhook {
  id: string;
  business_id: string;
  url: string;
  events: string[];
  secret: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  tier: string;
  monthly_price: number;
  annual_price: number;
  features: string[];
  limits: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  business_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
}

export interface Payment {
  id: string;
  business_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  business_id: string;
  subscription_id: string | null;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
}

export interface EnterpriseBranch {
  id: string;
  organization_id: string;
  business_id: string;
  branch_name: string;
  branch_code: string | null;
  region_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EnterpriseRegion {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface OrganizationPolicy {
  id: string;
  organization_id: string;
  policy_key: string;
  policy_value: string | null;
  description: string | null;
  is_enforced: boolean;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  flag_key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  organization_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface UsageRecord {
  id: string;
  business_id: string;
  metric: string;
  value: number;
  period: string;
  recorded_at: string;
}
