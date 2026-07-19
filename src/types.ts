// Shared domain types for RootNova ReviewFlow.

export type UserRole = "ROOTNOVA_ADMIN" | "BUSINESS_ADMIN";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type BusinessStatus = "active" | "inactive";

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
  status: BusinessStatus;
  created_at: string;
  updated_at: string;
}

export type BusinessAdmin = {
  id: string;
  business_id: string;
  user_id: string;
  created_at: string;
  profiles?: { full_name: string; email: string | null } | null;
};

export type FlowType = "ALWAYS" | "POSITIVE" | "NEGATIVE";

export interface Question {
  id: string;
  business_id: string;
  question_text: string;
  question_type: "multiple_choice";
  flow_type: FlowType;
  options: string[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type AIStatus = "pending" | "generating" | "completed" | "failed";

export interface ReviewSession {
  id: string;
  business_id: string;
  rating: number;
  answers: SessionAnswer[];
  ai_generated_review: string | null;
  ai_status: AIStatus;
  google_place_id_snapshot: string | null;
  created_at: string;
  completed_at: string | null;
  businesses?: { name: string; slug: string } | null;
}

export interface SessionAnswer {
  question_id: string;
  question_text: string;
  flow_type: FlowType;
  selected: string[];
}

export type AnalyticsEventType =
  | "REVIEW_PAGE_VIEWED"
  | "RATING_SELECTED"
  | "QUESTION_ANSWERED"
  | "SESSION_SUBMITTED"
  | "AI_REVIEW_GENERATED"
  | "AI_REVIEW_FAILED"
  | "REVIEW_COPIED"
  | "GOOGLE_REVIEW_CLICKED";

export interface AnalyticsEvent {
  id: string;
  business_id: string | null;
  session_id: string | null;
  event_type: AnalyticsEventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ReviewGenerationResult {
  review: string;
  session_id: string;
  google_review_url: string;
}

export interface DashboardMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  totalSessions: number;
  sessionsLast30Days: number;
  averageRating: number;
  aiReviewsGenerated: number;
}

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface SessionsOverTimePoint {
  date: string;
  count: number;
}

export interface SentimentSplit {
  positive: number;
  neutral: number;
  negative: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}
