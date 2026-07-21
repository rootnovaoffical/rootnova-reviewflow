import { useEffect, useState } from "react";
import BusinessShell from "./BusinessShell";
import { Card, PageHeader, Badge } from "../../components/Shell";
import { Loading, EmptyState } from "../../components/States";
import {
  fetchEnterpriseRoles,
  assignEnterpriseRole,
  getUserOrgId,
  enterpriseRoleMeta,
  type EnterpriseRoleAssignment,
  type EnterpriseRole,
} from "../../lib/enterprise";

export default function EnterpriseRoles() {
  const [roles, setRoles] = useState<EnterpriseRoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_id: "", enterprise_role: "EMPLOYEE" as EnterpriseRole, scope_type: "organization" as "organization" | "region" | "branch", scope_id: "" });

  const orgIdPromise = getUserOrgId();

  useEffect(() => {
    (async () => {
      const orgId = await orgIdPromise;
      if (!orgId) { setLoading(false); return; }
      const data = await fetchEnterpriseRoles(orgId);
      setRoles(data);
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = await orgIdPromise;
    if (!orgId) return;
    await assignEnterpriseRole(orgId, {
      user_id: form.user_id,
      enterprise_role: form.enterprise_role,
      scope_type: form.scope_type,
      scope_id: form.scope_id || null,
    });
    const data = await fetchEnterpriseRoles(orgId);
    setRoles(data);
    setForm({ user_id: "", enterprise_role: "EMPLOYEE", scope_type: "organization", scope_id: "" });
    setShowForm(false);
  };

  if (loading) return <BusinessShell title="Enterprise Roles"><Loading /></BusinessShell>;

  return (
    <BusinessShell title="Enterprise Roles">
      <PageHeader
        title="Enterprise RBAC"
        subtitle="Manage roles and permissions across your organization"
        actions={
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">
            {showForm ? "Cancel" : "+ Assign Role"}
          </button>
        }
      />

      <div className="px-4 md:px-8 pb-8 space-y-6">
        {showForm && (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">User ID</label>
                  <input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required placeholder="UUID" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Role</label>
                  <select value={form.enterprise_role} onChange={(e) => setForm({ ...form, enterprise_role: e.target.value as EnterpriseRole })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none">
                    {Object.entries(enterpriseRoleMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Scope</label>
                  <select value={form.scope_type} onChange={(e) => setForm({ ...form, scope_type: e.target.value as "organization" | "region" | "branch" })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none">
                    <option value="organization">Organization</option>
                    <option value="region">Region</option>
                    <option value="branch">Branch</option>
                  </select>
                </div>
              </div>
              {form.scope_type !== "organization" && (
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Scope ID</label>
                  <input value={form.scope_id} onChange={(e) => setForm({ ...form, scope_id: e.target.value })} required placeholder="Region or Branch UUID" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none font-mono" />
                </div>
              )}
              <button type="submit" className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">Assign Role</button>
            </form>
          </Card>
        )}

        {roles.length === 0 ? (
          <EmptyState title="No Roles" message="No enterprise roles assigned yet." />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase border-b border-white/5">
                    <th className="text-left py-2 px-3">User</th>
                    <th className="text-left py-2 px-3">Role</th>
                    <th className="text-left py-2 px-3">Scope</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-right py-2 px-3">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => {
                    const meta = enterpriseRoleMeta[role.enterprise_role];
                    return (
                      <tr key={role.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 text-white">
                          {role.profile?.full_name ?? "Unknown"}
                          {role.profile?.email && <span className="block text-xs text-slate-500">{role.profile.email}</span>}
                        </td>
                        <td className="py-3 px-3"><Badge color={(meta?.color ?? "slate") as "slate" | "indigo" | "sky" | "blue" | "emerald" | "amber"}>{meta?.label ?? role.enterprise_role}</Badge></td>
                        <td className="py-3 px-3 text-slate-400 capitalize">{role.scope_type}{role.scope_id ? `: ${role.scope_id.slice(0, 8)}...` : ""}</td>
                        <td className="py-3 px-3"><Badge color={role.status === "active" ? "emerald" : "slate"}>{role.status}</Badge></td>
                        <td className="py-3 px-3 text-right text-slate-500 text-xs">{new Date(role.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </BusinessShell>
  );
}
