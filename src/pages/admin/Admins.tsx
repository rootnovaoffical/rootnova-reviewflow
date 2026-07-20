import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth, isRootNovaSuperAdmin } from "../../lib/auth";
import { LoadingSpinner, ErrorState, EmptyState, Badge, PageHeader } from "../../components/ui";
import type { AdminInvitation, Profile } from "../../lib/types";

export default function Admins() {
  const { profile, session } = useAuth();
  const isSuperAdmin = isRootNovaSuperAdmin(profile?.role);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", role: "ROOTNOVA_ADMIN" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [inv, profs] = await Promise.all([
      supabase.from("admin_invitations").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").in("role", ["ROOTNOVA_SUPER_ADMIN", "ROOTNOVA_ADMIN"]).order("created_at", { ascending: false }),
    ]);

    if (inv.error || profs.error) {
      setError(inv.error?.message ?? profs.error?.message ?? "Failed to load");
      setLoading(false);
      return;
    }

    setInvitations((inv.data ?? []) as AdminInvitation[]);
    setAdmins((profs.data ?? []) as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token) return;
    setInviting(true);
    setError(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-admin`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "invite", email: form.email, role: form.role }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to invite (${res.status})`);
      }

      setShowInvite(false);
      setForm({ email: "", role: "ROOTNOVA_ADMIN" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite admin");
    }

    setInviting(false);
  }

  async function handleRevoke(invitationId: string) {
    setRevoking(invitationId);

    const { error: err } = await supabase
      .from("admin_invitations")
      .update({ status: "REVOKED" })
      .eq("id", invitationId);

    setRevoking(null);
    if (err) {
      setError(err.message);
      return;
    }
    load();
  }

  if (loading) return <LoadingSpinner size={32} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Admins"
        subtitle="Manage RootNova admin users and invitations"
        action={isSuperAdmin && !showInvite ? <button className="btn-primary" onClick={() => setShowInvite(true)}>Invite Admin</button> : undefined}
      />

      {showInvite && isSuperAdmin && (
        <form onSubmit={handleInvite} className="card mb-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Invite Admin</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="ROOTNOVA_ADMIN">ROOTNOVA_ADMIN</option>
                <option value="ROOTNOVA_SUPER_ADMIN">ROOTNOVA_SUPER_ADMIN</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={inviting}>{inviting ? "Inviting..." : "Send Invitation"}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Admin Users ({admins.length})</h2>
        {admins.length === 0 ? (
          <EmptyState message="No admin users found" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="pb-2 font-medium text-slate-600">Name</th>
                <th className="pb-2 font-medium text-slate-600">Email</th>
                <th className="pb-2 font-medium text-slate-600">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((a) => (
                <tr key={a.id}>
                  <td className="py-2 font-medium text-slate-900">{a.full_name}</td>
                  <td className="py-2 text-slate-500">{a.email}</td>
                  <td className="py-2"><Badge status={a.role} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Invitations ({invitations.length})</h2>
        {invitations.length === 0 ? (
          <EmptyState message="No invitations found" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="pb-2 font-medium text-slate-600">Email</th>
                <th className="pb-2 font-medium text-slate-600">Role</th>
                <th className="pb-2 font-medium text-slate-600">Status</th>
                {isSuperAdmin && <th className="pb-2 font-medium text-slate-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invitations.map((inv) => (
                <tr key={inv.id}>
                  <td className="py-2 font-medium text-slate-900">{inv.email}</td>
                  <td className="py-2 text-slate-500">{inv.role}</td>
                  <td className="py-2"><Badge status={inv.status} /></td>
                  {isSuperAdmin && (
                    <td className="py-2">
                      {inv.status === "INVITED" && (
                        <button
                          className="btn-danger px-3 py-1 text-xs"
                          disabled={revoking === inv.id}
                          onClick={() => handleRevoke(inv.id)}
                        >
                          {revoking === inv.id ? "Revoking..." : "Revoke"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
