import { supabase } from "./supabase";

export async function logAudit(action: string, targetType: string, targetId: string, organizationId: string | null, metadata?: Record<string, unknown>): Promise<void> {
  try {
    await supabase.rpc("log_audit", {
      p_action: action, p_target_type: targetType, p_target_id: targetId, p_organization_id: organizationId, p_metadata: metadata ?? {},
    });
  } catch (e) { console.error("logAudit failed:", e); }
}

export async function fetchAuditLogs(limit = 100): Promise<{ id: string; actor_id: string | null; actor_email: string | null; action: string; target_type: string | null; target_id: string | null; organization_id: string | null; metadata: Record<string, unknown> | null; created_at: string }[]> {
  const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) return [];
  return data as { id: string; actor_id: string | null; actor_email: string | null; action: string; target_type: string | null; target_id: string | null; organization_id: string | null; metadata: Record<string, unknown> | null; created_at: string }[];
}
