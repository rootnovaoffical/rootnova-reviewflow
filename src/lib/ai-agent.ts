import { supabase } from "./supabase";
import type {
  AITask,
  AITaskStatus,
  AITaskType,
  AITaskPriority,
  AIRecommendation,
  AIMemory,
  BusinessGoal,
  GoalStatus,
  GoalType,
  AIBriefing,
  BriefingPeriod,
  AISimulation,
  SimulationType,
  AIAgentLog,
  AgentLogLevel,
} from "./types";

// ============================================================
// BUSINESS CONTEXT — resolves the active business for the user
// ============================================================

export async function getActiveBusiness(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return data?.business_id ?? null;
}

// ============================================================
// COMMAND CENTER — aggregates real data from all modules
// ============================================================

export interface CommandCenterData {
  businessHealth: {
    avgRating: number;
    totalReviews: number;
    reviewTrend: number;
    responseRate: number;
    negativeCount: number;
    positiveCount: number;
  };
  recentActivity: {
    reviews: number;
    customers: number;
    messages: number;
    workflows: number;
    campaigns: number;
  };
  criticalIssues: Array<{
    type: string;
    title: string;
    severity: "critical" | "warning";
    count: number;
  }>;
  positiveTrends: string[];
  topPriorities: Array<{
    id: string;
    title: string;
    priority: string;
    confidence: number;
  }>;
  pendingAutomations: number;
  upcomingCampaigns: number;
  communicationPerformance: {
    delivered: number;
    read: number;
    failed: number;
    total: number;
  };
  workflowHealth: {
    total: number;
    active: number;
    executions: number;
    successRate: number;
  };
  nextBestActions: Array<{
    id: string;
    title: string;
    description: string;
    confidence: number;
    expectedImpact: string;
  }>;
}

export async function getCommandCenterData(
  businessId: string
): Promise<CommandCenterData> {
  const [reviews, customers, messages, workflows, executions, campaigns, actionItems] =
    await Promise.all([
      supabase.from("review_sessions").select("rating, business_response, created_at").eq("business_id", businessId),
      supabase.from("customers").select("id, segment, created_at").eq("business_id", businessId),
      supabase.from("messages").select("status, channel, created_at").eq("business_id", businessId),
      supabase.from("workflows").select("id, status, execution_count, success_count, failure_count").eq("business_id", businessId),
      supabase.from("workflow_executions").select("status, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
      supabase.from("campaigns").select("id, status, schedule_start, created_at").eq("business_id", businessId),
      supabase.from("action_items").select("id, title, priority_level, confidence, status").eq("business_id", businessId).eq("status", "open"),
    ]);

  // Business health
  const completedReviews = reviews.data?.filter((r) => r.rating !== null) ?? [];
  const avgRating =
    completedReviews.length > 0
      ? completedReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / completedReviews.length
      : 0;
  const responded = completedReviews.filter((r) => r.business_response).length;
  const responseRate = completedReviews.length > 0 ? (responded / completedReviews.length) * 100 : 0;
  const negativeCount = completedReviews.filter((r) => (r.rating ?? 0) <= 2).length;
  const positiveCount = completedReviews.filter((r) => (r.rating ?? 0) >= 4).length;

  // Review trend (last 7 days vs previous 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentReviews = completedReviews.filter((r) => new Date(r.created_at) >= sevenDaysAgo).length;
  const previousReviews = completedReviews.filter(
    (r) => new Date(r.created_at) >= fourteenDaysAgo && new Date(r.created_at) < sevenDaysAgo
  ).length;
  const reviewTrend = previousReviews > 0 ? ((recentReviews - previousReviews) / previousReviews) * 100 : recentReviews > 0 ? 100 : 0;

  // Recent activity counts
  const recentActivity = {
    reviews: completedReviews.filter((r) => new Date(r.created_at) >= sevenDaysAgo).length,
    customers: customers.data?.filter((c) => new Date(c.created_at) >= sevenDaysAgo).length ?? 0,
    messages: messages.data?.filter((m) => new Date(m.created_at) >= sevenDaysAgo).length ?? 0,
    workflows: executions.data?.filter((e) => new Date(e.created_at) >= sevenDaysAgo).length ?? 0,
    campaigns: campaigns.data?.filter((c) => new Date(c.created_at) >= sevenDaysAgo).length ?? 0,
  };

  // Critical issues
  const criticalIssues: CommandCenterData["criticalIssues"] = [];
  if (negativeCount > 0) {
    criticalIssues.push({
      type: "negative_reviews",
      title: `${negativeCount} negative review${negativeCount > 1 ? "s" : ""} need attention`,
      severity: "critical",
      count: negativeCount,
    });
  }
  const failedMessages = messages.data?.filter((m) => m.status === "failed").length ?? 0;
  if (failedMessages > 0) {
    criticalIssues.push({
      type: "failed_messages",
      title: `${failedMessages} message${failedMessages > 1 ? "s" : ""} failed to deliver`,
      severity: "critical",
      count: failedMessages,
    });
  }
  const failedExecutions = executions.data?.filter((e) => e.status === "failed").length ?? 0;
  if (failedExecutions > 0) {
    criticalIssues.push({
      type: "workflow_failures",
      title: `${failedExecutions} workflow execution${failedExecutions > 1 ? "s" : ""} failed`,
      severity: "warning",
      count: failedExecutions,
    });
  }
  const atRiskCustomers = customers.data?.filter((c) => c.segment === "at_risk").length ?? 0;
  if (atRiskCustomers > 0) {
    criticalIssues.push({
      type: "at_risk_customers",
      title: `${atRiskCustomers} at-risk customer${atRiskCustomers > 1 ? "s" : ""}`,
      severity: "warning",
      count: atRiskCustomers,
    });
  }

  // Positive trends
  const positiveTrends: string[] = [];
  if (reviewTrend > 0) positiveTrends.push(`Review volume up ${reviewTrend.toFixed(0)}% this week`);
  if (positiveCount > negativeCount) positiveTrends.push(`${positiveCount} positive reviews vs ${negativeCount} negative`);
  if (responseRate > 50) positiveTrends.push(`Response rate at ${responseRate.toFixed(0)}%`);
  if (recentActivity.customers > 0) positiveTrends.push(`${recentActivity.customers} new customer${recentActivity.customers > 1 ? "s" : ""} this week`);

  // Top priorities from action items
  const topPriorities = (actionItems.data ?? [])
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority_level] ?? 4) - (order[b.priority_level] ?? 4);
    })
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      title: a.title,
      priority: a.priority_level,
      confidence: parseFloat(a.confidence) || 0,
    }));

  // Pending automations
  const pendingAutomations = workflows.data?.filter((w) => w.status === "active").length ?? 0;

  // Upcoming campaigns
  const upcomingCampaigns = campaigns.data?.filter(
    (c) => c.status === "scheduled" || (c.schedule_start && new Date(c.schedule_start) > now)
  ).length ?? 0;

  // Communication performance
  const totalMessages = messages.data?.length ?? 0;
  const communicationPerformance = {
    delivered: messages.data?.filter((m) => m.status === "delivered" || m.status === "read" || m.status === "clicked").length ?? 0,
    read: messages.data?.filter((m) => m.status === "read" || m.status === "clicked").length ?? 0,
    failed: messages.data?.filter((m) => m.status === "failed").length ?? 0,
    total: totalMessages,
  };

  // Workflow health
  const totalWf = workflows.data?.length ?? 0;
  const activeWf = workflows.data?.filter((w) => w.status === "active").length ?? 0;
  const totalExec = workflows.data?.reduce((s, w) => s + (w.execution_count || 0), 0) ?? 0;
  const totalSuccess = workflows.data?.reduce((s, w) => s + (w.success_count || 0), 0) ?? 0;
  const workflowHealth = {
    total: totalWf,
    active: activeWf,
    executions: totalExec,
    successRate: totalExec > 0 ? (totalSuccess / totalExec) * 100 : 0,
  };

  // Next best actions (from AI tasks)
  const { data: aiTasks } = await supabase
    .from("ai_tasks")
    .select("id, title, description, confidence, expected_impact")
    .eq("business_id", businessId)
    .eq("status", "recommended")
    .order("confidence", { ascending: false })
    .limit(5);

  const nextBestActions = (aiTasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    confidence: t.confidence,
    expectedImpact: t.expected_impact,
  }));

  return {
    businessHealth: { avgRating, totalReviews: completedReviews.length, reviewTrend, responseRate, negativeCount, positiveCount },
    recentActivity,
    criticalIssues,
    positiveTrends,
    topPriorities,
    pendingAutomations,
    upcomingCampaigns,
    communicationPerformance,
    workflowHealth,
    nextBestActions,
  };
}

// ============================================================
// AI TASKS — task queue for the AI agent
// ============================================================

export async function getAITasks(
  businessId: string,
  statusFilter?: AITaskStatus
): Promise<AITask[]> {
  let q = supabase.from("ai_tasks").select("*").eq("business_id", businessId);
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data } = await q.order("created_at", { ascending: false });
  return data ?? [];
}

export async function createAITask(
  businessId: string,
  task: {
    task_type: AITaskType;
    title: string;
    description: string;
    reasoning: string;
    evidence: Record<string, unknown>;
    confidence: number;
    priority: AITaskPriority;
    expected_impact: string;
    affected_customers?: number;
    affected_workflows?: string[] | null;
    related_entity_id?: string | null;
    related_entity_type?: string | null;
  }
): Promise<AITask | null> {
  const { data } = await supabase
    .from("ai_tasks")
    .insert({
      business_id: businessId,
      ...task,
      status: "recommended",
      affected_customers: task.affected_customers ?? 0,
      affected_workflows: task.affected_workflows ?? null,
      related_entity_id: task.related_entity_id ?? null,
      related_entity_type: task.related_entity_type ?? null,
    })
    .select()
    .maybeSingle();
  return data;
}

export async function updateAITaskStatus(
  taskId: string,
  status: AITaskStatus
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === "accepted") updates.accepted_at = new Date().toISOString();
  if (status === "completed") updates.completed_at = new Date().toISOString();
  if (status === "dismissed") updates.dismissed_at = new Date().toISOString();

  await supabase.from("ai_tasks").update(updates).eq("id", taskId);
}

export async function getAITaskStats(businessId: string) {
  const { data } = await supabase
    .from("ai_tasks")
    .select("status, priority, confidence")
    .eq("business_id", businessId);

  const tasks = data ?? [];
  return {
    total: tasks.length,
    recommended: tasks.filter((t) => t.status === "recommended").length,
    accepted: tasks.filter((t) => t.status === "accepted").length,
    running: tasks.filter((t) => t.status === "running").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    dismissed: tasks.filter((t) => t.status === "dismissed").length,
    critical: tasks.filter((t) => t.priority === "critical").length,
    high: tasks.filter((t) => t.priority === "high").length,
  };
}

// ============================================================
// AI RECOMMENDATIONS
// ============================================================

export async function getRecommendations(businessId: string): Promise<AIRecommendation[]> {
  const { data } = await supabase
    .from("ai_recommendations")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createRecommendation(
  businessId: string,
  rec: {
    task_id?: string | null;
    title: string;
    description: string;
    reasoning: string;
    evidence: Record<string, unknown>;
    confidence: number;
    expected_outcome: string;
    business_impact: string;
    category: string;
  }
): Promise<void> {
  await supabase.from("ai_recommendations").insert({
    business_id: businessId,
    ...rec,
    task_id: rec.task_id ?? null,
    status: "pending",
  });
}

export async function updateRecommendationStatus(
  recId: string,
  status: "accepted" | "rejected" | "expired"
): Promise<void> {
  await supabase.from("ai_recommendations").update({ status }).eq("id", recId);
}

// ============================================================
// AI MEMORY — continuous learning
// ============================================================

export async function getMemories(
  businessId: string,
  memoryType?: string
): Promise<AIMemory[]> {
  let q = supabase.from("ai_memory").select("*").eq("business_id", businessId);
  if (memoryType) q = q.eq("memory_type", memoryType);
  const { data } = await q.order("updated_at", { ascending: false });
  return data ?? [];
}

export async function recordMemory(
  businessId: string,
  memory: {
    memory_type: AIMemory["memory_type"];
    key: string;
    value: Record<string, unknown>;
    confidence: number;
    source: string;
  }
): Promise<void> {
  // Upsert: if key exists, update value and increment references
  const { data: existing } = await supabase
    .from("ai_memory")
    .select("id, times_referenced")
    .eq("business_id", businessId)
    .eq("key", memory.key)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("ai_memory")
      .update({
        value: memory.value,
        confidence: memory.confidence,
        times_referenced: (existing.times_referenced || 0) + 1,
        last_referenced_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("ai_memory").insert({
      business_id: businessId,
      ...memory,
      times_referenced: 1,
      last_referenced_at: new Date().toISOString(),
    });
  }
}

export async function getMemoryStats(businessId: string) {
  const { data } = await supabase
    .from("ai_memory")
    .select("memory_type, confidence")
    .eq("business_id", businessId);

  const memories = data ?? [];
  const byType: Record<string, number> = {};
  for (const m of memories) {
    byType[m.memory_type] = (byType[m.memory_type] || 0) + 1;
  }
  return {
    total: memories.length,
    byType,
    avgConfidence: memories.length > 0 ? memories.reduce((s, m) => s + m.confidence, 0) / memories.length : 0,
  };
}

// ============================================================
// BUSINESS GOALS
// ============================================================

export async function getGoals(
  businessId: string,
  statusFilter?: GoalStatus
): Promise<BusinessGoal[]> {
  let q = supabase.from("business_goals").select("*").eq("business_id", businessId);
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data } = await q.order("created_at", { ascending: false });
  return data ?? [];
}

export async function createGoal(
  businessId: string,
  goal: {
    goal_type: GoalType;
    title: string;
    description?: string | null;
    target_value: number;
    current_value?: number;
    unit: string;
    deadline?: string | null;
  }
): Promise<BusinessGoal | null> {
  const { data } = await supabase
    .from("business_goals")
    .insert({
      business_id: businessId,
      ...goal,
      description: goal.description ?? null,
      current_value: goal.current_value ?? 0,
      deadline: goal.deadline ?? null,
      status: "active",
    })
    .select()
    .maybeSingle();
  return data;
}

export async function updateGoalProgress(
  goalId: string,
  currentValue: number
): Promise<void> {
  const { data: goal } = await supabase
    .from("business_goals")
    .select("target_value, progress_history")
    .eq("id", goalId)
    .maybeSingle();

  if (!goal) return;

  const history = (goal.progress_history as Array<{ date: string; value: number }>) ?? [];
  history.push({ date: new Date().toISOString(), value: currentValue });

  const updates: Record<string, unknown> = {
    current_value: currentValue,
    progress_history: history,
  };

  if (currentValue >= goal.target_value) {
    updates.status = "achieved";
    updates.achieved_at = new Date().toISOString();
  }

  await supabase.from("business_goals").update(updates).eq("id", goalId);
}

export async function updateGoalStatus(
  goalId: string,
  status: GoalStatus
): Promise<void> {
  await supabase.from("business_goals").update({ status }).eq("id", goalId);
}

export async function deleteGoal(goalId: string): Promise<void> {
  await supabase.from("business_goals").delete().eq("id", goalId);
}

// ============================================================
// AI BRIEFINGS
// ============================================================

export async function getBriefings(
  businessId: string,
  period?: BriefingPeriod
): Promise<AIBriefing[]> {
  let q = supabase.from("ai_briefings").select("*").eq("business_id", businessId);
  if (period) q = q.eq("period", period);
  const { data } = await q.order("briefing_date", { ascending: false }).limit(30);
  return data ?? [];
}

export async function getLatestBriefing(
  businessId: string,
  period: BriefingPeriod
): Promise<AIBriefing | null> {
  const { data } = await supabase
    .from("ai_briefings")
    .select("*")
    .eq("business_id", businessId)
    .eq("period", period)
    .order("briefing_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function createBriefing(
  businessId: string,
  briefing: {
    period: BriefingPeriod;
    briefing_date: string;
    summary: string;
    wins: string[];
    risks: string[];
    recommendations: string[];
    progress: string[];
    upcoming_opportunities: string[];
    metrics_snapshot: Record<string, unknown>;
  }
): Promise<AIBriefing | null> {
  const { data } = await supabase
    .from("ai_briefings")
    .insert({ business_id: businessId, ...briefing })
    .select()
    .maybeSingle();
  return data;
}

// ============================================================
// AI SIMULATIONS
// ============================================================

export async function getSimulations(businessId: string): Promise<AISimulation[]> {
  const { data } = await supabase
    .from("ai_simulations")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createSimulation(
  businessId: string,
  sim: {
    simulation_type: SimulationType;
    scenario: string;
    current_state: Record<string, unknown>;
    projected_state: Record<string, unknown>;
    assumptions: string[];
    projected_outcome: string;
    confidence: number;
  }
): Promise<AISimulation | null> {
  const { data } = await supabase
    .from("ai_simulations")
    .insert({
      business_id: businessId,
      ...sim,
      is_labelled_estimate: true,
    })
    .select()
    .maybeSingle();
  return data;
}

export async function deleteSimulation(simId: string): Promise<void> {
  await supabase.from("ai_simulations").delete().eq("id", simId);
}

// ============================================================
// AI AGENT LOGS
// ============================================================

export async function getAgentLogs(
  businessId: string,
  levelFilter?: AgentLogLevel,
  limit = 50
): Promise<AIAgentLog[]> {
  let q = supabase
    .from("ai_agent_logs")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (levelFilter) q = q.eq("log_level", levelFilter);
  const { data } = await q;
  return data ?? [];
}

export async function logAgentAction(
  businessId: string,
  log: {
    log_level: AgentLogLevel;
    action: string;
    entity_type?: string | null;
    entity_id?: string | null;
    reasoning?: string | null;
    input_data?: Record<string, unknown> | null;
    output_data?: Record<string, unknown> | null;
    duration_ms?: number | null;
  }
): Promise<void> {
  await supabase.from("ai_agent_logs").insert({
    business_id: businessId,
    ...log,
    entity_type: log.entity_type ?? null,
    entity_id: log.entity_id ?? null,
    reasoning: log.reasoning ?? null,
    input_data: log.input_data ?? null,
    output_data: log.output_data ?? null,
    duration_ms: log.duration_ms ?? null,
  });
}

// ============================================================
// AI ANALYTICS — computed from real data
// ============================================================

export async function getAIAnalytics(businessId: string) {
  const [tasks, recs, memories, goals, briefings, sims, logs] = await Promise.all([
    supabase.from("ai_tasks").select("status, priority, confidence, task_type").eq("business_id", businessId),
    supabase.from("ai_recommendations").select("status, confidence").eq("business_id", businessId),
    supabase.from("ai_memory").select("memory_type, confidence").eq("business_id", businessId),
    supabase.from("business_goals").select("status, goal_type, current_value, target_value").eq("business_id", businessId),
    supabase.from("ai_briefings").select("period, created_at").eq("business_id", businessId),
    supabase.from("ai_simulations").select("simulation_type, confidence").eq("business_id", businessId),
    supabase.from("ai_agent_logs").select("log_level, created_at").eq("business_id", businessId).limit(100),
  ]);

  const taskList = tasks.data ?? [];
  const recList = recs.data ?? [];
  const memList = memories.data ?? [];
  const goalList = goals.data ?? [];
  const briefList = briefings.data ?? [];
  const simList = sims.data ?? [];
  const logList = logs.data ?? [];

  // Task acceptance rate
  const acceptedTasks = taskList.filter((t) => t.status === "accepted" || t.status === "completed").length;
  const totalTasks = taskList.length;
  const acceptanceRate = totalTasks > 0 ? (acceptedTasks / totalTasks) * 100 : 0;

  // Recommendation acceptance
  const acceptedRecs = recList.filter((r) => r.status === "accepted").length;
  const recAcceptanceRate = recList.length > 0 ? (acceptedRecs / recList.length) * 100 : 0;

  // Goal progress
  const activeGoals = goalList.filter((g) => g.status === "active");
  const achievedGoals = goalList.filter((g) => g.status === "achieved");
  const avgGoalProgress =
    activeGoals.length > 0
      ? activeGoals.reduce((s, g) => s + ((g.current_value / g.target_value) * 100), 0) / activeGoals.length
      : 0;

  // Log level breakdown
  const logBreakdown: Record<string, number> = {};
  for (const l of logList) {
    logBreakdown[l.log_level] = (logBreakdown[l.log_level] || 0) + 1;
  }

  // 14-day activity sparkline
  const now = new Date();
  const days: Array<{ date: string; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toISOString().slice(0, 10);
    const count = logList.filter((l) => l.created_at.slice(0, 10) === dayStr).length;
    days.push({ date: dayStr, count });
  }

  return {
    tasks: {
      total: totalTasks,
      recommended: taskList.filter((t) => t.status === "recommended").length,
      accepted: acceptedTasks,
      completed: taskList.filter((t) => t.status === "completed").length,
      dismissed: taskList.filter((t) => t.status === "dismissed").length,
      acceptanceRate,
      byPriority: {
        critical: taskList.filter((t) => t.priority === "critical").length,
        high: taskList.filter((t) => t.priority === "high").length,
        medium: taskList.filter((t) => t.priority === "medium").length,
        low: taskList.filter((t) => t.priority === "low").length,
      },
    },
    recommendations: {
      total: recList.length,
      accepted: acceptedRecs,
      rejected: recList.filter((r) => r.status === "rejected").length,
      pending: recList.filter((r) => r.status === "pending").length,
      acceptanceRate: recAcceptanceRate,
    },
    memory: {
      total: memList.length,
      avgConfidence: memList.length > 0 ? memList.reduce((s, m) => s + m.confidence, 0) / memList.length : 0,
    },
    goals: {
      total: goalList.length,
      active: activeGoals.length,
      achieved: achievedGoals.length,
      avgProgress: avgGoalProgress,
    },
    briefings: {
      total: briefList.length,
      daily: briefList.filter((b) => b.period === "daily").length,
      weekly: briefList.filter((b) => b.period === "weekly").length,
      monthly: briefList.filter((b) => b.period === "monthly").length,
    },
    simulations: {
      total: simList.length,
      avgConfidence: simList.length > 0 ? simList.reduce((s, sim) => s + sim.confidence, 0) / simList.length : 0,
    },
    logs: {
      total: logList.length,
      breakdown: logBreakdown,
      activitySparkline: days,
    },
  };
}

// ============================================================
// AI EDGE FUNCTION CALLS
// ============================================================

export async function callAIAgent(
  businessId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-agent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action, businessId, ...payload }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return { data: null, error: errText || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ============================================================
// GOAL TYPE / TASK TYPE / PRIORITY HELPERS
// ============================================================

export const GOAL_TYPE_META: Record<GoalType, { label: string; icon: string; unit: string }> = {
  rating_target: { label: "Rating Target", icon: "star", unit: "stars" },
  review_conversion: { label: "Review Conversion", icon: "trending_up", unit: "%" },
  repeat_customers: { label: "Repeat Customers", icon: "repeat", unit: "customers" },
  retention: { label: "Retention Rate", icon: "shield", unit: "%" },
  reduce_negative: { label: "Reduce Negative Reviews", icon: "thumb_down", unit: "reviews" },
  increase_loyalty: { label: "Increase Loyalty", icon: "loyalty", unit: "members" },
  increase_engagement: { label: "Increase Engagement", icon: "chat", unit: "interactions" },
  custom: { label: "Custom Goal", icon: "flag", unit: "units" },
};

export const TASK_TYPE_META: Record<AITaskType, { label: string; icon: string; color: string }> = {
  recover_customer: { label: "Recover Customer", icon: "healing", color: "#ef4444" },
  reward_loyalty: { label: "Reward Loyalty", icon: "loyalty", color: "#f59e0b" },
  improve_response_rate: { label: "Improve Response Rate", icon: "reply", color: "#3b82f6" },
  launch_campaign: { label: "Launch Campaign", icon: "campaign", color: "#8b5cf6" },
  pause_automation: { label: "Pause Automation", icon: "pause", color: "#6b7280" },
  adjust_workflow: { label: "Adjust Workflow", icon: "tune", color: "#06b6d4" },
  improve_communication: { label: "Improve Communication", icon: "chat", color: "#10b981" },
  increase_review_conversion: { label: "Increase Review Conversion", icon: "trending_up", color: "#f97316" },
  respond_to_review: { label: "Respond to Review", icon: "rate_review", color: "#ec4899" },
  create_workflow: { label: "Create Workflow", icon: "account_tree", color: "#6366f1" },
  send_message: { label: "Send Message", icon: "send", color: "#0ea5e9" },
  create_action_item: { label: "Create Action Item", icon: "assignment", color: "#f43f5e" },
  update_segment: { label: "Update Segment", icon: "segment", color: "#84cc16" },
  general: { label: "General", icon: "info", color: "#64748b" },
};

export const PRIORITY_META: Record<AITaskPriority, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  high: { label: "High", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  medium: { label: "Medium", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  low: { label: "Low", color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

export const STATUS_META: Record<AITaskStatus, { label: string; color: string; bg: string }> = {
  recommended: { label: "Recommended", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  accepted: { label: "Accepted", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  running: { label: "Running", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  waiting: { label: "Waiting", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  completed: { label: "Completed", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  dismissed: { label: "Dismissed", color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};

export const SIMULATION_TYPE_META: Record<SimulationType, { label: string; icon: string }> = {
  review_response: { label: "Review Response Impact", icon: "rate_review" },
  loyalty_improvement: { label: "Loyalty Improvement", icon: "loyalty" },
  review_conversion: { label: "Review Conversion", icon: "trending_up" },
  campaign_launch: { label: "Campaign Launch", icon: "campaign" },
  communication_strategy: { label: "Communication Strategy", icon: "chat" },
  workflow_automation: { label: "Workflow Automation", icon: "account_tree" },
  custom: { label: "Custom Simulation", icon: "science" },
};

export const MEMORY_TYPE_META: Record<string, { label: string; icon: string }> = {
  recommendation_accepted: { label: "Accepted Recommendation", icon: "check_circle" },
  recommendation_rejected: { label: "Rejected Recommendation", icon: "cancel" },
  workflow_completed: { label: "Workflow Completed", icon: "check" },
  campaign_success: { label: "Campaign Success", icon: "campaign" },
  communication_performance: { label: "Communication Performance", icon: "chat" },
  automation_success: { label: "Automation Success", icon: "auto_mode" },
  customer_trend: { label: "Customer Trend", icon: "trending_up" },
  business_preference: { label: "Business Preference", icon: "tune" },
  pattern_detected: { label: "Pattern Detected", icon: "insights" },
  goal_progress: { label: "Goal Progress", icon: "flag" },
};

export const BRIEFING_PERIOD_META: Record<BriefingPeriod, { label: string; icon: string }> = {
  daily: { label: "Daily Briefing", icon: "today" },
  weekly: { label: "Weekly Briefing", icon: "date_range" },
  monthly: { label: "Monthly Briefing", icon: "calendar_month" },
};
