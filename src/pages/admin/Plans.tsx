import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth, isRootNovaSuperAdmin } from "../../lib/auth";
import { LoadingSpinner, ErrorState, EmptyState, Badge, PageHeader } from "../../components/ui";
import type { Plan } from "../../lib/types";

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  monthly_price: 0,
  annual_price: 0,
  setup_fee: 0,
  max_businesses: 1,
  max_review_sessions: 100,
  max_team_members: 5,
  ai_usage_allowance: 100,
  trial_duration_days: 14,
  features: "{}",
  is_active: true,
  sort_order: 0,
};

export default function Plans() {
  const { profile } = useAuth();
  const canEdit = isRootNovaSuperAdmin(profile?.role);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setPlans((data ?? []) as Plan[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description ?? "",
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      setup_fee: plan.setup_fee,
      max_businesses: plan.max_businesses,
      max_review_sessions: plan.max_review_sessions,
      max_team_members: plan.max_team_members,
      ai_usage_allowance: plan.ai_usage_allowance,
      trial_duration_days: plan.trial_duration_days,
      features: JSON.stringify(plan.features ?? {}),
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    });
    setShowForm(true);
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      monthly_price: Number(form.monthly_price),
      annual_price: Number(form.annual_price),
      setup_fee: Number(form.setup_fee),
      max_businesses: Number(form.max_businesses),
      max_review_sessions: Number(form.max_review_sessions),
      max_team_members: Number(form.max_team_members),
      ai_usage_allowance: Number(form.ai_usage_allowance),
      trial_duration_days: Number(form.trial_duration_days),
      features: JSON.parse(form.features || "{}"),
      is_active: form.is_active,
      sort_order: Number(form.sort_order),
    };

    const { error: err } = editingId
      ? await supabase.from("plans").update(payload).eq("id", editingId)
      : await supabase.from("plans").insert(payload);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setShowForm(false);
    load();
  }

  if (loading) return <LoadingSpinner size={32} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Plans"
        subtitle="Manage subscription plans"
        action={canEdit && !showForm ? <button className="btn-primary" onClick={startCreate}>New Plan</button> : undefined}
      />

      {showForm && canEdit && (
        <form onSubmit={handleSave} className="card mb-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit Plan" : "Create Plan"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Slug</label><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></div>
            <div className="col-span-2"><label className="mb-1 block text-sm font-medium text-slate-700">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Monthly Price (₹)</label><input type="number" className="input" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })} required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Annual Price (₹)</label><input type="number" className="input" value={form.annual_price} onChange={(e) => setForm({ ...form, annual_price: Number(e.target.value) })} required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Setup Fee (₹)</label><input type="number" className="input" value={form.setup_fee} onChange={(e) => setForm({ ...form, setup_fee: Number(e.target.value) })} required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Max Businesses</label><input type="number" className="input" value={form.max_businesses} onChange={(e) => setForm({ ...form, max_businesses: Number(e.target.value) })} required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Max Review Sessions</label><input type="number" className="input" value={form.max_review_sessions} onChange={(e) => setForm({ ...form, max_review_sessions: Number(e.target.value) })} required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Max Team Members</label><input type="number" className="input" value={form.max_team_members} onChange={(e) => setForm({ ...form, max_team_members: Number(e.target.value) })} required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">AI Usage Allowance</label><input type="number" className="input" value={form.ai_usage_allowance} onChange={(e) => setForm({ ...form, ai_usage_allowance: Number(e.target.value) })} required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Trial Duration (days)</label><input type="number" className="input" value={form.trial_duration_days} onChange={(e) => setForm({ ...form, trial_duration_days: Number(e.target.value) })} required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Sort Order</label><input type="number" className="input" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} required /></div>
            <div className="col-span-2"><label className="mb-1 block text-sm font-medium text-slate-700">Features (JSON)</label><textarea className="input font-mono" rows={3} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active</label>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {plans.length === 0 ? (
        <EmptyState message="No plans found" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="card p-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{p.name}</h3>
                <Badge status={p.is_active ? "active" : "inactive"} />
              </div>
              {p.description && <p className="mb-3 text-sm text-slate-500">{p.description}</p>}
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Monthly</dt><dd className="font-medium">₹{p.monthly_price}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Annual</dt><dd className="font-medium">₹{p.annual_price}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Setup</dt><dd className="font-medium">₹{p.setup_fee}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Max Businesses</dt><dd className="font-medium">{p.max_businesses}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Trial</dt><dd className="font-medium">{p.trial_duration_days} days</dd></div>
              </dl>
              {canEdit && (
                <button className="btn-secondary mt-4 w-full" onClick={() => startEdit(p)}>Edit</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
