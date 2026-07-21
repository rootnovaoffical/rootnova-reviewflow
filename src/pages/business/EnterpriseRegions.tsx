import { useEffect, useState } from "react";
import BusinessShell from "./BusinessShell";
import { Card, PageHeader, Badge } from "../../components/Shell";
import { Loading, EmptyState } from "../../components/States";
import {
  fetchRegions,
  createRegion,
  deleteRegion,
  buildRegionTree,
  getUserOrgId,
  type EnterpriseRegion,
  type RegionType,
  regionTypeMeta,
} from "../../lib/enterprise";

export default function EnterpriseRegions() {
  const [regions, setRegions] = useState<EnterpriseRegion[]>([]);
  const [tree, setTree] = useState<EnterpriseRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", region_type: "region" as RegionType, parent_id: "" });

  const orgId = getUserOrgId();

  useEffect(() => {
    (async () => {
      const id = await orgId;
      if (!id) { setLoading(false); return; }
      const data = await fetchRegions(id);
      setRegions(data);
      setTree(buildRegionTree(data));
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = await orgId;
    if (!id) return;
    await createRegion(id, {
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
      region_type: form.region_type,
      parent_id: form.parent_id || null,
    });
    const data = await fetchRegions(id);
    setRegions(data);
    setTree(buildRegionTree(data));
    setForm({ name: "", slug: "", region_type: "region", parent_id: "" });
    setShowForm(false);
  };

  const handleDelete = async (regionId: string) => {
    await deleteRegion(regionId);
    const id = await orgId;
    if (!id) return;
    const data = await fetchRegions(id);
    setRegions(data);
    setTree(buildRegionTree(data));
  };

  if (loading) return <BusinessShell title="Regions"><Loading /></BusinessShell>;

  const renderTree = (nodes: EnterpriseRegion[], depth = 0): React.ReactNode =>
    nodes.map((node) => (
      <div key={node.id} style={{ marginLeft: depth * 24 }}>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-2">
          <span className="text-base">📁</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">{node.name}</p>
            <p className="text-slate-500 text-xs">{regionTypeMeta[node.region_type]?.label ?? node.region_type} · {node.slug}</p>
          </div>
          <Badge color="sky">{node.children?.length ?? 0} sub-regions</Badge>
          <button onClick={() => handleDelete(node.id)} className="text-slate-500 hover:text-rose-400 text-xs">Delete</button>
        </div>
        {node.children && node.children.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    ));

  return (
    <BusinessShell title="Regions">
      <PageHeader
        title="Regions & Territories"
        subtitle="Manage hierarchical geographic organization"
        actions={
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">
            {showForm ? "Cancel" : "+ Add Region"}
          </button>
        }
      />

      <div className="px-4 md:px-8 pb-8 space-y-6">
        {showForm && (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Slug</label>
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Type</label>
                  <select value={form.region_type} onChange={(e) => setForm({ ...form, region_type: e.target.value as RegionType })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none">
                    {Object.entries(regionTypeMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Parent Region</label>
                  <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none">
                    <option value="">None (Top Level)</option>
                    {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">Create Region</button>
            </form>
          </Card>
        )}

        {tree.length === 0 ? (
          <EmptyState title="No Regions" message="No regions yet. Create your first region to start organizing your locations." />
        ) : (
          <Card>
            <h3 className="text-white font-semibold mb-4">Organization Hierarchy</h3>
            <div className="space-y-1">{renderTree(tree)}</div>
          </Card>
        )}
      </div>
    </BusinessShell>
  );
}
