import { useEffect, useState } from "react";
import BusinessShell from "./BusinessShell";
import { Card, PageHeader, Badge } from "../../components/Shell";
import { Loading, EmptyState } from "../../components/States";
import {
  fetchBranches,
  fetchBranchManagers,
  assignBranchManager,
  removeBranchManager,
  getUserOrgId,
  branchStatusMeta,
  type EnterpriseBranch,
  type BranchManager as BranchManagerType,
  type EnterpriseRole,
  enterpriseRoleMeta,
} from "../../lib/enterprise";

export default function EnterpriseBranchManagers() {
  const [branches, setBranches] = useState<EnterpriseBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<EnterpriseBranch | null>(null);
  const [managers, setManagers] = useState<BranchManagerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ user_id: "", enterprise_role: "BRANCH_MANAGER" as EnterpriseRole });

  const orgIdPromise = getUserOrgId();

  useEffect(() => {
    (async () => {
      const orgId = await orgIdPromise;
      if (!orgId) { setLoading(false); return; }
      const data = await fetchBranches(orgId);
      setBranches(data);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedBranch) return;
    (async () => {
      const data = await fetchBranchManagers(selectedBranch.id);
      setManagers(data);
    })();
  }, [selectedBranch]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    await assignBranchManager(selectedBranch.id, assignForm.user_id, assignForm.enterprise_role);
    const data = await fetchBranchManagers(selectedBranch.id);
    setManagers(data);
    setAssignForm({ user_id: "", enterprise_role: "BRANCH_MANAGER" });
    setShowAssign(false);
  };

  const handleRemove = async (managerId: string) => {
    if (!selectedBranch) return;
    await removeBranchManager(managerId);
    const data = await fetchBranchManagers(selectedBranch.id);
    setManagers(data);
  };

  if (loading) return <BusinessShell title="Branch Managers"><Loading /></BusinessShell>;

  return (
    <BusinessShell title="Branch Managers">
      <PageHeader title="Branch Managers" subtitle="Assign and manage managers across locations" />

      <div className="px-4 md:px-8 pb-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Branch list */}
          <Card className="lg:col-span-1">
            <h3 className="text-white font-semibold mb-3 text-sm">Select Branch</h3>
            {branches.length === 0 ? (
              <p className="text-slate-500 text-xs">No branches available.</p>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {branches.map((b) => {
                  const meta = branchStatusMeta[b.status] ?? { label: b.status, color: "slate" };
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBranch(b)}
                      className={`w-full text-left p-3 rounded-xl transition-colors ${selectedBranch?.id === b.id ? "bg-primary-600/20 border border-primary-500/30" : "bg-white/5 hover:bg-white/10 border border-transparent"}`}
                    >
                      <p className="text-white text-sm font-medium truncate">{b.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-500 text-xs">{b.city || "—"}</span>
                        <Badge color={meta.color as "slate" | "emerald" | "amber" | "rose" | "sky"}>{meta.label}</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Managers for selected branch */}
          <div className="lg:col-span-2 space-y-4">
            {selectedBranch ? (
              <>
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-white font-semibold">{selectedBranch.name}</p>
                      <p className="text-slate-500 text-xs">{selectedBranch.address || "No address"} · {selectedBranch.city || "—"}</p>
                    </div>
                    <button onClick={() => setShowAssign(!showAssign)} className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors">
                      {showAssign ? "Cancel" : "+ Assign Manager"}
                    </button>
                  </div>

                  {showAssign && (
                    <form onSubmit={handleAssign} className="space-y-3 mb-4 p-3 rounded-xl bg-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">User ID</label>
                          <input value={assignForm.user_id} onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })} required placeholder="UUID" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none font-mono" />
                        </div>
                        <div>
                          <label className="text-slate-400 text-xs uppercase tracking-wide block mb-1">Role</label>
                          <select value={assignForm.enterprise_role} onChange={(e) => setAssignForm({ ...assignForm, enterprise_role: e.target.value as EnterpriseRole })} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white text-sm focus:border-primary-500 focus:outline-none">
                            {Object.entries(enterpriseRoleMeta).filter(([, m]) => m.scope === "Branch").map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors">Assign</button>
                    </form>
                  )}

                  {managers.length === 0 ? (
                    <p className="text-slate-500 text-sm">No managers assigned to this branch.</p>
                  ) : (
                    <div className="space-y-2">
                      {managers.map((m) => {
                        const meta = enterpriseRoleMeta[m.enterprise_role];
                        return (
                          <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/30 to-primary-700/30 flex items-center justify-center text-white font-medium text-sm">
                              {m.profile?.full_name?.charAt(0) ?? "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium">{m.profile?.full_name ?? "Unknown"}</p>
                              <p className="text-slate-500 text-xs">{m.profile?.email ?? "No email"}</p>
                            </div>
                            <Badge color={(meta?.color ?? "slate") as "slate" | "indigo" | "sky" | "blue" | "emerald" | "amber"}>{meta?.label ?? m.enterprise_role}</Badge>
                            <button onClick={() => handleRemove(m.id)} className="text-xs text-slate-500 hover:text-rose-400">Remove</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <EmptyState title="No Branch" message="Select a branch to view and manage its managers." />
            )}
          </div>
        </div>
      </div>
    </BusinessShell>
  );
}
