import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import type { Business } from "../../lib/types";
import { Loading, EmptyState } from "../../components/States";

export default function PartnerBusinesses() {
  const { profile } = useAuth();
  const [businesses, setBusinesses] = useState<Business[] | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).single()
      .then(({ data: mem }) => {
        if (mem?.organization_id) {
          supabase.from("businesses").select("*").eq("organization_id", mem.organization_id).order("created_at", { ascending: false })
            .then(({ data }) => setBusinesses(data as Business[] || []));
        } else { setBusinesses([]); }
      });
  }, [profile]);

  if (!businesses) return <Layout title="Businesses"><Loading /></Layout>;

  return (
    <Layout title="Businesses">
      {businesses.length === 0 ? <EmptyState title="No businesses" subtitle="Create your first business to get started." /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((b) => (
            <Link key={b.id} to={`/partner/businesses/${b.id}`} className="glass rounded-2xl p-6 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                {b.logo_url ? <img src={b.logo_url} alt={b.name} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">{b.name[0]}</div>}
                <h3 className="text-white font-medium">{b.name}</h3>
              </div>
              <p className="text-xs text-slate-500">{b.status} • {b.public_review_enabled ? "Reviews enabled" : "Reviews disabled"}</p>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
