import { supabase } from "./supabase";
import type { Profile } from "./types";

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) { console.error("fetchProfile:", error.message); return null; }
  return data as Profile | null;
}

export async function fetchProfileByEmail(email: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("email", email).maybeSingle();
  if (error) return null;
  return data as Profile | null;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", userId).select().single();
  if (error) { console.error("updateProfile:", error.message); return null; }
  return data as Profile;
}

export async function insertAuditLog(entry: { actor_id?: string | null; actor_email?: string | null; action: string; target_type?: string | null; target_id?: string | null; organization_id?: string | null; metadata?: Record<string, unknown> }): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert(entry);
  if (error) console.error("insertAuditLog:", error.message);
}

export async function callManageAdmin(action: string, payload: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) return { ok: false, error: "Not authenticated" };

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
  return { ok: true, data: json };
}

export { useAuth } from "../context/AuthContext";
