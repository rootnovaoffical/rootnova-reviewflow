import { supabase } from "./supabase";

export async function userOrganizationId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("user_organization_id");
  if (error) { console.error("userOrganizationId failed:", error.message); return null; }
  return data as string | null;
}

export async function userBusinessIds(): Promise<string[]> {
  const { data, error } = await supabase.from("business_admins").select("business_id");
  if (error) return [];
  return (data as { business_id: string }[]).map((d) => d.business_id);
}

export async function isBusinessAdminOf(businessId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_business_admin", { p_business_id: businessId });
  if (error) return false;
  return data === true;
}
