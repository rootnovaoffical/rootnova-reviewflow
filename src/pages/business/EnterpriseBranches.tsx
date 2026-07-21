import { useEffect, useState } from "react";
import BusinessShell from "./BusinessShell";
import { Card, PageHeader, Badge } from "../../components/Shell";
import { Loading, EmptyState } from "../../components/States";
import {
  fetchBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  fetchRegions,
  getUserOrgId,
  branchStatusMeta,
  type EnterpriseBranch,
  type EnterpriseRegion,
  type BranchType,
  type BranchStatus,
} from "../../lib/enterprise";

export default function EnterpriseBranches() {
  const [branches, setBranches] = useState<EnterpriseBranch[]>([]);
  const [regions, setRegions] = useState<EnterpriseRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EnterpriseBranch | null>(null);
  const [form, setForm] = useState({
    name: "", slug: "", branch_type: "store" as BranchType, region_id: "", branch_code: "",
    address: "", city: "", state: "", country: "", timezone: "UTC", currency: "USD", language: "en",
    phone: "", email: "", status: "active" as BranchStatus,
  });

  const orgIdPromise = getUserOrgId();

  useEffect(() => {
    (async () => {
      const orgId = await orgIdPromise;
      if (!orgId) { setLoading(false); return; }
      const [b, r] = await Promise.all([fetchBranches(orgId), fetchRegions(orgId)]);
      setBranches(b);
      setRegions(r);
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = await orgIdPromise;
    if (!orgId) return;
    if (editing) {
      await updateBranch(editing.id, {
        name: form.name,
        branch_type: form.branch_type,
        region_id: form.region_id || null,
        branch_code: form.branch_code || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        timezone: form.timezone,
        currency: form.currency,
        language: form.language,
        phone: form.phone || null,
        email: form.email || null,
        status: form.status,
      });
    } else {
      await createBranch(orgId, {
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
        branch_type: form.branch_type,
        region_id: form.region_id || null,
        branch_code: form.branch_code || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        country: form.country || null,
        timezone: form.timezone,
        currency: form.currency,
        language: form.language,
        phone: form.phone || null,
        email: form.email || null,
      });
    }
    const data = await fetchBranches(orgId);
    setBranches(data);
    setForm({ name: "", slug: "", branch_type: "store", region_id: "", branch_code: "", address: "", city: "", state: "", country: "", timezone: "UTC", currency: "USD", language: "en", phone: "", email: "", status: "active" });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (branch: EnterpriseBranch) => {
    setEditing(branch);
    setForm({
      name: branch.name, slug: branch.slug, branch_type: branch.branch_type, region_id: branch.region_id ?? "",
      branch_code: branch.branch_code ?? "", address: branch.address ?? "", city: branch.city ?? "",
      state: branch.state ?? "", country: branch.country ?? "", timezone: branch.timezone,
      currency: branch.currency, language: branch.language, phone: branch.phone ?? "",
      email: branch.email ?? "", status: branch.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (branchId: string) => {
    const orgId = await orgIdPromise;
    if (!orgId) return;
    await deleteBranch(branchId);
    const data = await fetchBranches(orgId);
    setBranches(data);
  };

  if (loading) return <BusinessShell title="Branches"><Loading /></BusinessShell>;

  return (
    <BusinessShell title="Branches">
      <PageHeader
        title="Branches & Locations"
        subtitle="Manage all locations across your enterprise"
        actions={
          <button onClick={() => { setEditing(null); setShowForm(!showForm); }} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">
            {showForm ? "Cancel" : "+ Add Branch"}
          </button>
        }
      />

      <div className="px-4 md:px-8 pb-8 space-y-6">
        {showForm && (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-white font-semibold">{editing ? "Edit Branch" : "New Branch"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                {!editing && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Slug</label>
                    <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                  </div>
                )}
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Code</label>
                  <input value={form.branch_code} onChange={(e) => setForm({ ...form, branch_code: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Type</label>
                  <select value={form.branch_type} onChange={(e) => setForm({ ...form, branch_type: e.target.value as BranchType })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none">
                    <option value="head_office">Head Office</option>
                    <option value="store">Store</option>
                    <option value="franchise">Franchise</option>
                    <option value="kiosk">Kiosk</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="pop_up">Pop-up</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Region</label>
                  <select value={form.region_id} onChange={(e) => setForm({ ...form, region_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none">
                    <option value="">Unassigned</option>
                    {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                {editing && (
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BranchStatus })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="suspended">Suspended</option>
                      <option value="onboarding">Onboarding</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Address</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">City</label>
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">State</label>
                  <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Country</label>
                  <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">{editing ? "Update Branch" : "Create Branch"}</button>
            </form>
          </Card>
        )}

        {branches.length === 0 ? (
          <EmptyState title="No Branches" message="No branches yet. Add your first location to get started." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => {
              const statusMeta = branchStatusMeta[branch.status] ?? { label: branch.status, color: "slate" };
              return (
                <Card key={branch.id}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-white font-semibold text-sm">{branch.name}</p>
                      <p className="text-slate-500 text-xs">{branch.branch_code || "No code"} · {branch.branch_type}</p>
                    </div>
                    <Badge color={statusMeta.color as "slate" | "emerald" | "amber" | "rose" | "sky"}>{statusMeta.label}</Badge>
                  </div>
                  <div className="space-y-1 text-xs text-slate-400">
                    {branch.region && <p>📍 {branch.region.name}</p>}
                    {branch.business && <p>🏪 {branch.business.name}</p>}
                    {branch.city && <p>🏙️ {branch.city}{branch.country ? `, ${branch.country}` : ""}</p>}
                    <p>🕐 {branch.timezone} · 💰 {branch.currency}</p>
                    {branch.health_score > 0 && <p>❤️ Health: {branch.health_score.toFixed(0)}/100</p>}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                    <button onClick={() => handleEdit(branch)} className="text-xs text-primary-400 hover:text-primary-300">Edit</button>
                    <button onClick={() => handleDelete(branch.id)} className="text-xs text-slate-500 hover:text-rose-400">Delete</button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </BusinessShell>
  );
}
