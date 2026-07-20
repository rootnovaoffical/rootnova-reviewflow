import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { LoadingSpinner, ErrorState, Badge } from "../../components/ui";
import type { Business, Organization } from "../../lib/types";

interface BusinessWithOrg extends Business {
  organizations: Pick<Organization, "name"> | null;
}

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessWithOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [form, setForm] = useState({
    name: "",
    welcome_message: "",
    primary_color: "",
    secondary_color: "",
    google_review_url: "",
    status: "",
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("businesses")
      .select("*, organizations(name)")
      .eq("id", id)
      .maybeSingle();

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Business not found");
      setLoading(false);
      return;
    }

    const b = data as BusinessWithOrg;
    setBusiness(b);
    setForm({
      name: b.name,
      welcome_message: b.welcome_message,
      primary_color: b.primary_color,
      secondary_color: b.secondary_color,
      google_review_url: b.google_review_url ?? "",
      status: b.status,
    });

    const [q, s] = await Promise.all([
      supabase.from("questions").select("*", { count: "exact", head: true }).eq("business_id", id),
      supabase.from("review_sessions").select("*", { count: "exact", head: true }).eq("business_id", id),
    ]);

    setQuestionCount(q.count ?? 0);
    setSessionCount(s.count ?? 0);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);

    const { error: err } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        welcome_message: form.welcome_message,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        google_review_url: form.google_review_url || null,
        status: form.status,
      })
      .eq("id", id);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate("/businesses");
  }

  if (loading) return <LoadingSpinner size={32} />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!business) return <ErrorState message="Business not found" />;

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link to="/businesses" className="text-sm text-primary-600 hover:underline">← Back to Businesses</Link>
      </div>

      <div className="card mb-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">{business.name}</h1>
          <Badge status={business.status} />
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Slug</dt>
            <dd className="font-medium text-slate-900">{business.slug}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Organization</dt>
            <dd className="font-medium text-slate-900">{business.organizations?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Questions</dt>
            <dd className="font-medium text-slate-900">{questionCount}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Review Sessions</dt>
            <dd className="font-medium text-slate-900">{sessionCount}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleSave} className="card space-y-4 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Edit Business</h2>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Welcome Message</label>
          <textarea className="input" rows={3} value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Primary Color</label>
            <input type="color" className="input h-10" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Secondary Color</label>
            <input type="color" className="input h-10" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Google Review URL</label>
          <input className="input" value={form.google_review_url} onChange={(e) => setForm({ ...form, google_review_url: e.target.value })} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/businesses")}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
