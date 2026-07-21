import { supabase } from "./supabase";
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  WorkflowLog,
  WorkflowTemplate,
  WorkflowVersion,
  WorkflowStatus,
  WorkflowTriggerType,
  NodeCategory,
  NodeType,
  ExecutionStatus,
} from "./types";

// =========================================================
// NODE REGISTRY
// Modular, extensible registry. Future modules register new
// node types by adding entries here — no engine changes.
// =========================================================

export interface NodeDefinition {
  type: NodeType;
  category: NodeCategory;
  label: string;
  icon: string;
  color: string;
  bg: string;
  description: string;
  configFields: NodeConfigField[];
}

export interface NodeConfigField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "boolean";
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: unknown;
}

export const NODE_REGISTRY: NodeDefinition[] = [
  // === TRIGGERS ===
  {
    type: "trigger",
    category: "trigger",
    label: "Trigger",
    icon: "⚡",
    color: "text-warning-400",
    bg: "bg-warning-500/15",
    description: "Start the workflow when something happens",
    configFields: [
      {
        key: "trigger_event",
        label: "Trigger Event",
        type: "select",
        options: [
          { value: "qr_scanned", label: "QR Scanned" },
          { value: "review_submitted", label: "Review Submitted" },
          { value: "negative_review", label: "Negative Review" },
          { value: "positive_review", label: "Positive Review" },
          { value: "customer_created", label: "Customer Created" },
          { value: "segment_changed", label: "Segment Changed" },
          { value: "campaign_completed", label: "Campaign Completed" },
          { value: "reward_earned", label: "Reward Earned" },
          { value: "message_delivered", label: "Message Delivered" },
          { value: "message_failed", label: "Message Failed" },
          { value: "birthday", label: "Customer Birthday" },
          { value: "festival", label: "Festival" },
          { value: "manual", label: "Manual Trigger" },
          { value: "scheduled", label: "Scheduled" },
          { value: "webhook", label: "Webhook" },
          { value: "api_event", label: "API Event" },
        ],
        defaultValue: "manual",
      },
    ],
  },
  // === CONDITIONS ===
  {
    type: "condition",
    category: "condition",
    label: "Condition",
    icon: "🔀",
    color: "text-accent-300",
    bg: "bg-accent-500/15",
    description: "Branch the workflow based on a condition",
    configFields: [
      { key: "field", label: "Field", type: "select", options: [
        { value: "rating", label: "Rating" },
        { value: "sentiment", label: "Sentiment" },
        { value: "segment", label: "Customer Segment" },
        { value: "loyalty_level", label: "Loyalty Level" },
        { value: "review_count", label: "Review Count" },
        { value: "visit_count", label: "Visit Count" },
        { value: "days_since_last_visit", label: "Days Since Last Visit" },
        { value: "channel", label: "Channel" },
        { value: "time", label: "Time of Day" },
        { value: "day_of_week", label: "Day of Week" },
      ], defaultValue: "rating" },
      { key: "operator", label: "Operator", type: "select", options: [
        { value: "equals", label: "Equals" },
        { value: "not_equals", label: "Not Equals" },
        { value: "greater_than", label: "Greater Than" },
        { value: "less_than", label: "Less Than" },
        { value: "greater_equal", label: "Greater or Equal" },
        { value: "less_equal", label: "Less or Equal" },
        { value: "contains", label: "Contains" },
        { value: "in", label: "In List" },
      ], defaultValue: "equals" },
      { key: "value", label: "Value", type: "text", placeholder: "Enter value..." },
    ],
  },
  // === DELAYS ===
  {
    type: "delay",
    category: "delay",
    label: "Delay",
    icon: "⏳",
    color: "text-slate-400",
    bg: "bg-slate-600/15",
    description: "Wait before continuing to the next node",
    configFields: [
      { key: "delay_type", label: "Delay Type", type: "select", options: [
        { value: "minutes", label: "Minutes" },
        { value: "hours", label: "Hours" },
        { value: "days", label: "Days" },
      ], defaultValue: "hours" },
      { key: "duration", label: "Duration", type: "number", defaultValue: 1 },
    ],
  },
  // === AI DECISION ===
  {
    type: "ai_decision",
    category: "ai_decision",
    label: "AI Decision",
    icon: "🧠",
    color: "text-primary-300",
    bg: "bg-primary-500/15",
    description: "Let AI decide the best path based on customer data",
    configFields: [
      { key: "prompt", label: "AI Prompt", type: "textarea", placeholder: "Describe what AI should decide..." },
      { key: "branches", label: "Number of Branches", type: "number", defaultValue: 2 },
    ],
  },
  // === ACTIONS: Send Message ===
  {
    type: "communication",
    category: "action",
    label: "Send Message",
    icon: "✉️",
    color: "text-accent-300",
    bg: "bg-accent-500/15",
    description: "Send a message through any channel",
    configFields: [
      { key: "channel", label: "Channel", type: "select", options: [
        { value: "sms", label: "SMS" },
        { value: "whatsapp", label: "WhatsApp" },
        { value: "email", label: "Email" },
        { value: "push", label: "Push" },
        { value: "in_app", label: "In-App" },
      ], defaultValue: "sms" },
      { key: "template", label: "Template Category", type: "select", options: [
        { value: "review_request", label: "Review Request" },
        { value: "thank_you", label: "Thank You" },
        { value: "recovery", label: "Recovery" },
        { value: "festival", label: "Festival" },
        { value: "birthday", label: "Birthday" },
        { value: "coupon", label: "Coupon" },
        { value: "follow_up", label: "Follow-up" },
        { value: "reminder", label: "Reminder" },
        { value: "general", label: "General" },
      ], defaultValue: "general" },
      { key: "message", label: "Message Body", type: "textarea", placeholder: "Use {{customer_name}}, {{business_name}} for variables" },
    ],
  },
  // === ACTIONS: Loyalty ===
  {
    type: "loyalty",
    category: "action",
    label: "Add Loyalty Points",
    icon: "💎",
    color: "text-success-400",
    bg: "bg-success-500/15",
    description: "Add loyalty points to customer",
    configFields: [
      { key: "points", label: "Points to Add", type: "number", defaultValue: 10 },
    ],
  },
  // === ACTIONS: Action Center ===
  {
    type: "action_center",
    category: "action",
    label: "Create Action Item",
    icon: "🎯",
    color: "text-warning-400",
    bg: "bg-warning-500/15",
    description: "Create an action item for the team",
    configFields: [
      { key: "title", label: "Action Title", type: "text", placeholder: "e.g. Follow up with customer" },
      { key: "priority", label: "Priority", type: "select", options: [
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ], defaultValue: "medium" },
    ],
  },
  // === ACTIONS: Campaign ===
  {
    type: "campaign",
    category: "action",
    label: "Trigger Campaign",
    icon: "📣",
    color: "text-primary-300",
    bg: "bg-primary-500/15",
    description: "Launch or add customer to a campaign",
    configFields: [
      { key: "campaign_type", label: "Campaign Type", type: "select", options: [
        { value: "review", label: "Review Campaign" },
        { value: "discount", label: "Discount" },
        { value: "festival", label: "Festival" },
        { value: "referral", label: "Referral" },
      ], defaultValue: "review" },
    ],
  },
  // === ACTIONS: Notification ===
  {
    type: "notification",
    category: "action",
    label: "Notify Manager",
    icon: "🔔",
    color: "text-error-400",
    bg: "bg-error-500/15",
    description: "Send a notification to the business manager",
    configFields: [
      { key: "message", label: "Notification Message", type: "textarea", placeholder: "What should the manager know?" },
      { key: "severity", label: "Severity", type: "select", options: [
        { value: "info", label: "Info" },
        { value: "warning", label: "Warning" },
        { value: "critical", label: "Critical" },
      ], defaultValue: "info" },
    ],
  },
  // === ACTIONS: Update Segment ===
  {
    type: "action",
    category: "action",
    label: "Update Customer Segment",
    icon: "👥",
    color: "text-primary-300",
    bg: "bg-primary-500/15",
    description: "Change the customer's segment",
    configFields: [
      { key: "new_segment", label: "New Segment", type: "select", options: [
        { value: "new", label: "New" },
        { value: "returning", label: "Returning" },
        { value: "loyal", label: "Loyal" },
        { value: "vip", label: "VIP" },
        { value: "promoter", label: "Promoter" },
        { value: "passive", label: "Passive" },
        { value: "detractor", label: "Detractor" },
        { value: "inactive", label: "Inactive" },
        { value: "needs_followup", label: "Needs Follow-up" },
      ], defaultValue: "returning" },
    ],
  },
];

export function getNodeDefinition(type: NodeType): NodeDefinition | undefined {
  return NODE_REGISTRY.find((n) => n.type === type);
}

export function getNodesByCategory(category: NodeCategory): NodeDefinition[] {
  return NODE_REGISTRY.filter((n) => n.category === category);
}

export function nodeCategoryMeta(category: NodeCategory): { label: string; icon: string; color: string } {
  const map: Record<NodeCategory, { label: string; icon: string; color: string }> = {
    trigger: { label: "Triggers", icon: "⚡", color: "text-warning-400" },
    condition: { label: "Conditions", icon: "🔀", color: "text-accent-300" },
    action: { label: "Actions", icon: "⚙️", color: "text-primary-300" },
    delay: { label: "Delays", icon: "⏳", color: "text-slate-400" },
    ai_decision: { label: "AI Decisions", icon: "🧠", color: "text-primary-300" },
  };
  return map[category];
}

// =========================================================
// WORKFLOWS CRUD
// =========================================================

export async function fetchWorkflows(businessId: string): Promise<{ data: Workflow[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });
  return { data: data as Workflow[] | null, error: error?.message ?? null };
}

export async function fetchWorkflow(id: string): Promise<{ data: Workflow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .single();
  return { data: data as Workflow | null, error: error?.message ?? null };
}

export async function createWorkflow(
  wf: Omit<Workflow, "id" | "created_at" | "updated_at" | "version" | "execution_count" | "success_count" | "failure_count" | "last_executed_at">,
): Promise<{ data: Workflow | null; error: string | null }> {
  const { data, error } = await supabase.from("workflows").insert(wf).select().single();
  return { data: data as Workflow | null, error: error?.message ?? null };
}

export async function updateWorkflow(
  id: string,
  updates: Partial<Pick<Workflow, "name" | "description" | "status" | "trigger_type" | "trigger_config" | "canvas_data" | "variables" | "is_ai_generated" | "ai_explanation">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("workflows").update(updates).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteWorkflow(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("workflows").delete().eq("id", id);
  return { error: error?.message ?? null };
}

// =========================================================
// WORKFLOW NODES
// =========================================================

export async function fetchWorkflowNodes(workflowId: string): Promise<{ data: WorkflowNode[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("workflow_nodes")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("sort_order");
  return { data: data as WorkflowNode[] | null, error: error?.message ?? null };
}

export async function saveWorkflowNodes(workflowId: string, businessId: string, nodes: Omit<WorkflowNode, "id" | "created_at" | "updated_at" | "workflow_id" | "business_id">[]): Promise<{ error: string | null }> {
  // Delete existing nodes, then insert new ones
  const { error: delErr } = await supabase.from("workflow_nodes").delete().eq("workflow_id", workflowId);
  if (delErr) return { error: delErr.message };
  if (nodes.length === 0) return { error: null };
  const inserts = nodes.map((n) => ({ ...n, workflow_id: workflowId, business_id: businessId }));
  const { error: insErr } = await supabase.from("workflow_nodes").insert(inserts);
  return { error: insErr?.message ?? null };
}

// =========================================================
// WORKFLOW EDGES
// =========================================================

export async function fetchWorkflowEdges(workflowId: string): Promise<{ data: WorkflowEdge[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("workflow_edges")
    .select("*")
    .eq("workflow_id", workflowId);
  return { data: data as WorkflowEdge[] | null, error: error?.message ?? null };
}

export async function saveWorkflowEdges(workflowId: string, businessId: string, edges: Omit<WorkflowEdge, "id" | "created_at" | "workflow_id" | "business_id">[]): Promise<{ error: string | null }> {
  const { error: delErr } = await supabase.from("workflow_edges").delete().eq("workflow_id", workflowId);
  if (delErr) return { error: delErr.message };
  if (edges.length === 0) return { error: null };
  const inserts = edges.map((e) => ({ ...e, workflow_id: workflowId, business_id: businessId }));
  const { error: insErr } = await supabase.from("workflow_edges").insert(inserts);
  return { error: insErr?.message ?? null };
}

// =========================================================
// EXECUTIONS
// =========================================================

export async function fetchExecutions(
  businessId: string,
  workflowId?: string,
  limit = 50,
): Promise<{ data: WorkflowExecution[] | null; error: string | null }> {
  let query = supabase.from("workflow_executions").select("*").eq("business_id", businessId);
  if (workflowId) query = query.eq("workflow_id", workflowId);
  query = query.order("created_at", { ascending: false }).limit(limit);
  const { data, error } = await query;
  return { data: data as WorkflowExecution[] | null, error: error?.message ?? null };
}

export async function createExecution(
  exec: Omit<WorkflowExecution, "id" | "created_at" | "started_at" | "completed_at" | "duration_ms" | "current_node_key" | "retry_count" | "error_message" | "node_history" | "metadata">,
): Promise<{ data: WorkflowExecution | null; error: string | null }> {
  const { data, error } = await supabase.from("workflow_executions").insert({ ...exec, status: "running", node_history: [], metadata: {} }).select().single();
  return { data: data as WorkflowExecution | null, error: error?.message ?? null };
}

export async function updateExecution(
  id: string,
  updates: Partial<Pick<WorkflowExecution, "status" | "current_node_key" | "completed_at" | "duration_ms" | "error_message" | "node_history" | "metadata">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("workflow_executions").update(updates).eq("id", id);
  return { error: error?.message ?? null };
}

// =========================================================
// LOGS
// =========================================================

export async function fetchExecutionLogs(
  businessId: string,
  executionId: string,
): Promise<{ data: WorkflowLog[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("workflow_logs")
    .select("*")
    .eq("business_id", businessId)
    .eq("execution_id", executionId)
    .order("created_at", { ascending: true });
  return { data: data as WorkflowLog[] | null, error: error?.message ?? null };
}

// =========================================================
// TEMPLATES
// =========================================================

export async function fetchWorkflowTemplates(): Promise<{ data: WorkflowTemplate[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("workflow_templates")
    .select("*")
    .eq("is_active", true)
    .order("category");
  return { data: data as WorkflowTemplate[] | null, error: error?.message ?? null };
}

export function templateCategoryMeta(category: string): { label: string; icon: string } {
  const map: Record<string, { label: string; icon: string }> = {
    review_recovery: { label: "Review Recovery", icon: "🚑" },
    customer_engagement: { label: "Customer Engagement", icon: "💬" },
    loyalty: { label: "Loyalty", icon: "💎" },
    campaigns: { label: "Campaigns", icon: "📣" },
    retention: { label: "Retention", icon: "🔄" },
    referral: { label: "Referral", icon: "🤝" },
    general: { label: "General", icon: "📝" },
  };
  return map[category] ?? map.general;
}

// =========================================================
// VERSIONS
// =========================================================

export async function fetchWorkflowVersions(workflowId: string): Promise<{ data: WorkflowVersion[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("workflow_versions")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("version", { ascending: false });
  return { data: data as WorkflowVersion[] | null, error: error?.message ?? null };
}

export async function createWorkflowVersion(version: Omit<WorkflowVersion, "id" | "created_at">): Promise<{ error: string | null }> {
  const { error } = await supabase.from("workflow_versions").insert(version);
  return { error: error?.message ?? null };
}

// =========================================================
// META HELPERS
// =========================================================

export function workflowStatusMeta(status: WorkflowStatus): { label: string; color: string; bg: string; icon: string } {
  const map: Record<WorkflowStatus, { label: string; color: string; bg: string; icon: string }> = {
    draft: { label: "Draft", color: "text-slate-400", bg: "bg-slate-600/15", icon: "📝" },
    active: { label: "Active", color: "text-success-400", bg: "bg-success-500/15", icon: "🟢" },
    paused: { label: "Paused", color: "text-warning-400", bg: "bg-warning-500/15", icon: "⏸️" },
    archived: { label: "Archived", color: "text-slate-500", bg: "bg-slate-600/15", icon: "📦" },
  };
  return map[status] ?? map.draft;
}

export function triggerTypeMeta(type: WorkflowTriggerType): { label: string; icon: string } {
  const map: Record<WorkflowTriggerType, { label: string; icon: string }> = {
    qr_scanned: { label: "QR Scanned", icon: "📱" },
    review_submitted: { label: "Review Submitted", icon: "⭐" },
    negative_review: { label: "Negative Review", icon: "⚠️" },
    positive_review: { label: "Positive Review", icon: "✨" },
    customer_created: { label: "Customer Created", icon: "👤" },
    segment_changed: { label: "Segment Changed", icon: "🔄" },
    campaign_completed: { label: "Campaign Completed", icon: "✅" },
    reward_earned: { label: "Reward Earned", icon: "🎁" },
    message_delivered: { label: "Message Delivered", icon: "📨" },
    message_failed: { label: "Message Failed", icon: "❌" },
    birthday: { label: "Birthday", icon: "🎂" },
    festival: { label: "Festival", icon: "🎉" },
    manual: { label: "Manual", icon: "👆" },
    scheduled: { label: "Scheduled", icon: "📅" },
    webhook: { label: "Webhook", icon: "🔗" },
    api_event: { label: "API Event", icon: "🔌" },
  };
  return map[type] ?? map.manual;
}

export function executionStatusMeta(status: ExecutionStatus): { label: string; color: string; bg: string; icon: string } {
  const map: Record<ExecutionStatus, { label: string; color: string; bg: string; icon: string }> = {
    running: { label: "Running", color: "text-warning-400", bg: "bg-warning-500/15", icon: "🔄" },
    completed: { label: "Completed", color: "text-success-400", bg: "bg-success-500/15", icon: "✅" },
    failed: { label: "Failed", color: "text-error-400", bg: "bg-error-500/15", icon: "❌" },
    paused: { label: "Paused", color: "text-warning-400", bg: "bg-warning-500/15", icon: "⏸️" },
    cancelled: { label: "Cancelled", color: "text-slate-400", bg: "bg-slate-600/15", icon: "🚫" },
  };
  return map[status] ?? map.running;
}

// =========================================================
// ANALYTICS
// =========================================================

export interface WorkflowAnalytics {
  total: number;
  active: number;
  totalExecutions: number;
  successful: number;
  failed: number;
  successRate: number;
  failureRate: number;
  byStatus: Record<string, number>;
  topWorkflows: { id: string; name: string; executions: number; successRate: number }[];
}

export function computeWorkflowAnalytics(workflows: Workflow[], executions: WorkflowExecution[]): WorkflowAnalytics {
  const total = workflows.length;
  const active = workflows.filter((w) => w.status === "active").length;
  const totalExecutions = executions.length;
  const successful = executions.filter((e) => e.status === "completed").length;
  const failed = executions.filter((e) => e.status === "failed").length;

  const byStatus: Record<string, number> = {};
  executions.forEach((e) => { byStatus[e.status] = (byStatus[e.status] || 0) + 1; });

  const workflowExecMap: Record<string, { count: number; success: number }> = {};
  executions.forEach((e) => {
    if (!workflowExecMap[e.workflow_id]) workflowExecMap[e.workflow_id] = { count: 0, success: 0 };
    workflowExecMap[e.workflow_id].count++;
    if (e.status === "completed") workflowExecMap[e.workflow_id].success++;
  });

  const topWorkflows = workflows
    .map((w) => {
      const stats = workflowExecMap[w.id] || { count: 0, success: 0 };
      return { id: w.id, name: w.name, executions: stats.count, successRate: stats.count > 0 ? Math.round((stats.success / stats.count) * 100) : 0 };
    })
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 5);

  return {
    total,
    active,
    totalExecutions,
    successful,
    failed,
    successRate: totalExecutions > 0 ? Math.round((successful / totalExecutions) * 100) : 0,
    failureRate: totalExecutions > 0 ? Math.round((failed / totalExecutions) * 100) : 0,
    byStatus,
    topWorkflows,
  };
}

// =========================================================
// AI WORKFLOW GENERATION
// =========================================================

export interface AIWorkflowResponse {
  workflow: {
    name: string;
    description: string;
    trigger_type: WorkflowTriggerType;
    trigger_config: Record<string, unknown>;
    nodes: { key: string; node_type: NodeType; node_category: NodeCategory; label: string; config: Record<string, unknown>; position_x: number; position_y: number }[];
    edges: { source: string; target: string; label?: string }[];
    variables: string[];
  };
  explanation: string;
  error?: string;
}

export async function generateAIWorkflow(params: {
  businessName: string;
  prompt: string;
  businessContext?: string;
}): Promise<AIWorkflowResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("workflow-ai", {
      body: { ...params, task: "generate_workflow" },
    });
    if (error) return { workflow: { name: "", description: "", trigger_type: "manual", trigger_config: {}, nodes: [], edges: [], variables: [] }, explanation: "", error: error.message };
    return data as AIWorkflowResponse;
  } catch (e) {
    return { workflow: { name: "", description: "", trigger_type: "manual", trigger_config: {}, nodes: [], edges: [], variables: [] }, explanation: "", error: e instanceof Error ? e.message : "Failed to generate workflow" };
  }
}
