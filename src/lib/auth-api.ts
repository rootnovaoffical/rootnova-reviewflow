import { supabase } from "./supabase";
import type { Profile, Role } from "./types";

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  account_status: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) { console.error("Failed to load profile:", error.message); return null; }
  return data as ProfileRow | null;
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) { console.error("Failed to load profile:", error.message); return null; }
  return data as Profile | null;
}

export async function claimInitialAdmin(fullName: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("claim_initial_admin", { p_full_name: fullName });
  return { error: error?.message ?? null };
}

export async function claimInitialAdminExists(): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_initial_admin_exists");
  if (error) { console.error("Failed to check initial admin:", error.message); return false; }
  return Boolean(data);
}

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "Unknown";
  const labels: Record<string, string> = {
    ROOTNOVA_SUPER_ADMIN: "Super Admin",
    ROOTNOVA_ADMIN: "Admin",
    PARTNER_OWNER: "Partner Owner",
    PARTNER_ADMIN: "Partner Admin",
    PARTNER_TEAM_MEMBER: "Team Member",
    BUSINESS_ADMIN: "Business Admin",
  };
  return labels[role] || role.replace(/_/g, " ").toLowerCase();
}

export function isRootNovaAdmin(profile: ProfileRow | null | undefined): boolean {
  return profile?.role === "ROOTNOVA_ADMIN" || profile?.role === "ROOTNOVA_SUPER_ADMIN";
}

export function isRootNovaSuperAdmin(profile: ProfileRow | null | undefined): boolean {
  return profile?.role === "ROOTNOVA_SUPER_ADMIN";
}

export function isRootNovaStaff(profile: ProfileRow | null | undefined): boolean {
  return isRootNovaAdmin(profile) || isRootNovaSuperAdmin(profile);
}

export function isPartnerMember(profile: ProfileRow | null | undefined): boolean {
  return profile?.role === "PARTNER_OWNER" || profile?.role === "PARTNER_ADMIN" || profile?.role === "PARTNER_TEAM_MEMBER";
}

export function getHomeRoute(role: Role): string {
  if (role === "ROOTNOVA_SUPER_ADMIN" || role === "ROOTNOVA_ADMIN") return "/superadmin";
  return "/partner";
}
