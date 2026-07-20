import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { LoadingSpinner, ErrorState, EmptyState, Badge, PageHeader, Pagination } from "../../components/ui";
import type { Business, Organization } from "../../lib/types";

const PAGE_SIZE = 20;

interface BusinessWithOrg extends Business {
  organizations: Pick<Organization, "name"> | null;
}

export default function Businesses() {
  const [businesses, setBusinesses] = useState<BusinessWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    let query = supabase
      .from("businesses")
      .select("*, organizations(name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end);

    if (debouncedSearch) {
      query = query.ilike("name", `%${debouncedSearch}%`);
    }

    const { data, error: err, count } = await query;

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setBusinesses((data ?? []) as BusinessWithOrg[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Businesses" subtitle="Manage all businesses on the platform" />

      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner size={32} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : businesses.length === 0 ? (
        <EmptyState message="No businesses found" />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Organization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/businesses/${b.id}`} className="text-primary-600 hover:underline">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><Badge status={b.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{b.organizations?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
