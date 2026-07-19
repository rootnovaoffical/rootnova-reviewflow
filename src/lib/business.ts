// Business service: CRUD + slug helpers. Enforces tenant scoping via RLS.

import { supabase } from "./supabase";
import type { Business, BusinessAdmin } from "../types";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Derive the direct Google review-writing URL from a Place ID.
// Place ID is URL-encoded defensively.
export function deriveGoogleReviewUrl(placeId: string | null | undefined): string | null {
  if (!placeId) return null;
  const trimmed = placeId.trim();
  if (!trimmed) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(trimmed)}`;
}

// Resolve the Google review destination using the priority order:
// 1. Auto-generated direct review URL from Google Place ID
// 2. Saved google_review_url (legacy manually-configured URL)
// 3. google_maps_url (final fallback)
export function resolveGoogleReviewUrl(business: {
  google_review_url_derived?: string | null;
  google_review_url?: string | null;
  google_maps_url?: string | null;
}): string | null {
  return (
    business.google_review_url_derived ||
    business.google_review_url ||
    business.google_maps_url ||
    null
  );
}

export async function ensureUniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let slug = base || "business";
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let q = supabase.from("businesses").select("id").eq("slug", slug);
    if (ignoreId) q = q.neq("id", ignoreId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
    suffix++;
    slug = `${base}-${suffix}`;
  }
}

export async function listBusinesses(): Promise<Business[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Business[];
}

export async function getBusiness(id: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Business) || null;
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .eq("public_review_enabled", true)
    .maybeSingle();
  if (error) throw error;
  return (data as Business) || null;
}

export async function getMyBusiness(): Promise<Business | null> {
  // Business admin: get the first business they're linked to.
  const { data: link, error } = await supabase
    .from("business_admins")
    .select("business_id")
    .limit(1)
    .maybeSingle();
  if (error || !link) return null;
  return getBusiness(link.business_id);
}

export type BusinessInput = Omit<Business, "id" | "created_at" | "updated_at">;

export async function createBusiness(input: Partial<BusinessInput>): Promise<Business> {
  const payload = {
    name: input.name || "Untitled Business",
    slug: input.slug || slugify(input.name || "business"),
    logo_url: input.logo_url ?? null,
    primary_color: input.primary_color ?? "#6366f1",
    secondary_color: input.secondary_color ?? "#a855f7",
    welcome_message: input.welcome_message ?? "We'd love to hear about your experience!",
    google_place_id: input.google_place_id ?? null,
    google_maps_url: input.google_maps_url ?? null,
    google_review_url: input.google_review_url ?? null,
    public_review_enabled: input.public_review_enabled ?? true,
    status: input.status ?? "active",
  };
  const { data, error } = await supabase
    .from("businesses")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as Business;
}

export async function updateBusiness(id: string, patch: Partial<BusinessInput>): Promise<Business> {
  const { data, error } = await supabase
    .from("businesses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Business;
}

export async function deleteBusiness(id: string): Promise<void> {
  const { error } = await supabase.from("businesses").delete().eq("id", id);
  if (error) throw error;
}

export async function listBusinessAdmins(businessId: string): Promise<BusinessAdmin[]> {
  const { data, error } = await supabase
    .from("business_admins")
    .select("id,business_id,user_id,created_at,profiles:profiles!business_admins_user_id_fkey(full_name,email)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as BusinessAdmin[];
}

export function publicReviewUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/r/${slug}`;
}
