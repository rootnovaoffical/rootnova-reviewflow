import { useEffect, useState } from "react";
import BusinessShell from "./BusinessShell";
import { Card, PageHeader, Badge } from "../../components/Shell";
import { Loading, EmptyState } from "../../components/States";
import {
  fetchPolicies,
  createPolicy,
  deletePolicy,
  getUserOrgId,
  policyTypeMeta,
  type OrganizationPolicy,
  type PolicyType,
} from "../../lib/enterprise";

export default function EnterprisePolicies() {
  const [policies, setPolicies] = useState<OrganizationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ policy_key: "", policy_type: "operational" as PolicyType, name: "", description: "", rules: "" });

  const orgIdPromise = getUserOrgId();

  useEffect(() => {
    (async () => {
      const orgId = await orgIdPromise;
      if (!orgId) { setLoading(false); return; }
      const data = await fetchPolicies(orgId);
      setPolicies(data);
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = await orgIdPromise;
    if (!orgId) return;
    let rules = {};
    try { rules = form.rules ? JSON.parse(form.rules) : {}; } catch { /* invalid json, use empty */ }
    await createPolicy(orgId, {
      policy_key: form.policy_key,
      policy_type: form.policy_type,
      name: form.name,
      description: form.description || null,
      rules,
    });
    const data = await fetchPolicies(orgId);
    setPolicies(data);
    setForm({ policy_key: "", policy_type: "operational", name: "", description: "", rules: "" });
    setShowForm(false);
  };

  const handleDelete = async (policyId: string) => {
    const orgId = await orgIdPromise;
    if (!orgId) return;
    await deletePolicy(policyId);
    const data = await fetchPolicies(orgId);
    setPolicies(data);
  };

  if (loading) return <BusinessShell title="Policies"><Loading /></BusinessShell>;

  return (
    <BusinessShell title="Policies">
      <PageHeader
        title="Organization Policies"
        subtitle="Centralized governance and compliance rules"
        actions={
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">
            {showForm ? "Cancel" : "+ Add Policy"}
          </button>
        }
      />

      <div className="px-4 md:px-8 pb-8 space-y-6">
        {showForm && (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Policy Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Policy Key</label>
                  <input value={form.policy_key} onChange={(e) => setForm({ ...form, policy_key: e.target.value })} required placeholder="e.g. brand_logo_policy" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Type</label>
                  <select value={form.policy_type} onChange={(e) => setForm({ ...form, policy_type: e.target.value as PolicyType })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none">
                    {Object.entries(policyTypeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Description</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Rules (JSON)</label>
                <textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder='{"key": "value"}' rows={4} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none font-mono" />
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">Create Policy</button>
            </form>
          </Card>
        )}

        {policies.length === 0 ? (
          <EmptyState title="No Policies" message="No policies yet. Create your first policy to establish governance across your enterprise." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((policy) => (
              <Card key={policy.id}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-white font-semibold text-sm">{policy.name}</p>
                    <p className="text-slate-500 text-xs font-mono">{policy.policy_key}</p>
                  </div>
                  <Badge color="sky">{policyTypeMeta[policy.policy_type]?.label ?? policy.policy_type}</Badge>
                </div>
                {policy.description && <p className="text-slate-400 text-xs mt-2">{policy.description}</p>}
                {policy.region_id && <p className="text-slate-500 text-xs mt-1">📍 Region-scoped</p>}
                {policy.branch_id && <p className="text-slate-500 text-xs mt-1">🏪 Branch-scoped</p>}
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                  <Badge color={policy.is_inherited ? "emerald" : "slate"}>{policy.is_inherited ? "Inherited" : "Custom"}</Badge>
                  <Badge color={policy.is_overridable ? "amber" : "slate"}>{policy.is_overridable ? "Overridable" : "Locked"}</Badge>
                  <button onClick={() => handleDelete(policy.id)} className="text-xs text-slate-500 hover:text-rose-400 ml-auto">Delete</button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BusinessShell>
  );
}
