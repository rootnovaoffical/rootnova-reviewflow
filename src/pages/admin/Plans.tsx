import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { Plan } from "../../lib/types";
import { Loading, EmptyState, ErrorState } from "../../components/States";
import { formatCurrency } from "../../lib/utils";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { insertAuditLog } from "../../lib/auth";

export default function AdminPlans() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => supabase.from("plans").select("*").order("sort_order").then(({ data, error: err }) => {
    if (err) setError(err.message);
    setPlans(data as Plan[] || []);
  });
  useEffect(() => { load(); }, []);

  const save = async (plan: Partial<Plan> & { id?: string }) => {
    const { id, ...rest } = plan;
    if (id) {
      const { error } = await supabase.from("plans").update(rest).eq("id", id).select().single();
      if (error) { showToast("Failed to update plan", "error"); return; }
      if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "plan_updated", target_type: "plan", target_id: id });
      showToast("Plan updated", "success");
    } else {
      const { error } = await supabase.from("plans").insert(rest).select().single();
      if (error) { showToast("Failed to create plan", "error"); return; }
      if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "plan_created", target_type: "plan" });
      showToast("Plan created", "success");
    }
    setEditing(null); setCreating(false); load();
  };

  if (!plans) return <Layout title="Plans"><Loading /></Layout>;
  if (error) return <Layout title="Plans"><ErrorState message={error} onRetry={load} /></Layout>;

  return (
    <Layout title="Plans">
      <div className="flex justify-end mb-4">
        <button onClick={() => setCreating(true)} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">New Plan</button>
      </div>
      {plans.length === 0 ? <EmptyState title="No plans" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white">{p.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{p.description || "No description"}</p>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Monthly</dt><dd className="text-white">{formatCurrency(p.monthly_price)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Annual</dt><dd className="text-white">{formatCurrency(p.annual_price)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Setup Fee</dt><dd className="text-white">{formatCurrency(p.setup_fee)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Max Businesses</dt><dd className="text-white">{p.max_businesses}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Max Team</dt><dd className="text-white">{p.max_team_members}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Active</dt><dd className="text-white">{p.is_active ? "Yes" : "No"}</dd></div>
              </dl>
              <button onClick={() => setEditing(p)} className="mt-4 w-full py-2 glass text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors">Edit</button>
            </div>
          ))}
        </div>
      )}
      {(editing || creating) && <PlanModal plan={editing} onClose={() => { setEditing(null); setCreating(false); }} onSave={save} />}
    </Layout>
  );
}

function PlanModal({ plan, onClose, onSave }: { plan: Plan | null; onClose: () => void; onSave: (p: Partial<Plan> & { id?: string }) => void }) {
  const [form, setForm] = useState({
    name: plan?.name || "", slug: plan?.slug || "", description: plan?.description || "",
    monthly_price: plan?.monthly_price ?? 0, annual_price: plan?.annual_price ?? 0, setup_fee: plan?.setup_fee ?? 0,
    max_businesses: plan?.max_businesses ?? 1, max_review_sessions: plan?.max_review_sessions ?? 100,
    max_team_members: plan?.max_team_members ?? 3, ai_usage_allowance: plan?.ai_usage_allowance ?? 100,
    trial_duration_days: plan?.trial_duration_days ?? 0, is_active: plan?.is_active ?? true, sort_order: plan?.sort_order ?? 0,
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">{plan ? "Edit Plan" : "New Plan"}</h2>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(form).map(([key, val]) => (
            <div key={key}>
              <label className="block text-xs text-slate-400 mb-1">{key.replace(/_/g, " ")}</label>
              <input
                type={typeof val === "number" ? "number" : typeof val === "boolean" ? "checkbox" : "text"}
                checked={typeof val === "boolean" ? val : undefined}
                value={typeof val === "boolean" ? undefined : val}
                onChange={(e) => setForm((f) => ({ ...f, [key]: typeof val === "boolean" ? e.target.checked : typeof val === "number" ? Number(e.target.value) : e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSave({ ...form, id: plan?.id })} className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
          <button onClick={onClose} className="flex-1 py-2 glass text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
