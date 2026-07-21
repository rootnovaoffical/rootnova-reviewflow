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
  industry: string | null;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  google_review_url: string | null;
  plan_tier: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface ReviewSession {
  id: string;
  business_id: string;
  customer_name: string | null;
  customer_email: string | null;
  rating: number | null;
  status: string;
  ai_review_text: string | null;
  answers: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  business_id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Question {
  id: string;
  business_id: string;
  text: string;
  flow_type: string;
  options: string[] | null;
  condition_rating_min: number | null;
  condition_rating_max: number | null;
  order_index: number;
  created_at: string;
}

export interface QrCode {
  id: string;
  business_id: string;
  name: string;
  url: string;
  scans: number;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  business_id: string;
  name: string;
  trigger: string;
  action: string;
  is_active: boolean;
  created_at: string;
}

export interface Workflow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  steps: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  steps: Record<string, unknown> | null;
  created_at: string;
}

export interface Message {
  id: string;
  business_id: string;
  customer_id: string | null;
  channel: string;
  direction: string;
  body: string;
  status: string;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  business_id: string;
  name: string;
  body: string;
  channel: string;
  created_at: string;
}

export interface ScheduledMessage {
  id: string;
  business_id: string;
  customer_id: string | null;
  channel: string;
  body: string;
  scheduled_for: string;
  status: string;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  loyalty_points: number;
  created_at: string;
}

export interface LoyaltyProgram {
  id: string;
  business_id: string;
  name: string;
  points_per_review: number;
  reward_threshold: number;
  is_active: boolean;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  business_id: string;
  plan_id: string | null;
  status: string;
  current_period_end: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  business_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  business_id: string;
  amount: number;
  status: string;
  due_date: string | null;
  created_at: string;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  category: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InstalledIntegration {
  id: string;
  business_id: string;
  provider_id: string | null;
  config: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiKey {
  id: string;
  business_id: string;
  name: string;
  key_prefix: string;
  scopes: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface DeveloperApp {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  redirect_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Webhook {
  id: string;
  business_id: string;
  url: string;
  events: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface ReportTemplate {
  id: string;
  business_id: string;
  name: string;
  type: string;
  config: Record<string, unknown> | null;
  created_at: string;
}

export interface ScheduledReport {
  id: string;
  business_id: string;
  template_id: string | null;
  frequency: string;
  next_run: string | null;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AiTask {
  id: string;
  business_id: string;
  type: string;
  status: string;
  result: Record<string, unknown> | null;
  created_at: string;
}

export interface AiRecommendation {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

export interface AiBriefing {
  id: string;
  business_id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface AiSimulation {
  id: string;
  business_id: string;
  scenario: string;
  outcome: string | null;
  created_at: string;
}

export interface BusinessGoal {
  id: string;
  business_id: string;
  title: string;
  target_value: number;
  current_value: number;
  deadline: string | null;
  status: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  channel: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface BusinessAdmin {
  id: string;
  business_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface EnterpriseBranch {
  id: string;
  organization_id: string;
  business_id: string;
  name: string;
  region: string | null;
  created_at: string;
}

export interface EnterpriseRegion {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export interface CommunicationProvider {
  id: string;
  name: string;
  channel: string;
  is_active: boolean;
  created_at: string;
}

export interface ProviderConfig {
  id: string;
  business_id: string;
  provider_id: string | null;
  config: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface UsageRecord {
  id: string;
  business_id: string;
  metric: string;
  value: number;
  recorded_at: string;
}
