import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { Avatar } from "../../components/Avatar";
import { timeAgo } from "../../lib/utils";

export function PartnerTeam() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const { data: member } = await supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).maybeSingle();
      const oid = (member as any)?.organization_id;
      if (!oid) { setError("No organization found"); setLoading(false); return; }
      const { data, error } = await supabase.from("organization_members").select("*, profile:profiles!organization_members_user_id_fkey(*)").eq("organization_id", oid).order("created_at");
      if (error) setError(error.message); else setMembers(data || []);
      setLoading(false);
    })();
  }, [profile?.id]);

  if (loading) return <Loading message="Loading team…" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-ink-50">Team</h1><p className="mt-1 text-sm text-ink-400">Members of your organization</p></div>
      {members.length === 0 ? <EmptyState title="No team members" /> : (
        <div className="space-y-2">
          {members.map((m: any) => (
            <div key={m.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={m.profile?.avatar_url} name={m.profile?.full_name || "?"} size="md" />
                <div><p className="font-medium text-ink-50">{m.profile?.full_name || "Unknown"}</p><p className="text-sm text-ink-400">{m.profile?.email}</p></div>
              </div>
              <div className="flex items-center gap-3"><span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-300">{m.role}</span><span className="text-xs text-ink-400">{timeAgo(m.created_at)}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
