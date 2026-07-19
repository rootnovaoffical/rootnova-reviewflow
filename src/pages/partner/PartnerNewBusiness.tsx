import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading, ErrorState } from "../../components/States";
import { useToast } from "../../components/Toast";
import { slugify } from "../../lib/utils";

export function PartnerNewBusiness() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", welcome_message: "", google_place_id: "", google_review_url: "", primary_color: "#6366f1", secondary_color: "#a855f7" });

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).maybeSingle();
      setOrgId((member as any)?.organization_id || null);
      setLoading(false);
    })();
  }, [profile?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast("Name is required", "error"); return; }
    if (!orgId) { toast("No organization found", "error"); return; }
    setSaving(true);
    const slug = form.slug || slugify(form.name);
    const { data, error } = await supabase.from("businesses").insert({ name: form.name, slug, welcome_message: form.welcome_message || null, google_place_id: form.google_place_id || null, google_review_url: form.google_review_url || null, primary_color: form.primary_color, secondary_color: form.secondary_color, organization_id: orgId, status: "active", public_review_enabled: true }).select().single();
    if (error) { toast(error.message, "error"); setSaving(false); return; }
    toast("Business created", "success");
    navigate(`/partner/businesses/${data.id}`);
  };

  if (loading) return <Loading message="Loading…" />;
  if (!orgId) return <ErrorState message="No organization found for your account." />;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">New Business</h1><p className="mt-1 text-sm text-ink-400">Create a new business for your organization</p></div>
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div><label className="label">Slug</label><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
        <div><label className="label">Welcome Message</label><textarea className="input" rows={2} value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} placeholder="We'd love to hear about your experience!" /></div>
        <div><label className="label">Google Place ID</label><input className="input" value={form.google_place_id} onChange={(e) => setForm({ ...form, google_place_id: e.target.value })} /></div>
        <div><label className="label">Google Review URL (manual override)</label><input className="input" value={form.google_review_url} onChange={(e) => setForm({ ...form, google_review_url: e.target.value })} placeholder="https://g.page/r/…" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Primary Color</label><input type="color" className="h-10 w-full rounded-lg" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} /></div>
          <div><label className="label">Secondary Color</label><input type="color" className="h-10 w-full rounded-lg" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} /></div>
        </div>
        <div className="flex gap-3"><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Creating…" : "Create Business"}</button><button type="button" className="btn-secondary" onClick={() => navigate("/partner/businesses")}>Cancel</button></div>
      </form>
    </div>
  );
}
