import { supabase } from "./supabase";
import type {
  CommunicationProvider,
  ProviderConfig,
  MessageTemplate,
  Message,
  MessageEvent,
  CommunicationAuditLog,
  ScheduledMessage,
  DeliveryLog,
  CommunicationChannel,
  MessageStatus,
  ScheduleType,
  TemplateCategory,
} from "./types";

// =========================================================
// PROVIDERS
// =========================================================

export async function fetchProviders(): Promise<{ data: CommunicationProvider[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("communication_providers")
    .select("*")
    .eq("is_active", true)
    .order("display_name");
  return { data: data as CommunicationProvider[] | null, error: error?.message ?? null };
}

export function channelMeta(channel: CommunicationChannel): { label: string; icon: string; color: string; bg: string } {
  const map: Record<CommunicationChannel, { label: string; icon: string; color: string; bg: string }> = {
    whatsapp: { label: "WhatsApp", icon: "💬", color: "text-success-400", bg: "bg-success-500/15" },
    sms: { label: "SMS", icon: "📱", color: "text-primary-300", bg: "bg-primary-500/15" },
    email: { label: "Email", icon: "✉️", color: "text-accent-300", bg: "bg-accent-500/15" },
    push: { label: "Push", icon: "🔔", color: "text-warning-400", bg: "bg-warning-500/15" },
    in_app: { label: "In-App", icon: "📲", color: "text-primary-300", bg: "bg-primary-500/15" },
  };
  return map[channel] ?? map.in_app;
}

// =========================================================
// PROVIDER CONFIGS
// =========================================================

export async function fetchProviderConfigs(
  businessId: string,
): Promise<{ data: ProviderConfig[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("provider_configs")
    .select("*, provider:communication_providers(*)")
    .eq("business_id", businessId)
    .order("created_at");
  return { data: data as ProviderConfig[] | null, error: error?.message ?? null };
}

export async function enableProviderConfig(
  businessId: string,
  providerId: string,
  isDefault = false,
): Promise<{ data: ProviderConfig | null; error: string | null }> {
  const { data, error } = await supabase
    .from("provider_configs")
    .insert({ business_id: businessId, provider_id: providerId, is_enabled: true, is_default: isDefault, config: {} })
    .select()
    .single();
  return { data: data as ProviderConfig | null, error: error?.message ?? null };
}

export async function updateProviderConfig(
  id: string,
  updates: Partial<Pick<ProviderConfig, "config" | "is_enabled" | "is_default">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("provider_configs").update(updates).eq("id", id);
  return { error: error?.message ?? null };
}

export async function disableProviderConfig(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("provider_configs").update({ is_enabled: false }).eq("id", id);
  return { error: error?.message ?? null };
}

// =========================================================
// MESSAGE TEMPLATES
// =========================================================

export async function fetchTemplates(
  businessId: string,
): Promise<{ data: MessageTemplate[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false });
  return { data: data as MessageTemplate[] | null, error: error?.message ?? null };
}

export async function createTemplate(
  template: Omit<MessageTemplate, "id" | "created_at" | "updated_at" | "version" | "ai_optimization_score">,
): Promise<{ data: MessageTemplate | null; error: string | null }> {
  const { data, error } = await supabase.from("message_templates").insert(template).select().single();
  return { data: data as MessageTemplate | null, error: error?.message ?? null };
}

export async function updateTemplate(
  id: string,
  updates: Partial<Pick<MessageTemplate, "name" | "category" | "channel" | "subject" | "body" | "variables" | "locale" | "is_active">>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("message_templates").update(updates).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteTemplate(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("message_templates").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export function categoryMeta(category: TemplateCategory): { label: string; icon: string } {
  const map: Record<TemplateCategory, { label: string; icon: string }> = {
    review_request: { label: "Review Request", icon: "⭐" },
    thank_you: { label: "Thank You", icon: "🙏" },
    recovery: { label: "Recovery", icon: "🚑" },
    festival: { label: "Festival", icon: "🎉" },
    birthday: { label: "Birthday", icon: "🎂" },
    coupon: { label: "Coupon", icon: "🎟️" },
    follow_up: { label: "Follow-up", icon: "📨" },
    reminder: { label: "Reminder", icon: "⏰" },
    general: { label: "General", icon: "📝" },
  };
  return map[category] ?? map.general;
}

// =========================================================
// MESSAGES
// =========================================================

export async function fetchMessages(
  businessId: string,
  filters?: { status?: MessageStatus; channel?: CommunicationChannel; limit?: number },
): Promise<{ data: Message[] | null; error: string | null }> {
  let query = supabase.from("messages").select("*").eq("business_id", businessId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.channel) query = query.eq("channel", filters.channel);
  query = query.order("created_at", { ascending: false }).limit(filters?.limit ?? 100);
  const { data, error } = await query;
  return { data: data as Message[] | null, error: error?.message ?? null };
}

export async function createMessage(
  message: Omit<Message, "id" | "created_at" | "updated_at" | "sent_at" | "delivered_at" | "read_at" | "clicked_at" | "failed_at" | "retry_count" | "next_retry_at" | "provider_message_id" | "provider_response" | "error_message">,
): Promise<{ data: Message | null; error: string | null }> {
  const { data, error } = await supabase.from("messages").insert(message).select().single();
  return { data: data as Message | null, error: error?.message ?? null };
}

export async function updateMessageStatus(
  id: string,
  status: MessageStatus,
  extraUpdates?: Record<string, unknown>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("messages").update({ status, ...extraUpdates }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function retryMessage(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("messages")
    .update({ status: "retrying", next_retry_at: new Date(Date.now() + 60000).toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function archiveMessage(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("messages").update({ status: "archived" }).eq("id", id);
  return { error: error?.message ?? null };
}

export function statusMeta(status: MessageStatus): { label: string; color: string; bg: string; icon: string } {
  const map: Record<MessageStatus, { label: string; color: string; bg: string; icon: string }> = {
    created: { label: "Created", color: "text-slate-400", bg: "bg-slate-600/15", icon: "📝" },
    queued: { label: "Queued", color: "text-primary-300", bg: "bg-primary-500/15", icon: "📥" },
    scheduled: { label: "Scheduled", color: "text-accent-300", bg: "bg-accent-500/15", icon: "📅" },
    sending: { label: "Sending", color: "text-warning-400", bg: "bg-warning-500/15", icon: "📤" },
    delivered: { label: "Delivered", color: "text-success-400", bg: "bg-success-500/15", icon: "✅" },
    read: { label: "Read", color: "text-success-400", bg: "bg-success-500/15", icon: "👁️" },
    clicked: { label: "Clicked", color: "text-primary-300", bg: "bg-primary-500/15", icon: "🖱️" },
    failed: { label: "Failed", color: "text-error-400", bg: "bg-error-500/15", icon: "❌" },
    retrying: { label: "Retrying", color: "text-warning-400", bg: "bg-warning-500/15", icon: "🔄" },
    archived: { label: "Archived", color: "text-slate-500", bg: "bg-slate-600/15", icon: "📦" },
  };
  return map[status] ?? map.created;
}

// =========================================================
// MESSAGE EVENTS (Timeline)
// =========================================================

export async function fetchMessageEvents(
  businessId: string,
  messageId: string,
): Promise<{ data: MessageEvent[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("message_events")
    .select("*")
    .eq("business_id", businessId)
    .eq("message_id", messageId)
    .order("created_at", { ascending: false });
  return { data: data as MessageEvent[] | null, error: error?.message ?? null };
}

export function eventTypeMeta(eventType: string): { label: string; icon: string; color: string } {
  const map: Record<string, { label: string; icon: string; color: string }> = {
    created: { label: "Created", icon: "📝", color: "text-slate-400" },
    queued: { label: "Queued", icon: "📥", color: "text-primary-300" },
    scheduled: { label: "Scheduled", icon: "📅", color: "text-accent-300" },
    sending: { label: "Sending", icon: "📤", color: "text-warning-400" },
    delivered: { label: "Delivered", icon: "✅", color: "text-success-400" },
    read: { label: "Read", icon: "👁️", color: "text-success-400" },
    clicked: { label: "Clicked", icon: "🖱️", color: "text-primary-300" },
    failed: { label: "Failed", icon: "❌", color: "text-error-400" },
    retried: { label: "Retried", icon: "🔄", color: "text-warning-400" },
    archived: { label: "Archived", icon: "📦", color: "text-slate-500" },
  };
  return map[eventType] ?? { label: eventType, icon: "📌", color: "text-slate-400" };
}

// =========================================================
// SCHEDULED MESSAGES
// =========================================================

export async function fetchScheduledMessages(
  businessId: string,
): Promise<{ data: ScheduledMessage[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("scheduled_messages")
    .select("*, message:messages(*)")
    .eq("business_id", businessId)
    .eq("is_processed", false)
    .order("scheduled_for", { ascending: true });
  return { data: data as ScheduledMessage[] | null, error: error?.message ?? null };
}

export async function createScheduledMessage(
  sched: Omit<ScheduledMessage, "id" | "created_at" | "updated_at" | "is_processed" | "processed_at">,
): Promise<{ data: ScheduledMessage | null; error: string | null }> {
  const { data, error } = await supabase.from("scheduled_messages").insert(sched).select().single();
  return { data: data as ScheduledMessage | null, error: error?.message ?? null };
}

export async function cancelScheduledMessage(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("scheduled_messages").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export function scheduleTypeMeta(type: ScheduleType): { label: string; icon: string } {
  const map: Record<ScheduleType, { label: string; icon: string }> = {
    immediate: { label: "Immediate", icon: "⚡" },
    scheduled: { label: "Scheduled", icon: "📅" },
    recurring: { label: "Recurring", icon: "🔄" },
    delayed: { label: "Delayed", icon: "⏳" },
  };
  return map[type];
}

// =========================================================
// DELIVERY LOGS
// =========================================================

export async function fetchDeliveryLogs(
  businessId: string,
  messageId: string,
): Promise<{ data: DeliveryLog[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("delivery_logs")
    .select("*")
    .eq("business_id", businessId)
    .eq("message_id", messageId)
    .order("created_at", { ascending: false });
  return { data: data as DeliveryLog[] | null, error: error?.message ?? null };
}

// =========================================================
// AUDIT LOGS
// =========================================================

export async function fetchCommunicationAuditLogs(
  businessId: string,
  limit = 50,
): Promise<{ data: CommunicationAuditLog[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("communication_audit_logs")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: data as CommunicationAuditLog[] | null, error: error?.message ?? null };
}

// =========================================================
// ANALYTICS (computed client-side from messages)
// =========================================================

export interface CommunicationAnalytics {
  total: number;
  delivered: number;
  read: number;
  clicked: number;
  failed: number;
  retrying: number;
  deliveryRate: number;
  readRate: number;
  clickRate: number;
  failureRate: number;
  byChannel: Record<string, { total: number; delivered: number; failed: number; rate: number }>;
  byStatus: Record<string, number>;
}

export function computeAnalytics(messages: Message[]): CommunicationAnalytics {
  const total = messages.length;
  const delivered = messages.filter((m) => m.status === "delivered" || m.status === "read" || m.status === "clicked").length;
  const read = messages.filter((m) => m.status === "read" || m.status === "clicked").length;
  const clicked = messages.filter((m) => m.status === "clicked").length;
  const failed = messages.filter((m) => m.status === "failed").length;
  const retrying = messages.filter((m) => m.status === "retrying").length;

  const byChannel: Record<string, { total: number; delivered: number; failed: number; rate: number }> = {};
  const byStatus: Record<string, number> = {};

  messages.forEach((m) => {
    if (!byChannel[m.channel]) byChannel[m.channel] = { total: 0, delivered: 0, failed: 0, rate: 0 };
    byChannel[m.channel].total++;
    if (["delivered", "read", "clicked"].includes(m.status)) byChannel[m.channel].delivered++;
    if (m.status === "failed") byChannel[m.channel].failed++;
    byStatus[m.status] = (byStatus[m.status] || 0) + 1;
  });

  Object.keys(byChannel).forEach((ch) => {
    byChannel[ch].rate = byChannel[ch].total > 0 ? Math.round((byChannel[ch].delivered / byChannel[ch].total) * 100) : 0;
  });

  return {
    total,
    delivered,
    read,
    clicked,
    failed,
    retrying,
    deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
    readRate: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
    clickRate: delivered > 0 ? Math.round((clicked / delivered) * 100) : 0,
    failureRate: total > 0 ? Math.round((failed / total) * 100) : 0,
    byChannel,
    byStatus,
  };
}

// =========================================================
// AI MESSAGE GENERATION
// =========================================================

export interface AIGeneratedMessage {
  subject: string;
  body: string;
  tone: string;
  optimization_score: number;
  suggested_channel: CommunicationChannel;
  suggested_timing: string;
}

export interface AIMessageResponse {
  messages: AIGeneratedMessage[];
  message?: string;
  error?: string;
}

export async function generateAIMessages(params: {
  businessName: string;
  messageType: TemplateCategory;
  channel?: CommunicationChannel;
  customerName?: string;
  rating?: number;
  reviewText?: string;
  businessContext?: string;
  locale?: string;
}): Promise<AIMessageResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("communication-ai", {
      body: { ...params, task: "generate_message" },
    });
    if (error) return { messages: [], error: error.message };
    return data as AIMessageResponse;
  } catch (e) {
    return { messages: [], error: e instanceof Error ? e.message : "Failed to generate messages" };
  }
}

export async function optimizeTemplate(params: {
  templateId: string;
  businessName: string;
  body: string;
  category: TemplateCategory;
  channel: CommunicationChannel;
  customerName?: string;
}): Promise<{ optimized_body: string; score: number; suggestions: string[]; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("communication-ai", {
      body: { ...params, task: "optimize_template" },
    });
    if (error) return { optimized_body: "", score: 0, suggestions: [], error: error.message };
    return data;
  } catch (e) {
    return { optimized_body: "", score: 0, suggestions: [], error: e instanceof Error ? e.message : "Failed to optimize" };
  }
}

// =========================================================
// VARIABLE SUBSTITUTION
// =========================================================

export function substituteVariables(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

export function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
}
