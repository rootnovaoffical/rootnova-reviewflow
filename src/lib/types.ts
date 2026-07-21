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

export interface ReviewSession {
  id: string;
  business_id: string;
  rating: number;
  answers: Record<string, unknown>[];
  ai_generated_review: string | null;
  ai_status: string;
  google_place_id_snapshot: string | null;
  created_at: string;
  completed_at: string | null;
  business_response: string | null;
  business_response_at: string | null;
}

export interface AnalyticsEvent {
  id: string;
  business_id: string | null;
  session_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
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

export interface QrCode {
  id: string;
  business_id: string;
  name: string;
  qr_type: string;
  destination_url: string;
  status: string;
  scan_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  business_id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  delay_hours: number;
  status: string;
  trigger_count: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  account_status: string;
  avatar_url: string | null;
}
