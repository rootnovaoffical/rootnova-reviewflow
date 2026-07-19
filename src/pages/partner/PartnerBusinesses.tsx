import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { Avatar } from "../../components/Avatar";
import { timeAgo } from "../../lib/utils";

export function PartnerBusinesses() {
  const { profile } = useAuth();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).maybeSingle();
      const oid = (member as any)?.organization_id;
      if (!oid) { setError("No organization found"); setLoading(false); return; }
      const { data, error } = await supabase.from("businesses").select("*").eq("organization_id", oid).order("created_at", { ascending: false });
      if (error) setError(error.message); else setBusinesses(data || []);
      setLoading(false);
    })();
  }, [profile?.id]);

  if (loading) return <Loading message="Loading businesses…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="font-display text-2xl font-bold text-ink-50">Businesses</h1><p className="mt-1 text-sm text-ink-400">Manage your organization's businesses</p></div><Link to="/partner/businesses/new" className="btn-primary">New Business</Link></div>
      {businesses.length === 0 ? <EmptyState title="No businesses yet" message="Create your first business to start collecting reviews." action={<Link to="/partner/businesses/new" className="btn-primary">New Business</Link>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b: any) => (
            <Link key={b.id} to={`/partner/businesses/${b.id}`} className="card card-hover group">
              <div className="flex items-start gap-3">
                <Avatar src={b.logo_url} name={b.name} size="md" ring />
                <div className="min-w-0 flex-1"><h3 className="truncate font-display text-base font-semibold text-ink-50 group-hover:text-violet-300">{b.name}</h3><p className="truncate text-sm text-ink-400">/{b.slug}</p></div>
              </div>
              <div className="mt-4 flex items-center justify-between"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-ink-700 text-ink-400"}`}>{b.status}</span><span className="text-xs text-ink-400">{timeAgo(b.created_at)}</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
