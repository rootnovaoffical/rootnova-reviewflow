import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { formatCurrency } from "../../lib/utils";
import type { Plan } from "../../lib/types";

export function SuperAdminPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("plans").select("*").order("sort_order", { ascending: true });
    if (error) setError(error.message); else setPlans((data as Plan[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: "", slug: "", monthly_price: 0, annual_price: 0, setup_fee: 0, max_businesses: 1, max_review_sessions: 100, max_team_members: 3, ai_usage_allowance: 100, trial_duration_days: 14, is_active: true, sort_order: plans.length, features: {} }); setEditorOpen(true); };
  const openEdit = (p: Plan) => { setEditing(p); setForm(p); setEditorOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, slug: form.slug || (form.name || "").toLowerCase().replace(/\s+/g, "-") };
    if (editing) {
      const { error } = await supabase.from("plans").update(payload).eq("id", editing.id);
      if (error) toast(error.message, "error"); else toast("Plan updated", "success");
    } else {
      const { error } = await supabase.from("plans").insert(payload);
      if (error) toast(error.message, "error"); else toast("Plan created", "success");
    }
    setSaving(false); setEditorOpen(false); load();
  };

  if (loading) return <Loading message="Loading plans…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="font-display text-2xl font-bold text-ink-50">Plans</h1><p className="mt-1 text-sm text-ink-400">Manage subscription plans</p></div><button className="btn-primary" onClick={openNew}>New Plan</button></div>
      {plans.length === 0 ? <EmptyState title="No plans" message="Create your first subscription plan." action={<button className="btn-primary" onClick={openNew}>New Plan</button>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="card space-y-3">
              <div className="flex items-start justify-between"><div><h3 className="font-display text-base font-semibold text-ink-50">{p.name}</h3><p className="text-xs text-ink-400">/{p.slug}</p></div><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-ink-700 text-ink-400"}`}>{p.is_active ? "Active" : "Inactive"}</span></div>
              <div className="space-y-1 text-sm text-ink-300"><p>Monthly: {formatCurrency(p.monthly_price)}</p><p>Setup: {formatCurrency(p.setup_fee)}</p><p>Max businesses: {p.max_businesses}</p></div>
              <button className="btn-secondary w-full" onClick={() => openEdit(p)}>Edit</button>
            </div>
          ))}
        </div>
      )}
      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={editing ? "Edit Plan" : "New Plan"} size="lg">
        <div className="space-y-4">
          <div><label className="label">Name</label><input className="input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Monthly Price</label><input type="number" className="input" value={form.monthly_price ?? 0} onChange={(e) => setForm({ ...form, monthly_price: parseFloat(e.target.value) })} /></div>
            <div><label className="label">Annual Price</label><input type="number" className="input" value={form.annual_price ?? 0} onChange={(e) => setForm({ ...form, annual_price: parseFloat(e.target.value) })} /></div>
            <div><label className="label">Setup Fee</label><input type="number" className="input" value={form.setup_fee ?? 0} onChange={(e) => setForm({ ...form, setup_fee: parseFloat(e.target.value) })} /></div>
            <div><label className="label">Max Businesses</label><input type="number" className="input" value={form.max_businesses ?? 1} onChange={(e) => setForm({ ...form, max_businesses: parseInt(e.target.value) })} /></div>
            <div><label className="label">Max Review Sessions</label><input type="number" className="input" value={form.max_review_sessions ?? 100} onChange={(e) => setForm({ ...form, max_review_sessions: parseInt(e.target.value) })} /></div>
            <div><label className="label">Max Team Members</label><input type="number" className="input" value={form.max_team_members ?? 3} onChange={(e) => setForm({ ...form, max_team_members: parseInt(e.target.value) })} /></div>
            <div><label className="label">AI Usage Allowance</label><input type="number" className="input" value={form.ai_usage_allowance ?? 100} onChange={(e) => setForm({ ...form, ai_usage_allowance: parseInt(e.target.value) })} /></div>
            <div><label className="label">Trial Days</label><input type="number" className="input" value={form.trial_duration_days ?? 14} onChange={(e) => setForm({ ...form, trial_duration_days: parseInt(e.target.value) })} /></div>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> <span className="text-sm text-ink-200">Active</span></label>
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setEditorOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Plan"}</button></div>
        </div>
      </Modal>
    </div>
  );
}
