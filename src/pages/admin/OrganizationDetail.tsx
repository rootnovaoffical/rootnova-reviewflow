import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { LoadingSpinner, ErrorState, Badge } from "../../components/ui";
import type { Organization, OrganizationMember, Business, Subscription, Plan, Profile } from "../../lib/types";

interface MemberWithProfile extends OrganizationMember {
  profiles: Pick<Profile, "full_name" | "email"> | null;
}

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [creatingSub, setCreatingSub] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    contact_email: "",
    contact_phone: "",
    status: "",
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const { data: orgData, error: orgErr } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (orgErr) {
      setError(orgErr.message);
      setLoading(false);
      return;
    }

    if (!orgData) {
      setError("Organization not found");
      setLoading(false);
      return;
    }

    const o = orgData as Organization;
    setOrg(o);
    setForm({
      name: o.name,
      slug: o.slug,
      contact_email: o.contact_email ?? "",
      contact_phone: o.contact_phone ?? "",
      status: o.status,
    });

    const [mem, biz, sub, pln] = await Promise.all([
      supabase.from("organization_members").select("*, profiles(full_name, email)").eq("organization_id", id),
      supabase.from("businesses").select("*").eq("organization_id", id).order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*").eq("organization_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("plans").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    ]);

    setMembers((mem.data ?? []) as MemberWithProfile[]);
    setBusinesses((biz.data ?? []) as Business[]);
    setSubscription((sub.data as Subscription) ?? null);
    setPlans((pln.data ?? []) as Plan[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);

    const { error: err } = await supabase
      .from("organizations")
      .update({
        name: form.name,
        slug: form.slug,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        status: form.status,
      })
      .eq("id", id);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setShowEdit(false);
    load();
  }

  async function handleCreateSub(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !selectedPlan) return;
    setCreatingSub(true);

    const { error: err } = await supabase.from("subscriptions").insert({
      organization_id: id,
      plan_id: selectedPlan,
      status: "ACTIVE",
      billing_cycle: billingCycle,
      current_period_start: new Date().toISOString(),
    });

    setCreatingSub(false);
    if (err) {
      setError(err.message);
      return;
    }
    setShowSub(false);
    load();
  }

  if (loading) return <LoadingSpinner size={32} />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!org) return <ErrorState message="Organization not found" />;

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link to="/organizations" className="text-sm text-primary-600 hover:underline">← Back to Organizations</Link>
      </div>

      <div className="card mb-6 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">{org.name}</h1>
          <div className="flex items-center gap-3">
            <Badge status={org.status} />
            <button className="btn-secondary" onClick={() => setShowEdit(!showEdit)}>
              {showEdit ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-slate-500">Type</dt><dd className="font-medium text-slate-900">{org.type}</dd></div>
          <div><dt className="text-slate-500">Slug</dt><dd className="font-medium text-slate-900">{org.slug}</dd></div>
          <div><dt className="text-slate-500">Contact Email</dt><dd className="font-medium text-slate-900">{org.contact_email ?? "—"}</dd></div>
          <div><dt className="text-slate-500">Contact Phone</dt><dd className="font-medium text-slate-900">{org.contact_phone ?? "—"}</dd></div>
        </dl>
      </div>

      {showEdit && (
        <form onSubmit={handleSave} className="card mb-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Edit Organization</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Slug</label><input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Contact Email</label><input className="input" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Contact Phone</label><input className="input" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select></div>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
        </form>
      )}

      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Subscription</h2>
        {subscription ? (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-500">Status</dt><dd className="font-medium"><Badge status={subscription.status} /></dd></div>
            <div><dt className="text-slate-500">Billing Cycle</dt><dd className="font-medium text-slate-900">{subscription.billing_cycle}</dd></div>
            <div><dt className="text-slate-500">Trial Ends</dt><dd className="font-medium text-slate-900">{subscription.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString() : "—"}</dd></div>
            <div><dt className="text-slate-500">Period End</dt><dd className="font-medium text-slate-900">{subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "—"}</dd></div>
          </dl>
        ) : (
          <div>
            <p className="mb-3 text-sm text-slate-500">No subscription found.</p>
            <button className="btn-primary" onClick={() => setShowSub(!showSub)}>{showSub ? "Cancel" : "Create Subscription"}</button>
          </div>
        )}
      </div>

      {showSub && !subscription && (
        <form onSubmit={handleCreateSub} className="card mb-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Create Subscription</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Plan</label>
            <select className="input" value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} required>
              <option value="">Select a plan...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (₹{p.monthly_price}/mo)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Billing Cycle</label>
            <select className="input" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}>
              <option value="MONTHLY">MONTHLY</option>
              <option value="ANNUAL">ANNUAL</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={creatingSub}>{creatingSub ? "Creating..." : "Create Subscription"}</button>
        </form>
      )}

      <div className="card mb-6 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Members ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-sm text-slate-500">No members found.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-medium text-slate-900">{m.profiles?.full_name ?? "Unknown"}</span>
                <span className="text-slate-500">{m.profiles?.email ?? "—"} · {m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Businesses ({businesses.length})</h2>
        {businesses.length === 0 ? (
          <p className="text-sm text-slate-500">No businesses found.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {businesses.map((b) => (
              <li key={b.id} className="flex justify-between border-b border-slate-100 pb-2">
                <Link to={`/businesses/${b.id}`} className="text-primary-600 hover:underline">{b.name}</Link>
                <Badge status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
