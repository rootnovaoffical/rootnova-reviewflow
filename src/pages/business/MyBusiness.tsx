import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { LoadingSpinner, ErrorState, PageHeader } from "../../components/ui";
import type { Business } from "../../lib/types";

export default function MyBusiness() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    welcome_message: "",
    primary_color: "#4f46e5",
    secondary_color: "#818cf8",
    google_place_id: "",
    google_maps_url: "",
    google_review_url: "",
    public_review_enabled: true,
    status: "active",
    logo_url: "",
  });

  useEffect(() => {
    if (!profile) return;
    loadBusiness();
  }, [profile]);

  async function loadBusiness() {
    if (!profile) return;
    setLoading(true);
    setError(null);

    const { data: baData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();

    const businessId = baData?.business_id;
    if (!businessId) {
      setError("No business assigned to your account.");
      setLoading(false);
      return;
    }

    const { data: biz, error: bizError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .maybeSingle();

    if (bizError) {
      setError(bizError.message);
      setLoading(false);
      return;
    }

    setBusiness(biz as Business);
    setForm({
      name: biz.name ?? "",
      welcome_message: biz.welcome_message ?? "",
      primary_color: biz.primary_color ?? "#4f46e5",
      secondary_color: biz.secondary_color ?? "#818cf8",
      google_place_id: biz.google_place_id ?? "",
      google_maps_url: biz.google_maps_url ?? "",
      google_review_url: biz.google_review_url ?? "",
      public_review_enabled: biz.public_review_enabled ?? true,
      status: biz.status ?? "active",
      logo_url: biz.logo_url ?? "",
    });
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!business) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        welcome_message: form.welcome_message,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        google_place_id: form.google_place_id || null,
        google_maps_url: form.google_maps_url || null,
        google_review_url: form.google_review_url || null,
        public_review_enabled: form.public_review_enabled,
        status: form.status,
        logo_url: form.logo_url || null,
      })
      .eq("id", business.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  async function handleLogoUpload(file: File) {
    if (!business) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `business-logos/${business.id}.${ext}`;

    const { error: upError } = await supabase.storage
      .from("business-assets")
      .upload(path, file, { upsert: true });

    if (upError) {
      setError(upError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("business-assets")
      .getPublicUrl(path);

    setForm((f) => ({ ...f, logo_url: urlData.publicUrl }));
    setUploading(false);
  }

  if (loading) return <LoadingSpinner size={40} />;
  if (error) return <ErrorState message={error} onRetry={loadBusiness} />;

  const reviewLink = business ? `${window.location.origin}/review/${business.slug}` : "";

  return (
    <div>
      <PageHeader title="My Business" subtitle="Edit your business details and branding" />

      {business && (
        <div className="card mb-6 p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500">Public Review Link</p>
              <a
                href={reviewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-sm text-primary-600 hover:underline"
              >
                {reviewLink}
              </a>
            </div>
            <button
              className="btn-secondary"
              onClick={() => navigator.clipboard.writeText(reviewLink)}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="card space-y-6 p-6">
        <div className="flex items-center gap-4">
          {form.logo_url ? (
            <img src={form.logo_url} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
              No logo
            </div>
          )}
          <div>
            <label className="btn-secondary cursor-pointer">
              {uploading ? "Uploading..." : "Upload Logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Business Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Welcome Message</label>
          <textarea
            className="input min-h-[80px]"
            value={form.welcome_message}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-16 cursor-pointer rounded border border-slate-300"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
              />
              <input
                className="input"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-16 cursor-pointer rounded border border-slate-300"
                value={form.secondary_color}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
              />
              <input
                className="input"
                value={form.secondary_color}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Google Place ID</label>
          <input
            className="input"
            value={form.google_place_id}
            onChange={(e) => setForm({ ...form, google_place_id: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Google Maps URL</label>
          <input
            className="input"
            value={form.google_maps_url}
            onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Google Review URL</label>
          <input
            className="input"
            value={form.google_review_url}
            onChange={(e) => setForm({ ...form, google_review_url: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={form.public_review_enabled}
                onChange={(e) => setForm({ ...form, public_review_enabled: e.target.checked })}
              />
              <span className="text-sm font-medium text-slate-700">Public Review Enabled</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-600">
            Business details saved successfully.
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
