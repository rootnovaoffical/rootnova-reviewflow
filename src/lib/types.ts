export type UserRole = 'ROOTNOVA_SUPER_ADMIN' | 'ROOTNOVA_ADMIN' | 'PARTNER_OWNER' | 'PARTNER_ADMIN' | 'PARTNER_TEAM_MEMBER' | 'BUSINESS_ADMIN';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  account_status: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
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
  logo_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewSession {
  id: string;
  business_id: string;
  rating: number;
  answers: Record<string, string> | null;
  ai_generated_review: string | null;
  ai_status: string;
  google_place_id_snapshot: string | null;
  created_at: string;
  completed_at: string | null;
  business_response: string | null;
  business_response_at: string | null;
}

export interface Question {
  id: string;
  business_id: string;
  question_text: string;
  question_type: string;
  flow_type: string;
  options: string[] | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QrCode {
  id: string;
  business_id: string;
  name: string;
  qr_type: string;
  destination_url: string;
  status: string;
  scan_count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  business_id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown> | null;
  action_type: string;
  action_config: Record<string, unknown> | null;
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
  trigger_config: Record<string, unknown> | null;
  canvas_data: Record<string, unknown> | null;
  variables: Record<string, unknown> | null;
  version: number;
  is_ai_generated: boolean;
  ai_explanation: string | null;
  execution_count: number;
  success_count: number;
  failure_count: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  business_id: string;
  customer_id: string | null;
  template_id: string | null;
  campaign_id: string | null;
  automation_rule_id: string | null;
  channel: string;
  provider_id: string | null;
  recipient_identifier: string;
  recipient_name: string | null;
  subject: string | null;
  body: string;
  status: string;
  priority: number | null;
  scheduled_for: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  clicked_at: string | null;
  failed_at: string | null;
  retry_count: number | null;
  max_retries: number | null;
  next_retry_at: string | null;
  provider_message_id: string | null;
  provider_response: Record<string, unknown> | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  business_id: string;
  name: string;
  category: string;
  channel: string;
  subject: string | null;
  body: string;
  variables: Record<string, unknown> | null;
  locale: string | null;
  version: number;
  ai_optimized: boolean;
  ai_optimization_score: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledMessage {
  id: string;
  business_id: string;
  message_id: string | null;
  schedule_type: string;
  scheduled_for: string | null;
  recurrence_rule: Record<string, unknown> | null;
  timezone: string | null;
  business_hours_only: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  expiry_at: string | null;
  is_processed: boolean;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  identifier: string;
  display_name: string | null;
  total_visits: number;
  total_reviews: number;
  avg_rating: number | null;
  last_visit_at: string | null;
  first_seen_at: string | null;
  segment: string | null;
  segment_updated_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyProgram {
  id: string;
  business_id: string;
  name: string;
  program_type: string;
  target_count: number;
  reward_description: string | null;
  points_per_action: number;
  status: string;
  redeemed_count: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessGoal {
  id: string;
  business_id: string;
  goal_type: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string | null;
  status: string;
  deadline: string | null;
  ai_strategy: string | null;
  progress_history: Record<string, unknown> | null;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
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
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AiTask {
  id: string;
  business_id: string;
  task_type: string;
  title: string;
  description: string | null;
  reasoning: string | null;
  evidence: Record<string, unknown> | null;
  confidence: number;
  priority: string;
  status: string;
  expected_impact: string | null;
  affected_customers: number | null;
  affected_workflows: string[] | null;
  related_entity_id: string | null;
  related_entity_type: string | null;
  scheduled_for: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
  result: Record<string, unknown> | null;
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
  evidence: Record<string, unknown> | null;
  confidence: number;
  expected_outcome: string | null;
  business_impact: string | null;
  category: string | null;
  status: string;
  created_at: string;
  updated_at: string;
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
  evidence: Record<string, unknown> | null;
  internal_notes: string | null;
  ai_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiBriefing {
  id: string;
  business_id: string;
  period: string;
  briefing_date: string;
  summary: string | null;
  wins: string[] | null;
  risks: string[] | null;
  recommendations: string[] | null;
  progress: string[] | null;
  upcoming_opportunities: string[] | null;
  metrics_snapshot: Record<string, unknown> | null;
  created_at: string;
}

export interface AiSimulation {
  id: string;
  business_id: string;
  simulation_type: string;
  scenario: string;
  current_state: Record<string, unknown> | null;
  projected_state: Record<string, unknown> | null;
  assumptions: string[] | null;
  projected_outcome: string | null;
  confidence: number;
  is_labelled_estimate: boolean;
  created_at: string;
}

export interface ReportTemplate {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  report_type: string;
  selected_kpis: string[] | null;
  selected_charts: string[] | null;
  date_range_preset: string | null;
  custom_date_start: string | null;
  custom_date_end: string | null;
  branch_ids: string[] | null;
  employee_ids: string[] | null;
  customer_segments: string[] | null;
  branding_config: Record<string, unknown> | null;
  layout_config: Record<string, unknown> | null;
  is_system_template: boolean;
  is_active: boolean;
  cloned_from: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledReport {
  id: string;
  business_id: string;
  user_id: string | null;
  template_id: string | null;
  name: string;
  frequency: string;
  custom_cron: string | null;
  delivery_channels: string[] | null;
  delivery_emails: string[] | null;
  delivery_phones: string[] | null;
  next_run_at: string | null;
  last_run_at: string | null;
  is_active: boolean;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface IntegrationProvider {
  id: string;
  provider_key: string;
  name: string;
  category: string;
  description: string | null;
  logo_url: string | null;
  auth_type: string | null;
  auth_config: Record<string, unknown> | null;
  supported_features: string[] | null;
  api_base_url: string | null;
  webhook_url_template: string | null;
  rate_limit_per_minute: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InstalledIntegration {
  id: string;
  business_id: string;
  provider_id: string;
  status: string;
  config: Record<string, unknown> | null;
  sync_frequency: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  health_score: number | null;
  enabled_features: string[] | null;
  installed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  business_id: string;
  key_name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string[] | null;
  rate_limit_per_hour: number | null;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeveloperApp {
  id: string;
  business_id: string;
  app_name: string;
  description: string | null;
  client_id: string;
  client_secret_hash: string;
  redirect_uris: string[] | null;
  scopes: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Webhook {
  id: string;
  business_id: string;
  name: string;
  url: string;
  events: string[] | null;
  secret: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  setup_fee: number;
  max_businesses: number;
  max_review_sessions: number;
  max_team_members: number;
  ai_usage_allowance: number;
  trial_duration_days: number;
  features: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  custom_monthly_price: number | null;
  custom_setup_fee: number | null;
  discount_percent: number | null;
  discount_duration_months: number | null;
  is_founding_partner: boolean;
  pricing_lock_months: number | null;
  pricing_lock_until: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_period_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  amount: number;
  payment_purpose: string;
  payment_method: string | null;
  upi_id: string | null;
  screenshot_path: string | null;
  utr_reference: string | null;
  payment_date: string | null;
  status: string;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  metadata: Record<string, unknown> | null;
  submitted_by: string | null;
  plan_id: string | null;
  billing_cycle: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  invoice_number: string;
  billing_cycle: string | null;
  period_start: string | null;
  period_end: string | null;
  line_items: Record<string, unknown> | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: string;
  payment_id: string | null;
  paid_at: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseBranch {
  id: string;
  organization_id: string;
  region_id: string | null;
  business_id: string | null;
  name: string;
  slug: string;
  branch_code: string | null;
  branch_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string | null;
  currency: string | null;
  language: string | null;
  phone: string | null;
  email: string | null;
  operating_hours: Record<string, unknown> | null;
  status: string;
  health_score: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseRegion {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  region_type: string | null;
  code: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationPolicy {
  id: string;
  organization_id: string;
  region_id: string | null;
  branch_id: string | null;
  policy_key: string;
  policy_type: string;
  name: string;
  description: string | null;
  rules: Record<string, unknown> | null;
  is_inherited: boolean;
  is_overridable: boolean;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  is_enabled: boolean;
  category: string | null;
  created_at: string;
  updated_at: string;
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
  organization_id: string;
  period_start: string;
  period_end: string;
  reviews_generated: number;
  ai_requests: number;
  messages_sent: number;
  reports_generated: number;
  qr_scans: number;
  customers_stored: number;
  automation_executions: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  category: string;
  trigger_type: string;
  trigger_config: Record<string, unknown> | null;
  nodes: unknown[] | null;
  edges: unknown[] | null;
  variables: unknown[] | null;
  is_ai_generated: boolean;
  is_active: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}
