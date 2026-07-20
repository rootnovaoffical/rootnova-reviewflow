import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import {
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Badge,
  PageHeader,
} from "../../components/ui";
import type { Business, ReviewSession } from "../../lib/types";

interface EditForm {
  name: string;
  welcome_message: string;
  primary_color: string;
  secondary_color: string;
  google_review_url: string;
  public_review_enabled: boolean;
}

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviewSessions, setReviewSessions] = useState<ReviewSession[]>([]);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !profile) return;
    setLoading(true);
    setError(null);

    const { data: memberData } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    const orgId = memberData?.organization_id;

    const [bizRes, reviewsRes, questionsRes] = await Promise.all([
      supabase.from("businesses").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("review_sessions")
        .select("*")
        .eq("business_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id),
    ]);

    if (bizRes.error) {
      setError(bizRes.error.message);
      setLoading(false);
      return;
    }
    const biz = bizRes.data as Business | null;
    if (biz && orgId && biz.organization_id !== orgId) {
      setError("You do not have access to this business.");
      setLoading(false);
      return;
    }
    setBusiness(biz);
    setReviewSessions((reviewsRes.data ?? []) as ReviewSession[]);
    setQuestionsCount(questionsRes.count ?? 0);
    setLoading(false);
  }, [id, profile]);

  useEffect(() => {
    load();
  }, [load]);

  function startEditing() {
    if (!business) return;
    setForm({
      name: business.name,
      welcome_message: business.welcome_message,
      primary_color: business.primary_color,
      secondary_color: business.secondary_color,
      google_review_url: business.google_review_url ?? "",
      public_review_enabled: business.public_review_enabled,
    });
    setEditing(true);
    setSaveError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !form) return;
    setSaving(true);
    setSaveError(null);
    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        welcome_message: form.welcome_message,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        google_review_url: form.google_review_url || null,
        public_review_enabled: form.public_review_enabled,
      })
      .eq("id", id);
    setSaving(false);
    if (updateError) {
      setSaveError(updateError.message);
      return;
    }
    setEditing(false);
    load();
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!business) return <EmptyState message="Business not found." />;

  return (
    <div>
      <PageHeader
        title={business.name}
        subtitle={business.slug}
        action={
          !editing ? (
            <button className="btn-secondary" onClick={startEditing}>Edit</button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <Link to="/businesses" className="text-sm text-primary-600 hover:text-primary-700">← Back to Businesses</Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2">
          {editing && form ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Welcome Message</label>
                <textarea className="input" rows={2} value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Primary Color</label>
                  <input type="color" className="input h-10 p-1" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
                </div>
                <div>
                  <label className="label">Secondary Color</label>
                  <input type="color" className="input h-10 p-1" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Google Review URL</label>
                <input className="input" value={form.google_review_url} onChange={(e) => setForm({ ...form, google_review_url: e.target.value })} />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.public_review_enabled} onChange={(e) => setForm({ ...form, public_review_enabled: e.target.checked })} />
                <span className="text-sm text-slate-700">Public review enabled</span>
              </label>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <dl className="space-y-3">
              <div><dt className="text-sm font-medium text-slate-500">Status</dt><dd><Badge status={business.status} /></dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Welcome Message</dt><dd className="text-slate-800">{business.welcome_message || "—"}</dd></div>
              <div className="flex gap-8">
                <div><dt className="text-sm font-medium text-slate-500">Primary Color</dt><dd className="flex items-center gap-2"><span className="inline-block h-5 w-5 rounded" style={{ backgroundColor: business.primary_color }} /><span className="text-slate-800">{business.primary_color}</span></dd></div>
                <div><dt className="text-sm font-medium text-slate-500">Secondary Color</dt><dd className="flex items-center gap-2"><span className="inline-block h-5 w-5 rounded" style={{ backgroundColor: business.secondary_color }} /><span className="text-slate-800">{business.secondary_color}</span></dd></div>
              </div>
              <div><dt className="text-sm font-medium text-slate-500">Google Review URL</dt><dd className="text-slate-800">{business.google_review_url || "—"}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Public Review Enabled</dt><dd className="text-slate-800">{business.public_review_enabled ? "Yes" : "No"}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Created</dt><dd className="text-slate-800">{new Date(business.created_at).toLocaleDateString()}</dd></div>
            </dl>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-slate-500">Questions</span><span className="font-semibold text-slate-900">{questionsCount}</span></div>
            <div className="flex justify-between"><span className="text-sm text-slate-500">Review Sessions</span><span className="font-semibold text-slate-900">{reviewSessions.length}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Review Sessions</h2>
        {reviewSessions.length === 0 ? (
          <EmptyState message="No review sessions yet." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {reviewSessions.slice(0, 20).map((rs) => (
              <li key={rs.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Rating: {rs.rating}★</p>
                    <p className="text-xs text-slate-500">{new Date(rs.created_at).toLocaleString()}</p>
                  </div>
                  <Badge status={rs.ai_status} />
                </div>
                {rs.ai_generated_review && <p className="mt-1 text-sm text-slate-600 line-clamp-2">{rs.ai_generated_review}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
