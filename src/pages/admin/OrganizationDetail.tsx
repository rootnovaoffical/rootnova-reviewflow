import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { Organization, OrganizationMember, Business } from "../../lib/types";
import { Loading, ErrorState } from "../../components/States";
import Avatar from "../../components/Avatar";
import { formatDate } from "../../lib/utils";

export default function AdminOrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("organizations").select("*").eq("id", id).maybeSingle(),
      supabase.from("organization_members").select("*, profile:profiles!user_id(*)").eq("organization_id", id),
      supabase.from("businesses").select("*").eq("organization_id", id),
    ]).then(([o, m, b]) => {
      if (o.error) setError(o.error.message);
      if (m.error) setError(m.error.message);
      if (b.error) setError(b.error.message);
      setOrg(o.data as Organization);
      setMembers((m.data || []) as unknown as OrganizationMember[]);
      setBusinesses((b.data || []) as Business[]);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <Layout title="Organization"><Loading /></Layout>;
  if (error) return <Layout title="Organization"><ErrorState message={error} /></Layout>;
  if (!org) return <Layout title="Organization"><ErrorState message="Organization not found" /></Layout>;

  return (
    <Layout title={org.name}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            {org.logo_url ? <img src={org.logo_url} alt={org.name} className="w-14 h-14 rounded-xl object-cover" /> : <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">{org.name[0]}</div>}
            <div><h2 className="text-lg font-bold text-white">{org.name}</h2><p className="text-sm text-slate-400">{org.type}</p></div>
          </div>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-slate-500">Contact Email</dt><dd className="text-white">{org.contact_email || "—"}</dd></div>
            <div><dt className="text-slate-500">Contact Phone</dt><dd className="text-white">{org.contact_phone || "—"}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd><span className={`px-2 py-1 rounded-full text-xs ${org.status === "ACTIVE" ? "bg-success-500/20 text-success-400" : "bg-error-500/20 text-error-400"}`}>{org.status}</span></dd></div>
            <div><dt className="text-slate-500">Created</dt><dd className="text-white">{formatDate(org.created_at)}</dd></div>
          </dl>
        </div>
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Team Members</h3>
          {members.length === 0 ? <p className="text-slate-500 text-sm">No members</p> : (
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar url={m.profile?.avatar_url} name={m.profile?.full_name} size="sm" />
                  <div className="flex-1"><p className="text-sm text-white">{m.profile?.full_name || "Unknown"}</p><p className="text-xs text-slate-500">{m.profile?.email}</p></div>
                  <span className="text-xs text-slate-400">{m.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="glass rounded-2xl p-6 mt-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Businesses</h3>
        {businesses.length === 0 ? <p className="text-slate-500 text-sm">No businesses</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((b) => (
              <Link key={b.id} to={`/admin/businesses/${b.id}`} className="glass rounded-xl p-4 hover:bg-white/5 transition-colors">
                <p className="text-white font-medium">{b.name}</p>
                <p className="text-xs text-slate-500 mt-1">{b.status}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
