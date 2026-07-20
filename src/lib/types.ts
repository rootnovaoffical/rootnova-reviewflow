export type Role = "ROOTNOVA_SUPER_ADMIN" | "ROOTNOVA_ADMIN" | "PARTNER_OWNER" | "PARTNER_ADMIN" | "PARTNER_TEAM_MEMBER" | "BUSINESS_ADMIN";

export type AccountStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  account_status: AccountStatus;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  metadata: Record<string, unknown>;
  logo_url: string | null;
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
  profile?: Profile;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  welcome_message: string;
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

export interface BusinessAdmin {
  id: string;
  business_id: string;
  user_id: string;
  created_at: string;
  profile?: Profile;
}

export interface Question {
  id: string;
  business_id: string;
  question_text: string;
  question_type: string;
  flow_type: string;
  options: string[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewSession {
  id: string;
  business_id: string;
  rating: number;
  answers: Record<string, unknown>[];
  ai_generated_review: string | null;
  ai_status: string;
  google_place_id_snapshot: string | null;
  business_response: string | null;
  business_response_at: string | null;
  created_at: string;
  completed_at: string | null;
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
  features: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
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
  payment_method: string;
  plan_id: string | null;
  billing_cycle: string | null;
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
  metadata: Record<string, unknown>;
  submitted_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformAsset {
  id: string;
  key: string;
  label: string;
  asset_type: string;
  storage_path: string | null;
  public_url: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
}

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  is_enabled: boolean;
  category: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  organization_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  business_id: string | null;
  session_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminInvitation {
  id: string;
  email: string;
  role: string;
  business_id: string | null;
  status: string;
  invited_by: string;
  created_at: string;
  updated_at: string;
}

export type QRType = "reviewflow" | "menu" | "whatsapp" | "website" | "campaign" | "custom";

export interface QRCode {
  id: string;
  business_id: string;
  name: string;
  qr_type: QRType;
  destination_url: string;
  status: "active" | "inactive";
  scan_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type UserRole = Role;

export type FlowType = "RATING_ONLY" | "QUESTIONS" | "DETAILED";

export type ActionItemStatus = "open" | "in_progress" | "resolved" | "dismissed";
export type PriorityLevel = "critical" | "high" | "medium" | "low";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface ActionItem {
  id: string;
  business_id: string;
  title: string;
  explanation: string | null;
  why_it_matters: string | null;
  recommended_action: string | null;
  priority_level: PriorityLevel;
  confidence: ConfidenceLevel;
  status: ActionItemStatus;
  evidence: Record<string, unknown>;
  internal_notes: string | null;
  ai_generated_at: string;
  created_at: string;
  updated_at: string;
}
