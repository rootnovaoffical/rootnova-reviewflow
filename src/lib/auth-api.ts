import { supabase } from "./supabase";
import type { Profile, Role } from "./types";

export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) { console.error("Failed to load profile:", error.message); return null; }
  return data as Profile | null;
}

export async function claimInitialAdmin(fullName: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("claim_initial_admin", { p_full_name: fullName });
  return { error: error?.message ?? null };
}

export function getHomeRoute(role: Role): string {
  if (role === "ROOTNOVA_SUPER_ADMIN" || role === "ROOTNOVA_ADMIN") return "/superadmin";
  return "/partner";
}
