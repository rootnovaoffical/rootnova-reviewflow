import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { Avatar } from "../../components/Avatar";
import { timeAgo } from "../../lib/utils";
import type { Organization } from "../../lib/types";

export function SuperAdminOrganizations() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
      if (error) setError(error.message); else setOrgs((data as Organization[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading message="Loading organizations…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Organizations</h1><p className="mt-1 text-sm text-ink-400">All partner organizations</p></div>
      {orgs.length === 0 ? <EmptyState title="No organizations" message="Organizations will appear here once partners sign up." /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => (
            <Link key={o.id} to={`/superadmin/organizations/${o.id}`} className="card card-hover group">
              <div className="flex items-start gap-3">
                <Avatar src={o.logo_url} name={o.name} size="md" ring />
                <div className="min-w-0 flex-1"><h3 className="truncate font-display text-base font-semibold text-ink-50 group-hover:text-indigo-300">{o.name}</h3><p className="truncate text-sm text-ink-400">/{o.slug}</p></div>
              </div>
              <div className="mt-4 flex items-center justify-between"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${o.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{o.status}</span><span className="text-xs text-ink-400">{timeAgo(o.created_at)}</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
