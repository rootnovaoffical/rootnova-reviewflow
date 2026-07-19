// Business admin management — calls the `manage-admin` edge function which
// uses the service-role key to create auth users and link them to businesses.

import { SUPABASE_URL, supabase } from "./supabase";

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callManageAdmin(body: unknown) {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const e = await res.json();
      msg = e?.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function createBusinessAdmin(input: {
  email: string;
  full_name: string;
  business_id: string;
  password?: string;
}): Promise<{
  user_id: string;
  email: string;
  full_name: string;
  password?: string;
  already_existed: boolean;
}> {
  return callManageAdmin({ action: "create", ...input });
}

export async function listBusinessAdminsRemote(businessId: string): Promise<unknown[]> {
  const data = await callManageAdmin({ action: "list", business_id: businessId });
  return data.admins as unknown[];
}

export async function removeBusinessAdmin(adminId: string): Promise<void> {
  await callManageAdmin({ action: "remove", admin_id: adminId });
}
