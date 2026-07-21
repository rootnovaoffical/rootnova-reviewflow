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

// ============================================================
// MODULE 9: AI BUSINESS AGENT
// ============================================================

export type AITaskStatus =
  | "recommended"
  | "accepted"
  | "running"
  | "waiting"
  | "completed"
  | "dismissed";
export type AITaskType =
  | "recover_customer"
  | "reward_loyalty"
  | "improve_response_rate"
  | "launch_campaign"
  | "pause_automation"
  | "adjust_workflow"
  | "improve_communication"
  | "increase_review_conversion"
  | "respond_to_review"
  | "create_workflow"
  | "send_message"
  | "create_action_item"
  | "update_segment"
  | "general";
export type AITaskPriority = "critical" | "high" | "medium" | "low";
export type GoalStatus = "active" | "achieved" | "paused" | "archived";
export type GoalType =
  | "rating_target"
  | "review_conversion"
  | "repeat_customers"
  | "retention"
  | "reduce_negative"
  | "increase_loyalty"
  | "increase_engagement"
  | "custom";
export type BriefingPeriod = "daily" | "weekly" | "monthly";
export type MemoryType =
  | "recommendation_accepted"
  | "recommendation_rejected"
  | "workflow_completed"
  | "campaign_success"
  | "communication_performance"
  | "automation_success"
  | "customer_trend"
  | "business_preference"
  | "pattern_detected"
  | "goal_progress";
export type SimulationType =
  | "review_response"
  | "loyalty_improvement"
  | "review_conversion"
  | "campaign_launch"
  | "communication_strategy"
  | "workflow_automation"
  | "custom";
export type AgentLogLevel = "info" | "warn" | "error" | "debug" | "ai_reasoning";

export interface AITask {
  id: string;
  business_id: string;
  task_type: AITaskType;
  title: string;
  description: string;
  reasoning: string;
  evidence: Record<string, unknown>;
  confidence: number;
  priority: AITaskPriority;
  status: AITaskStatus;
  expected_impact: string;
  affected_customers: number;
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

export interface AIRecommendation {
  id: string;
  business_id: string;
  task_id: string | null;
  title: string;
  description: string;
  reasoning: string;
  evidence: Record<string, unknown>;
  confidence: number;
  expected_outcome: string;
  business_impact: string;
  category: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string;
  updated_at: string;
}

export interface AIMemory {
  id: string;
  business_id: string;
  memory_type: MemoryType;
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  source: string;
  times_referenced: number;
  last_referenced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessGoal {
  id: string;
  business_id: string;
  goal_type: GoalType;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string;
  status: GoalStatus;
  deadline: string | null;
  ai_strategy: string | null;
  progress_history: Array<{ date: string; value: number }> | null;
  achieved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIBriefing {
  id: string;
  business_id: string;
  period: BriefingPeriod;
  briefing_date: string;
  summary: string;
  wins: string[];
  risks: string[];
  recommendations: string[];
  progress: string[];
  upcoming_opportunities: string[];
  metrics_snapshot: Record<string, unknown>;
  created_at: string;
}

export interface AISimulation {
  id: string;
  business_id: string;
  simulation_type: SimulationType;
  scenario: string;
  current_state: Record<string, unknown>;
  projected_state: Record<string, unknown>;
  assumptions: string[];
  projected_outcome: string;
  confidence: number;
  is_labelled_estimate: boolean;
  created_at: string;
}

export interface AIAgentLog {
  id: string;
  business_id: string;
  log_level: AgentLogLevel;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  reasoning: string | null;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  duration_ms: number | null;
  created_at: string;
}
