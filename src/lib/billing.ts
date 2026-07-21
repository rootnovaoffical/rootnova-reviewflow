import { supabase } from "./supabase";
import type { Invoice, Plan, Subscription, Payment } from "./types";

export async function listInvoices(orgId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Invoice[];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Invoice | null;
}

export async function createInvoice(
  orgId: string,
  input: {
    subscription_id?: string;
    invoice_number: string;
    billing_cycle: "MONTHLY" | "ANNUAL";
    period_start: string;
    period_end: string;
    line_items: Invoice["line_items"];
    subtotal: number;
    tax_amount?: number;
    discount_amount?: number;
    total_amount: number;
    due_date?: string;
    notes?: string;
  }
): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: orgId,
      ...input,
      tax_amount: input.tax_amount ?? 0,
      discount_amount: input.discount_amount ?? 0,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Invoice;
}

export async function updateInvoice(
  id: string,
  patch: Partial<Invoice>
): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}

export async function listAllInvoices(): Promise<(Invoice & { organization: { name: string } | null })[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, organization:organizations(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as (Invoice & { organization: { name: string } | null })[];
}

export async function getSubscriptionForOrg(orgId: string): Promise<(Subscription & { plan: Plan | null }) | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .maybeSingle();
  if (error) throw error;
  return data as (Subscription & { plan: Plan | null }) | null;
}

export async function createSubscription(
  orgId: string,
  planId: string,
  input: {
    billing_cycle: "MONTHLY" | "ANNUAL";
    status?: string;
    trial_ends_at?: string;
    custom_monthly_price?: number;
    discount_percent?: number;
  }
): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      organization_id: orgId,
      plan_id: planId,
      billing_cycle: input.billing_cycle,
      status: input.status ?? "trial",
      trial_ends_at: input.trial_ends_at ?? null,
      custom_monthly_price: input.custom_monthly_price ?? null,
      discount_percent: input.discount_percent ?? 0,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Subscription;
}

export async function updateSubscription(
  id: string,
  patch: Partial<Subscription>
): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Subscription;
}

export async function cancelSubscription(id: string): Promise<Subscription> {
  return updateSubscription(id, { status: "cancelled" });
}

export async function listPaymentsByOrg(orgId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Payment[];
}

export async function getActivePlanForOrg(orgId: string): Promise<Plan | null> {
  const sub = await getSubscriptionForOrg(orgId);
  if (!sub || !sub.plan) return null;
  return sub.plan;
}

export function calculateInvoiceTotal(
  subtotal: number,
  taxRate = 0,
  discountPercent = 0
): { tax_amount: number; discount_amount: number; total_amount: number } {
  const discount_amount = (subtotal * discountPercent) / 100;
  const afterDiscount = subtotal - discount_amount;
  const tax_amount = (afterDiscount * taxRate) / 100;
  const total_amount = afterDiscount + tax_amount;
  return { tax_amount, discount_amount, total_amount };
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `INV-${year}${month}-${random}`;
}
