// Review sessions list — scoped by role.

import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getMyBusiness, listBusinesses } from "../../lib/business";
import { listSessions } from "../../lib/sessions";
import type { Business, ReviewSession } from "../../types";
import { Card, Badge, Loading, EmptyState, Select } from "../../components/ui";
import { MessageSquareText, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function SessionsPage() {
  const { role } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (role === "BUSINESS_ADMIN") {
          const biz = await getMyBusiness();
          if (biz) { setBusinesses([biz]); setSelectedId(biz.id); }
        } else {
          const list = await listBusinesses();
          setBusinesses(list);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [role]);

  useEffect(() => {
    if (!selectedId && role === "ROOTNOVA_ADMIN") {
      // all sessions
      (async () => { setLoading(true); try { setSessions(await listSessions(null, 200)); } finally { setLoading(false); } })();
      return;
    }
    if (!selectedId) return;
    (async () => { setLoading(true); try { setSessions(await listSessions(selectedId, 200)); } finally { setLoading(false); } })();
  }, [selectedId, role]);

  if (loading) return <Loading label="Loading sessions..." />;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Review Sessions</h1>
          <p className="mt-1 text-sm text-slate-400">Every anonymous review submission and its AI-generated review.</p>
        </div>
        {role === "ROOTNOVA_ADMIN" && (
          <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-56">
            <option value="">All businesses</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        )}
      </header>

      {sessions.length === 0 ? (
        <Card className="p-8"><EmptyState icon={<MessageSquareText className="w-10 h-10" />} title="No review sessions yet" description="Sessions appear here once customers submit reviews." /></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="flex items-center gap-1 text-amber-400"><Star className="w-3.5 h-3.5 fill-amber-400" />{s.rating}</span>
                    <Badge color={s.ai_status === "completed" ? "green" : s.ai_status === "failed" ? "red" : "amber"}>{s.ai_status}</Badge>
                    {s.businesses?.name && <span className="text-xs text-slate-500">· {s.businesses.name}</span>}
                    <span className="text-xs text-slate-500">· {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</span>
                  </div>
                  {s.ai_generated_review ? <p className="text-sm text-slate-200">{s.ai_generated_review}</p> : <p className="text-sm text-slate-500 italic">No review generated</p>}
                  {Array.isArray(s.answers) && s.answers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.answers.flatMap((a) => a.selected).map((sel, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">{sel}</span>)}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
