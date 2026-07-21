// ============================================================
// MODULE 14 — PUSH NOTIFICATION & NOTIFICATION CENTER SERVICE
// Reuses existing Supabase backend, no duplicate notification engine
// ============================================================

import { supabase } from "./supabase";
import { trackEvent } from "./analytics";

// ---- Types ----

export type MobileNotificationCategory =
  | "ai"
  | "reviews"
  | "campaigns"
  | "customers"
  | "enterprise"
  | "platform"
  | "security";

export type NotificationSeverity = "info" | "warning" | "critical" | "positive";

export interface MobileNotification {
  id: string;
  user_id: string;
  business_id: string | null;
  category: MobileNotificationCategory;
  title: string;
  message: string;
  severity: NotificationSeverity;
  related_id: string | null;
  related_type: string | null;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  created_at: string;
}

export interface MobileDevice {
  id: string;
  user_id: string;
  device_token: string;
  platform: "ios" | "android" | "web";
  device_name: string | null;
  app_version: string | null;
  is_active: boolean;
  last_seen_at: string;
  created_at: string;
}

export interface PushNotification {
  id: string;
  user_id: string;
  device_id: string | null;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  priority: "low" | "normal" | "high";
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

// ---- Device Registration ----

export async function registerDevice(params: {
  deviceToken: string;
  platform: "ios" | "android" | "web";
  deviceName?: string;
  appVersion?: string;
}): Promise<MobileDevice | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("mobile_devices")
    .upsert({
      user_id: user.id,
      device_token: params.deviceToken,
      platform: params.platform,
      device_name: params.deviceName ?? null,
      app_version: params.appVersion ?? null,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "device_token" })
    .select("*")
    .maybeSingle();

  if (error) { console.error("Device registration failed:", error.message); return null; }
  await trackEvent("MOBILE_DEVICE_REGISTERED", null, null, { platform: params.platform });
  return data as MobileDevice | null;
}

export async function unregisterDevice(deviceToken: string): Promise<void> {
  await supabase.from("mobile_devices").update({ is_active: false }).eq("device_token", deviceToken);
}

export async function getActiveDevices(): Promise<MobileDevice[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("mobile_devices").select("*").eq("user_id", user.id).eq("is_active", true);
  return (data ?? []) as MobileDevice[];
}

// ---- Notification Center ----

export async function fetchNotifications(limit = 50): Promise<MobileNotification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("mobile_notification_center")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as MobileNotification[];
}

export async function fetchUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("mobile_notification_center")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from("mobile_notification_center").update({
    is_read: true,
    read_at: new Date().toISOString(),
  }).eq("id", id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("mobile_notification_center").update({
    is_read: true,
    read_at: new Date().toISOString(),
  }).eq("user_id", user.id).eq("is_read", false);
}

export async function deleteNotification(id: string): Promise<void> {
  await supabase.from("mobile_notification_center").delete().eq("id", id);
}

export async function createNotification(params: {
  category: MobileNotificationCategory;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  businessId?: string | null;
  relatedId?: string | null;
  relatedType?: string | null;
  actionUrl?: string | null;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("mobile_notification_center").insert({
    user_id: user.id,
    business_id: params.businessId ?? null,
    category: params.category,
    title: params.title,
    message: params.message,
    severity: params.severity ?? "info",
    related_id: params.relatedId ?? null,
    related_type: params.relatedType ?? null,
    action_url: params.actionUrl ?? null,
  });
}

// ---- Push Notification History ----

export async function fetchPushHistory(limit = 30): Promise<PushNotification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("push_notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PushNotification[];
}
