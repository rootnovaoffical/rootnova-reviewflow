import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { LoadingSpinner, ErrorState, EmptyState, Badge, PageHeader, Pagination } from "../../components/ui";
import type { Organization } from "../../lib/types";

const PAGE_SIZE = 20;

export default function Organizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "PARTNER",
    contact_email: "",
    contact_phone: "",
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const { data, error: err, count } = await supabase
      .from("organizations")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setOrgs((data ?? []) as Organization[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    const { error: err } = await supabase.from("organizations").insert({
      name: form.name,
      slug: form.slug,
      type: form.type,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      status: "ACTIVE",
    });

    setCreating(false);
    if (err) {
      setError(err.message);
      return;
    }

    setShowCreate(false);
    setForm({ name: "", slug: "", type: "PARTNER", contact_email: "", contact_phone: "" });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Organizations"
        subtitle="Manage partner and platform organizations"
        action={
          <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "New Organization"}
          </button>
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Create Organization</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Slug</label>
              <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="PARTNER">PARTNER</option>
                <option value="ROOTNOVA">ROOTNOVA</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact Email</label>
              <input className="input" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contact Phone</label>
              <input className="input" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      {loading ? (
        <LoadingSpinner size={32} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : orgs.length === 0 ? (
        <EmptyState message="No organizations found" />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Type</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orgs.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/organizations/${o.id}`} className="text-primary-600 hover:underline">
                        {o.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{o.type}</td>
                    <td className="px-4 py-3"><Badge status={o.status} /></td>
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
