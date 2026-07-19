import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import Avatar from "../../components/Avatar";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { callManageAdmin, insertAuditLog } from "../../lib/auth";

export default function AdminAdmins() {
  const { profile: me } = useAuth();
  const { showToast } = useToast();
  const [admins, setAdmins] = useState<Profile[] | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = () => supabase.from("profiles").select("*").in("role", ["ROOTNOVA_SUPER_ADMIN", "ROOTNOVA_ADMIN"]).order("created_at", { ascending: false }).then(({ data }) => setAdmins(data as Profile[] || []));
  useEffect(() => { load(); }, []);

  const toggleStatus = async (admin: Profile) => {
    const newStatus = admin.account_status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const { error } = await supabase.from("profiles").update({ account_status: newStatus }).eq("id", admin.id);
    if (error) { showToast("Failed to update status", "error"); return; }
    if (me) await insertAuditLog({ actor_id: me.id, actor_email: me.email, action: `admin_${newStatus.toLowerCase()}`, target_type: "profile", target_id: admin.id });
    showToast(`Admin ${newStatus === "ACTIVE" ? "activated" : "suspended"}`, "success");
    load();
  };

  const invite = async (email: string, role: string) => {
    const result = await callManageAdmin("invite", { email, role });
    if (!result.ok) { showToast(result.error || "Failed to invite", "error"); return; }
    if (me) await insertAuditLog({ actor_id: me.id, actor_email: me.email, action: "admin_invited", target_type: "admin_invitation", metadata: { email, role } });
    showToast("Invitation sent", "success");
    setInviting(false); load();
  };

  if (!admins) return <Layout title="Admins"><Loading /></Layout>;

  return (
    <Layout title="Admin Management">
      <div className="flex justify-end mb-4">
        <button onClick={() => setInviting(true)} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Invite Admin</button>
      </div>
      {admins.length === 0 ? <EmptyState title="No admins" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {admins.map((a) => (
            <div key={a.id} className="glass rounded-2xl p-6 flex items-center gap-4">
              <Avatar url={a.avatar_url} name={a.full_name} size="lg" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">{a.full_name}</h3>
                <p className="text-xs text-slate-400">{a.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 rounded-full text-xs bg-primary-500/20 text-primary-300">{a.role.replace(/_/g, " ")}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${a.account_status === "ACTIVE" ? "bg-success-500/20 text-success-400" : "bg-error-500/20 text-error-400"}`}>{a.account_status}</span>
                </div>
              </div>
              {a.id !== me?.id && (
                <button onClick={() => toggleStatus(a)} className="px-3 py-2 text-sm glass text-white rounded-lg hover:bg-white/10 transition-colors">{a.account_status === "ACTIVE" ? "Suspend" : "Activate"}</button>
              )}
            </div>
          ))}
        </div>
      )}
      {inviting && <InviteModal onClose={() => setInviting(false)} onInvite={invite} />}
    </Layout>
  );
}

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (email: string, role: string) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ROOTNOVA_ADMIN");
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">Invite Admin</h2>
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500" />
        </div>
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500">
            <option value="ROOTNOVA_ADMIN">RootNova Admin</option>
            <option value="ROOTNOVA_SUPER_ADMIN">RootNova Super Admin</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={() => onInvite(email, role)} className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Send Invite</button>
          <button onClick={onClose} className="flex-1 py-2 glass text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}
