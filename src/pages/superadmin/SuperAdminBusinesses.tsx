import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { Avatar } from "../../components/Avatar";
import { timeAgo } from "../../lib/utils";
import type { Business } from "../../lib/types";

export function SuperAdminBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
      if (error) setError(error.message); else setBusinesses((data as Business[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading message="Loading businesses…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Businesses</h1><p className="mt-1 text-sm text-ink-400">All businesses on the platform</p></div>
      {businesses.length === 0 ? <EmptyState title="No businesses" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <Link key={b.id} to={`/superadmin/businesses/${b.id}`} className="card card-hover group">
              <div className="flex items-start gap-3">
                <Avatar src={b.logo_url} name={b.name} size="md" ring />
                <div className="min-w-0 flex-1"><h3 className="truncate font-display text-base font-semibold text-ink-50 group-hover:text-indigo-300">{b.name}</h3><p className="truncate text-sm text-ink-400">/{b.slug}</p></div>
              </div>
              <div className="mt-4 flex items-center justify-between"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-ink-700 text-ink-400"}`}>{b.status}</span><span className="text-xs text-ink-400">{timeAgo(b.created_at)}</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
