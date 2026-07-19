import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { PageHeader, Card, Badge } from "../../components/Shell";
import type { Business } from "../../lib/types";

export default function SuperAdminBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("businesses").select("*").order("created_at", { ascending: false });
      setBusinesses((data as Business[]) || []);
      setLoading(false);
    })();
  }, []);
  return (
    <div>
      <PageHeader title="Businesses" subtitle="All businesses on the platform" />
      <div className="p-8">
        {loading ? <p className="text-slate-400">Loading…</p> : (
          <div className="grid gap-3">
            {businesses.map((b) => (
              <Link key={b.id} to={`/admin/businesses/${b.id}`}>
                <Card>
                  <div className="flex items-center gap-3">
                    {b.logo_url ? <img src={b.logo_url} alt={b.name} className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold">{b.name.slice(0, 1)}</div>}
                    <div className="flex-1 min-w-0"><p className="text-white font-medium truncate">{b.name}</p><p className="text-slate-400 text-xs">/r/{b.slug}</p></div>
                    <Badge color={b.status === "active" ? "green" : "slate"}>{b.status}</Badge>
                    {b.public_review_enabled && <Badge color="brand">Public</Badge>}
                  </div>
                </Card>
              </Link>
            ))}
            {businesses.length === 0 && <p className="text-slate-500 text-sm">No businesses yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
