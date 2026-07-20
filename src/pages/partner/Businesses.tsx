import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import {
  LoadingSpinner,
  ErrorState,
  EmptyState,
  Badge,
  PageHeader,
  Pagination,
} from "../../components/ui";
import type { Business } from "../../lib/types";

const PAGE_SIZE = 20;

interface NewBusinessForm {
  name: string;
  slug: string;
  welcome_message: string;
  primary_color: string;
  secondary_color: string;
}

const emptyForm: NewBusinessForm = {
  name: "",
  slug: "",
  welcome_message: "",
  primary_color: "#4f46e5",
  secondary_color: "#0ea5e9",
};

export default function Businesses() {
  const { profile } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewBusinessForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadOrg = useCallback(async () => {
    if (!profile) return;
    setOrgLoading(true);
    const { data, error } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (error) {
      setOrgError(error.message);
    } else if (!data?.organization_id) {
      setOrgError("You are not a member of any organization.");
    } else {
      setOrgId(data.organization_id);
    }
    setOrgLoading(false);
  }, [profile]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  const loadBusinesses = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("businesses")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`);
    }
    const { data, error, count: cnt } = await query;
    if (error) {
      setError(error.message);
    } else {
      setBusinesses((data ?? []) as Business[]);
      setCount(cnt ?? 0);
    }
    setLoading(false);
  }, [orgId, page, search]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !profile) return;
    setSubmitting(true);
    setFormError(null);
    const slug = form.slug.trim() || form.name.trim().toLowerCase().replace(/\s+/g, "-");
    const { error: insertError } = await supabase.from("businesses").insert({
      name: form.name.trim(),
      slug,
      welcome_message: form.welcome_message.trim(),
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      organization_id: orgId,
      status: "PENDING",
    });
    setSubmitting(false);
    if (insertError) {
      setFormError(insertError.message);
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    setPage(1);
    loadBusinesses();
  }

  if (orgLoading) return <LoadingSpinner />;
  if (orgError) return <ErrorState message={orgError} onRetry={loadOrg} />;

  return (
    <div>
      <PageHeader
        title="Businesses"
        subtitle="Manage your organization's businesses"
        action={
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "New Business"}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Slug (optional)</label>
              <input
                className="input"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto-generated from name"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Welcome Message</label>
              <textarea
                className="input"
                rows={2}
                value={form.welcome_message}
                onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Primary Color</label>
              <input
                type="color"
                className="input h-10 p-1"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Secondary Color</label>
              <input
                type="color"
                className="input h-10 p-1"
                value={form.secondary_color}
                onChange={(e) => setForm({ ...form, secondary_color: e.target.value })}
              />
            </div>
          </div>
          {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          <button type="submit" disabled={submitting} className="btn-primary mt-4 disabled:opacity-50">
            {submitting ? "Creating..." : "Create Business"}
          </button>
        </form>
      )}

      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={loadBusinesses} />
      ) : businesses.length === 0 ? (
        <EmptyState message={search ? "No businesses match your search." : "No businesses yet. Create one to get started."} />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link to={`/businesses/${b.id}`} className="font-medium text-primary-600 hover:text-primary-700">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{b.slug}</td>
                    <td className="px-6 py-4"><Badge status={b.status} /></td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(b.created_at).toLocaleDateString()}</td>
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
