import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { Business } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import { formatDate } from "../../lib/utils";

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState<(Business & { organization: { name: string; type: string } | null })[] | null>(null);

  useEffect(() => {
    supabase.from("businesses").select("*, organization:organizations(name,type)").order("created_at", { ascending: false }).then(({ data }) => setBusinesses((data as (Business & { organization: { name: string; type: string } | null })[]) || []));
  }, []);

  if (!businesses) return <Layout title="Businesses"><Loading /></Layout>;

  return (
    <Layout title="Businesses">
      {businesses.length === 0 ? <EmptyState title="No businesses" /> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Ownership</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Reviews Enabled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {businesses.map((b) => (
                <tr key={b.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4"><Link to={`/admin/businesses/${b.id}`} className="text-white font-medium hover:text-primary-300">{b.name}</Link></td>
                  <td className="px-6 py-4">{b.organization ? <span className={`px-2 py-1 rounded-full text-xs ${b.organization.type === "ROOTNOVA" ? "bg-primary-500/20 text-primary-300" : "bg-accent-500/20 text-accent-300"}`}>{b.organization.type === "ROOTNOVA" ? "RootNova" : b.organization.name}</span> : <span className="px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-400">Unassigned</span>}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${b.status === "active" ? "bg-success-500/20 text-success-400" : "bg-slate-500/20 text-slate-400"}`}>{b.status}</span></td>
                  <td className="px-6 py-4 text-slate-400">{b.public_review_enabled ? "Yes" : "No"}</td>
                  <td className="px-6 py-4 text-slate-400">{formatDate(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
