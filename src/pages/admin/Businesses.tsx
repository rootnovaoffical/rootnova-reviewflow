import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { Business } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";
import { formatDate } from "../../lib/utils";

const PAGE_SIZE = 20;

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase.from("businesses")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    setBusinesses(data as Business[] || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  if (loading && !businesses) return <Layout title="Businesses"><Loading /></Layout>;

  return (
    <Layout title="Businesses">
      {businesses && businesses.length === 0 && page === 0 ? <EmptyState title="No businesses" /> : (
        <>
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Reviews Enabled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {businesses?.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4"><Link to={`/admin/businesses/${b.id}`} className="text-white font-medium hover:text-primary-300">{b.name}</Link></td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${b.status === "active" ? "bg-success-500/20 text-success-400" : "bg-slate-500/20 text-slate-400"}`}>{b.status}</span></td>
                    <td className="px-6 py-4 text-slate-400">{b.public_review_enabled ? "Yes" : "No"}</td>
                    <td className="px-6 py-4 text-slate-400">{formatDate(b.created_at)}</td>
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
