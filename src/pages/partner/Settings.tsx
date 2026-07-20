import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import {
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Badge,
  PageHeader,
} from "../../components/ui";
import type { Organization, OrganizationMember, Profile } from "../../lib/types";

interface TeamMember extends OrganizationMember {
  profiles: Pick<Profile, "full_name" | "email"> | null;
}

interface OrgForm {
  name: string;
  contact_email: string;
  contact_phone: string;
  logo_url: string;
}

export default function Settings() {
  const { profile } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<OrgForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadOrg = useCallback(async () => {
    if (!profile) return;
    setOrgLoading(true);
    const { data, error } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (error) setOrgError(error.message);
    else if (!data?.organization_id) setOrgError("You are not a member of any organization.");
    else setOrgId(data.organization_id);
    setOrgLoading(false);
  }, [profile]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);

    const [orgRes, membersRes] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", orgId).maybeSingle(),
      supabase
        .from("organization_members")
        .select("*, profiles:profiles!user_id(full_name, email)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true }),
    ]);

    if (orgRes.error) { setError(orgRes.error.message); setLoading(false); return; }
    if (membersRes.error) { setError(membersRes.error.message); setLoading(false); return; }

    setOrganization((orgRes.data as Organization) ?? null);
    setMembers((membersRes.data ?? []) as TeamMember[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function startEditing() {
    if (!organization) return;
    setForm({
      name: organization.name,
      contact_email: organization.contact_email ?? "",
      contact_phone: organization.contact_phone ?? "",
      logo_url: organization.logo_url ?? "",
    });
    setEditing(true);
    setSaveError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !form) return;
    setSaving(true);
    setSaveError(null);
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        name: form.name,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        logo_url: form.logo_url || null,
      })
      .eq("id", orgId);
    setSaving(false);
    if (updateError) {
      setSaveError(updateError.message);
      return;
    }
    setEditing(false);
    loadData();
  }

  if (orgLoading) return <LoadingSpinner />;
  if (orgError) return <ErrorState message={orgError} onRetry={loadOrg} />;
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;
  if (!organization) return <EmptyState message="Organization not found." />;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your organization details"
        action={
          !editing ? (
            <button className="btn-secondary" onClick={startEditing}>Edit Organization</button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Organization Details</h2>
          {editing && form ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Contact Email</label>
                <input type="email" className="input" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div>
                <label className="label">Contact Phone</label>
                <input className="input" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Logo URL</label>
                <input className="input" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
              </div>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <dl className="space-y-3">
              <div><dt className="text-sm font-medium text-slate-500">Name</dt><dd className="text-slate-800">{organization.name}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Slug</dt><dd className="text-slate-800">{organization.slug}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Type</dt><dd className="text-slate-800">{organization.type}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Status</dt><dd><Badge status={organization.status} /></dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Contact Email</dt><dd className="text-slate-800">{organization.contact_email ?? "—"}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Contact Phone</dt><dd className="text-slate-800">{organization.contact_phone ?? "—"}</dd></div>
              <div><dt className="text-sm font-medium text-slate-500">Logo URL</dt><dd className="text-slate-800">{organization.logo_url ?? "—"}</dd></div>
            </dl>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Team Members</h2>
          {members.length === 0 ? (
            <EmptyState message="No team members." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-800">{m.profiles?.full_name ?? "Unknown"}</p>
                    <p className="text-xs text-slate-500">{m.profiles?.email ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{m.role}</span>
                    <Badge status={m.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
