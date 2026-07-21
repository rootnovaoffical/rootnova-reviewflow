// ============================================================
// ROOTNOVA REVIEWFLOW — SHARED TYPE DEFINITIONS
// ============================================================

// ---- Module 1: Customer Review Core ----
export type ReviewStatus = "pending" | "completed" | "abandoned";
export type AIStatus = "pending" | "processing" | "done" | "failed";

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

export interface ReviewSession {
  id: string;
  business_id: string;
  rating: number | null;
  answers: Record<string, unknown> | null;
  ai_generated_review: string | null;
  ai_status: AIStatus;
  google_place_id_snapshot: string | null;
  created_at: string;
  completed_at: string | null;
  business_response: string | null;
  business_response_at: string | null;
}

// ---- Module 3: QR Management ----
export interface QRCode {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  qr_code_url: string | null;
  scan_count: number;
  is_active: boolean;
  location_label: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Module 4: Review Intelligence ----
export type IntelligenceInsightType =
  | "sentiment"
  | "rating_trend"
  | "volume_spike"
  | "keyword_cluster"
  | "response_gap"
  | "comparison"
  | "recommendation";

export interface IntelligenceInsight {
  id: string;
  business_id: string;
  insight_type: IntelligenceInsightType;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  confidence: number;
  severity: "info" | "warning" | "critical" | "positive";
  created_at: string;
}

// ---- Module 5: Action Center ----
export type ActionPriority = "critical" | "high" | "medium" | "low";
export type ActionStatus = "open" | "in_progress" | "completed" | "dismissed";

export interface ActionItem {
  id: string;
  business_id: string;
  title: string;
  explanation: string;
  why_it_matters: string;
  recommended_action: string;
  priority_level: ActionPriority;
  confidence: string;
  status: ActionStatus;
  evidence: Record<string, unknown> | null;
  internal_notes: string | null;
  ai_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Module 6: Customer Engagement ----
export type CustomerSegment =
  | "new"
  | "active"
  | "repeat"
  | "vip"
  | "at_risk"
  | "churned"
  | "inactive";

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
  segment: CustomerSegment;
  segment_updated_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerEvent {
  id: string;
  business_id: string;
  customer_id: string;
  review_session_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

export interface EngagementNotification {
  id: string;
  business_id: string;
  notification_type: string;
  title: string;
  message: string;
  severity: string;
  related_id: string | null;
  related_type: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
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

// ---- Module 6b: Loyalty ----
export interface LoyaltyProgram {
  id: string;
  business_id: string;
  name: string;
  program_type: string;
  target_count: number;
  reward_description: string;
  points_per_action: number;
  status: string;
  redeemed_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerLoyalty {
  id: string;
  business_id: string;
  customer_id: string;
  program_id: string;
  points: number;
  visits_counted: number;
  reward_unlocked: boolean;
  unlocked_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Module 6c: Campaigns ----
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

// ---- Module 7: Communication Hub ----
export type CommunicationChannel = "whatsapp" | "sms" | "email" | "push" | "in_app";
export type MessageStatus =
  | "created"
  | "queued"
  | "scheduled"
  | "sending"
  | "delivered"
  | "read"
  | "clicked"
  | "failed"
  | "retrying"
  | "archived";
export type ScheduleType = "immediate" | "scheduled" | "recurring" | "delayed";
export type TemplateCategory =
  | "review_request"
  | "thank_you"
  | "recovery"
  | "festival"
  | "birthday"
  | "coupon"
  | "follow_up"
  | "reminder"
  | "general";

export interface CommunicationProvider {
  id: string;
  name: string;
  channel: CommunicationChannel;
  provider_type: string;
  is_active: boolean;
  supported_features: string[];
  created_at: string;
  updated_at: string;
}

export interface ProviderConfig {
  id: string;
  business_id: string;
  provider_id: string;
  is_enabled: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  business_id: string;
  name: string;
  channel: CommunicationChannel;
  category: TemplateCategory;
  subject: string | null;
  body: string;
  variables: string[];
  language: string;
  is_active: boolean;
  is_ai_optimized: boolean;
  ai_optimization_notes: string | null;
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
  channel: CommunicationChannel;
  provider_id: string | null;
  recipient_identifier: string;
  recipient_name: string | null;
  subject: string | null;
  body: string;
  status: MessageStatus;
  priority: number;
  scheduled_for: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  clicked_at: string | null;
  failed_at: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  provider_message_id: string | null;
  provider_response: Record<string, unknown> | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MessageEvent {
  id: string;
  business_id: string;
  message_id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  provider_response: Record<string, unknown> | null;
  latency_ms: number | null;
  created_at: string;
}

export interface CommunicationAuditLog {
  id: string;
  business_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ScheduledMessage {
  id: string;
  business_id: string;
  message_id: string;
  schedule_type: ScheduleType;
  scheduled_for: string;
  recurrence_rule: string | null;
  is_processed: boolean;
  processed_at: string | null;
  created_at: string;
}

export interface DeliveryLog {
  id: string;
  business_id: string;
  message_id: string;
  provider_id: string;
  status: string;
  provider_response: Record<string, unknown> | null;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
}

// ---- Module 8: Workflow Builder ----
export type WorkflowStatus = "draft" | "active" | "paused" | "archived";
export type WorkflowTriggerType =
  | "qr_scanned"
  | "review_submitted"
  | "negative_review"
  | "positive_review"
  | "customer_created"
  | "segment_changed"
  | "campaign_completed"
  | "reward_earned"
  | "message_delivered"
  | "message_failed"
  | "birthday"
  | "festival"
  | "manual"
  | "scheduled"
  | "webhook"
  | "api_event";
export type NodeCategory = "trigger" | "condition" | "action" | "delay" | "ai_decision";
export type NodeType =
  | "trigger"
  | "action"
  | "condition"
  | "delay"
  | "ai_decision"
  | "notification"
  | "campaign"
  | "loyalty"
  | "communication"
  | "review"
  | "action_center";
export type ExecutionStatus = "running" | "completed" | "failed" | "paused" | "cancelled";

export interface Workflow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  trigger_type: WorkflowTriggerType;
  trigger_config: Record<string, unknown> | null;
  canvas_data: Record<string, unknown> | null;
  variables: Record<string, unknown>[] | null;
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

export interface WorkflowNode {
  id: string;
  workflow_id: string;
  node_key: string;
  type: NodeType;
  category: NodeCategory;
  label: string;
  config: Record<string, unknown> | null;
  position_x: number;
  position_y: number;
  is_collapsed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEdge {
  id: string;
  workflow_id: string;
  source_node_key: string;
  target_node_key: string;
  label: string | null;
  condition_config: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  business_id: string;
  workflow_id: string;
  workflow_version: number;
  trigger_source: string;
  trigger_data: Record<string, unknown> | null;
  status: ExecutionStatus;
  current_node_key: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  retry_count: number;
  error_message: string | null;
  node_history: Record<string, unknown>[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface WorkflowLog {
  id: string;
  business_id: string;
  execution_id: string;
  node_key: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  ai_reasoning: string | null;
  provider_used: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface WorkflowTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string;
  category: string;
  trigger_type: WorkflowTriggerType;
  trigger_config: Record<string, unknown> | null;
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  variables: Record<string, unknown>[];
  is_ai_generated: boolean;
  is_active: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version_number: number;
  canvas_data: Record<string, unknown> | null;
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  variables: Record<string, unknown>[];
  change_notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ---- Module 9: AI Business Agent ----
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
  progress_history: Record<string, number>[] | null;
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

// ---- Auth ----
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  account_status: string;
  avatar_url: string | null;
}

export interface BusinessAdmin {
  id: string;
  business_id: string;
  user_id: string;
  created_at: string;
}
