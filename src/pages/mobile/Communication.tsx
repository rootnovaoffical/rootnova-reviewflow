// ============================================================
// MODULE 14 — MOBILE COMMUNICATION HUB
// Reuses Module 7 communication services
// ============================================================

import { useEffect, useState, useCallback } from "react";
import MobileShell from "../../components/MobileShell";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { cacheSet } from "../../lib/mobile-offline";
import { timeAgo } from "../../lib/utils";
import type { Message, MessageTemplate } from "../../lib/types";

type TabType = "messages" | "templates";

export default function MobileCommunication() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<TabType>("messages");
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data: bizData } = await supabase
      .from("business_admins")
      .select("business_id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!bizData?.business_id) { setLoading(false); return; }

    const [msgRes, tplRes] = await Promise.all([
      supabase.from("messages").select("*").eq("business_id", bizData.business_id).order("created_at", { ascending: false }).limit(50),
      supabase.from("message_templates").select("*").eq("business_id", bizData.business_id).eq("is_active", true).order("created_at", { ascending: false }).limit(30),
    ]);

    const m = (msgRes.data ?? []) as Message[];
    const t = (tplRes.data ?? []) as MessageTemplate[];
    setMessages(m); setTemplates(t);
    cacheSet(`mobile-messages-${profile.id}`, m, 10);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const channelIcons: Record<string, string> = { whatsapp: "💬", sms: "📱", email: "📧", push: "🔔", in_app: "📲" };
  const statusColors: Record<string, string> = {
    delivered: "text-emerald-400", sent: "text-sky-400", failed: "text-rose-400",
    queued: "text-amber-400", read: "text-emerald-400", sending: "text-sky-400",
  };

  if (loading) return <MobileShell title="Communication" backTo="/mobile">{skeleton()}</MobileShell>;

  return (
    <MobileShell title="Communication" backTo="/mobile">
      <div className="space-y-4 page-enter">
        <div className="flex gap-2">
          {(["messages", "templates"] as TabType[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${tab === t ? "bg-primary-500/20 text-primary-300 border border-primary-500/30" : "bg-white/5 text-slate-400 border border-transparent"}`}>{t}</button>
          ))}
        </div>

        {tab === "messages" && (
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-12"><span className="text-4xl">📨</span><p className="text-sm text-slate-500 mt-2">No messages yet.</p></div>
            ) : (
              messages.map((m, i) => (
                <div key={m.id} className="glass rounded-xl p-3 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{channelIcons[m.channel] ?? "📨"}</span>
                      <span className="text-xs text-white font-medium">{m.recipient_name ?? m.recipient_identifier}</span>
                    </div>
                    <span className={`text-[10px] ${statusColors[m.status] ?? "text-slate-500"}`}>{m.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-1">{m.body}</p>
                  <p className="text-[10px] text-slate-600">{timeAgo(m.created_at)}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "templates" && (
          <div className="space-y-2">
            {templates.length === 0 ? (
              <div className="text-center py-12"><span className="text-4xl">📝</span><p className="text-sm text-slate-500 mt-2">No templates yet.</p></div>
            ) : (
              templates.map((t, i) => (
                <div key={t.id} className="glass rounded-xl p-3 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white font-medium">{t.name}</span>
                    <span className="text-[10px] text-slate-500">{t.channel}</span>
                  </div>
                  {t.subject && <p className="text-xs text-slate-400 mb-0.5">{t.subject}</p>}
                  <p className="text-xs text-slate-500 line-clamp-2">{t.body}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function skeleton() {
  return <div className="space-y-2 pt-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}</div>;
}
