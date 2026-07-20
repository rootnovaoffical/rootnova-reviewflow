import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { Organization } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import { formatDate } from "../../lib/utils";

const PAGE_SIZE = 20;

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase.from("organizations")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    setOrgs(data as Organization[] || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  if (loading && !orgs) return <Layout title="Organizations"><Loading /></Layout>;

  return (
    <Layout title="Organizations">
      {orgs && orgs.length === 0 && page === 0 ? <EmptyState title="No organizations" subtitle="Organizations will appear here once partners sign up." /> : (
        <>
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
                {orgs?.map((o) => (
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
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-4 py-2 glass text-white text-sm rounded-lg disabled:opacity-40 hover:bg-white/10 transition-colors">Previous</button>
              <span className="text-sm text-slate-400">Page {page + 1} of {totalPages}</span>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="px-4 py-2 glass text-white text-sm rounded-lg disabled:opacity-40 hover:bg-white/10 transition-colors">Next</button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
