import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { Organization } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import { formatDate } from "../../lib/utils";

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState<Organization[] | null>(null);

  useEffect(() => {
    supabase.from("organizations").select("*").order("created_at", { ascending: false }).then(({ data }) => setOrgs(data as Organization[] || []));
  }, []);

  if (!orgs) return <Layout title="Organizations"><Loading /></Layout>;

  return (
    <Layout title="Organizations">
      {orgs.length === 0 ? <EmptyState title="No organizations" subtitle="Organizations will appear here once partners sign up." /> : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orgs.map((o) => (
                <tr key={o.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4"><Link to={`/admin/organizations/${o.id}`} className="text-white font-medium hover:text-primary-300">{o.name}</Link></td>
                  <td className="px-6 py-4 text-slate-400">{o.type}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${o.status === "ACTIVE" ? "bg-success-500/20 text-success-400" : "bg-error-500/20 text-error-400"}`}>{o.status}</span></td>
                  <td className="px-6 py-4 text-slate-400">{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
