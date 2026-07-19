import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { Avatar } from "../../components/Avatar";
import { useToast } from "../../components/Toast";
import { ConfirmDialog } from "../../components/Modal";
import { formatCurrency, timeAgo } from "../../lib/utils";
import type { Organization, OrganizationMember } from "../../lib/types";

type Tab = "overview" | "subscription" | "payments" | "members" | "settings";

export function SuperAdminOrganizationDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const { toast } = useToast();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Organization>>({});
  const [saving, setSaving] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const { data: o, error: oErr } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();
    if (oErr || !o) { setError("Organization not found"); setLoading(false); return; }
    setOrg(o as Organization); setEditForm(o as Organization);
    const [m, p, s] = await Promise.all([
      supabase.from("organization_members").select("*, profile:profiles!organization_members_user_id_fkey(*)").eq("organization_id", orgId),
      supabase.from("payments").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*, plan:plans(*)").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setMembers((m.data as OrganizationMember[]) || []);
    setPayments(p.data || []);
    setSubscription(s.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [orgId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("organizations").update({ name: editForm.name, contact_email: editForm.contact_email, contact_phone: editForm.contact_phone }).eq("id", orgId);
    if (error) toast(error.message, "error"); else { toast("Organization updated", "success"); setEditing(false); load(); }
    setSaving(false);
  };

  const handleToggleStatus = async () => {
    if (!org) return;
    const newStatus = org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const { error } = await supabase.from("organizations").update({ status: newStatus }).eq("id", orgId);
    if (error) toast(error.message, "error"); else { toast(`Organization ${newStatus.toLowerCase()}`, "success"); setSuspendOpen(false); load(); }
  };

  if (loading) return <Loading message="Loading organization…" />;
  if (error) return <ErrorState message={error} />;
  if (!org) return <ErrorState message="Organization not found" />;

  const tabs: { key: Tab; label: string }[] = [{ key: "overview", label: "Overview" }, { key: "subscription", label: "Subscription" }, { key: "payments", label: "Payments" }, { key: "members", label: "Members" }, { key: "settings", label: "Settings" }];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/superadmin/organizations" className="text-ink-400 hover:text-ink-100">←</Link>
        <Avatar src={org.logo_url} name={org.name} size="lg" ring />
        <div className="flex-1"><h1 className="font-display text-2xl font-bold text-ink-50">{org.name}</h1><p className="text-sm text-ink-400">/{org.slug}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${org.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{org.status}</span>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-white/5 scrollbar-thin">
        {tabs.map((t) => (<button key={t.key} onClick={() => setTab(t.key)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${tab === t.key ? "border-indigo-400 text-indigo-300" : "border-transparent text-ink-400 hover:text-ink-100"}`}>{t.label}</button>))}
      </div>
      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card"><p className="label">Type</p><p className="text-ink-50">{org.type}</p></div>
          <div className="card"><p className="label">Contact Email</p><p className="text-ink-50">{org.contact_email || "—"}</p></div>
          <div className="card"><p className="label">Contact Phone</p><p className="text-ink-50">{org.contact_phone || "—"}</p></div>
          <div className="card"><p className="label">Members</p><p className="text-ink-50">{members.length}</p></div>
          <div className="card"><p className="label">Payments</p><p className="text-ink-50">{payments.length}</p></div>
          <div className="card"><p className="label">Created</p><p className="text-ink-50">{timeAgo(org.created_at)}</p></div>
        </div>
      )}
      {tab === "subscription" && (
        <div className="card">
          {subscription ? (<>
            <h3 className="font-display text-base font-semibold text-ink-50">{subscription.plan?.name || "Custom Plan"}</h3>
            <p className="mt-2 text-sm text-ink-400">Status: {subscription.status} · Cycle: {subscription.billing_cycle}</p>
            <p className="mt-1 text-sm text-ink-400">Monthly: {formatCurrency(subscription.custom_monthly_price ?? subscription.plan?.monthly_price ?? 0)}</p>
          </>) : <EmptyState title="No subscription" message="This organization has no active subscription." />}
        </div>
      )}
      {tab === "payments" && (
        <div className="space-y-2">
          {payments.length === 0 ? <EmptyState title="No payments" /> : payments.map((p: any) => (
            <Link key={p.id} to={`/superadmin/payments/${p.id}`} className="card card-hover flex items-center justify-between">
              <div><p className="font-medium text-ink-50">{formatCurrency(p.amount)}</p><p className="text-sm text-ink-400">{p.payment_method} · {p.payment_date}</p></div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-300" : p.status === "PENDING" || p.status === "UNDER_REVIEW" ? "bg-amber-500/15 text-amber-300" : "bg-red-500/15 text-red-300"}`}>{p.status.replace("_", " ")}</span>
            </Link>
          ))}
        </div>
      )}
      {tab === "members" && (
        <div className="space-y-2">
          {members.length === 0 ? <EmptyState title="No members" /> : members.map((m: any) => (
            <div key={m.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3"><Avatar src={m.profile?.avatar_url} name={m.profile?.full_name || "?"} size="sm" /><div><p className="text-sm font-medium text-ink-50">{m.profile?.full_name || "Unknown"}</p><p className="text-xs text-ink-400">{m.profile?.email}</p></div></div>
              <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">{m.role}</span>
            </div>
          ))}
        </div>
      )}
      {tab === "settings" && (
        <div className="card max-w-2xl space-y-4">
          {editing ? (
            <>
              <div><label className="label">Name</label><input className="input" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><label className="label">Contact Email</label><input className="input" value={editForm.contact_email || ""} onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })} /></div>
              <div><label className="label">Contact Phone</label><input className="input" value={editForm.contact_phone || ""} onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })} /></div>
              <div className="flex gap-3"><button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button><button className="btn-secondary" onClick={() => { setEditing(false); setEditForm(org); }}>Cancel</button></div>
            </>
          ) : (
            <>
              <div><p className="label">Name</p><p className="text-ink-50">{org.name}</p></div>
              <div><p className="label">Contact Email</p><p className="text-ink-50">{org.contact_email || "—"}</p></div>
              <div><p className="label">Contact Phone</p><p className="text-ink-50">{org.contact_phone || "—"}</p></div>
              <div className="flex gap-3"><button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button><button className="btn-danger" onClick={() => setSuspendOpen(true)}>{org.status === "ACTIVE" ? "Suspend" : "Reactivate"}</button></div>
            </>
          )}
        </div>
      )}
      <ConfirmDialog open={suspendOpen} onClose={() => setSuspendOpen(false)} onConfirm={handleToggleStatus} title={org.status === "ACTIVE" ? "Suspend Organization?" : "Reactivate Organization?"} message={org.status === "ACTIVE" ? "Members will lose access immediately." : "Members will regain access."} confirmLabel={org.status === "ACTIVE" ? "Suspend" : "Reactivate"} danger={org.status === "ACTIVE"} />
    </div>
  );
}
