import { supabase } from "./supabase";
import { cacheBustUrl } from "./utils";

async function uploadToBucket(bucket: string, path: string, file: File): Promise<string | null> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error(`Upload to ${bucket} failed:`, error.message); return null; }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return cacheBustUrl(data.publicUrl);
}

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "png";
  return uploadToBucket("avatars", `${userId}/avatar-${Date.now()}.${ext}`, file);
}

export async function uploadBusinessLogo(businessId: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "png";
  return uploadToBucket("business-logos", `${businessId}/logo-${Date.now()}.${ext}`, file);
}

export async function uploadOrgLogo(orgId: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "png";
  return uploadToBucket("platform-assets", `organizations/${orgId}/logo-${Date.now()}.${ext}`, file);
}

export async function uploadPlatformAsset(key: string, file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "png";
  return uploadToBucket("platform-assets", `branding/${key}-${Date.now()}.${ext}`, file);
}

export async function uploadPaymentProof(orgId: string, paymentId: string, file: File): Promise<{ path: string | null; signedUrl: string | null }> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${orgId}/${paymentId}/proof-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error("Payment proof upload failed:", error.message); return { path: null, signedUrl: null }; }
  const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 3600);
  return { path, signedUrl: data?.signedUrl ?? null };
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function upsertPlatformAsset(key: string, label: string, assetType: string, publicUrl: string | null, storagePath: string | null, metadata?: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("platform_assets").upsert({
    key, label, asset_type: assetType, public_url: publicUrl, storage_path: storagePath, metadata: metadata ?? {}, is_active: true,
  }, { onConflict: "key" });
  if (error) console.error("Upsert platform asset failed:", error.message);
}
