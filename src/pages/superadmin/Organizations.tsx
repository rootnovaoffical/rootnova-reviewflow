import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { PageHeader, Card, Badge } from "../../components/Shell";
import { Modal } from "../../components/Modal";
import { useToast } from "../../context/ToastContext";
import { logAudit } from "../../lib/audit";
import type { Organization } from "../../lib/types";

export default function SuperAdminOrganizations() {
  const { show } = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
    setOrgs((data as Organization[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    const { data, error } = await supabase.from("organizations").insert({ name, slug, type: "PARTNER", contact_email: contactEmail, status: "ACTIVE" }).select().single();
    setBusy(false);
    if (error) { show("Create failed: " + error.message, "error"); return; }
    await logAudit("organization.create", "organization", (data as Organization).id);
    show("Organization created", "success");
    setCreateOpen(false); setName(""); setSlug(""); setContactEmail("");
    load();
  };

  const toggleStatus = async (org: Organization) => {
    const next = org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const { error } = await supabase.from("organizations").update({ status: next }).eq("id", org.id);
    if (error) { show("Update failed", "error"); return; }
    await logAudit("organization.status_change", "organization", org.id, null, { from: org.status, to: next });
    show(`Organization ${next === "ACTIVE" ? "activated" : "suspended"}`, "success");
    load();
  };

  return (
    <div>
      <PageHeader title="Organizations" subtitle="Manage partner organizations"
        actions={<button onClick={() => setCreateOpen(true)} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">New organization</button>} />
      <div className="p-8">
        {loading ? <p className="text-slate-400">Loading…</p> : (
          <div className="grid gap-3">
            {orgs.map((o) => (
              <Card key={o.id}>
                <div className="flex items-center justify-between">
                  <Link to={`/admin/organizations/${o.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    {o.logo_url ? <img src={o.logo_url} alt={o.name} className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">{o.name.slice(0, 1)}</div>}
                    <div className="min-w-0"><p className="text-white font-medium truncate">{o.name}</p><p className="text-slate-400 text-xs">{o.slug}</p></div>
                  </Link>
                  <div className="flex items-center gap-3">
                    <Badge color={o.status === "ACTIVE" ? "green" : "amber"}>{o.status}</Badge>
                    <button onClick={() => toggleStatus(o)} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium">{o.status === "ACTIVE" ? "Suspend" : "Activate"}</button>
                  </div>
                </div>
              </Card>
            ))}
            {orgs.length === 0 && <p className="text-slate-500 text-sm">No organizations yet.</p>}
          </div>
        )}
      </div>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New organization">
        <div className="space-y-3">
          <input value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-")); }} placeholder="Organization name" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
            <button onClick={create} disabled={busy} className="px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white">{busy ? "Creating…" : "Create"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
