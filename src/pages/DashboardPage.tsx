import { useState, useEffect, useCallback } from "react";
import { Star, TrendingUp, MessageSquare, Eye, Copy, ExternalLink, Settings, BarChart3, Sparkles, Plus, Trash2, Edit3, X, Save, ListChecks, QrCode as QrCodeIcon, Zap } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import type { Business, ReviewSession, Question, QrCode, AutomationRule } from "../lib/types";
import SpatialBackground from "../components/SpatialBackground";

type Tab = "overview" | "reviews" | "questions" | "qr" | "automation" | "settings";

export default function DashboardPage() {
  const { showToast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  const loadBusiness = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("businesses").select("*").eq("status", "active").limit(1).maybeSingle();
      if (error || !data) { setLoading(false); return; }
      setBusiness(data as Business);
    } catch { setLoading(false); }
  }, []);

  useEffect(() => { loadBusiness(); }, [loadBusiness]);
  useEffect(() => { if (business) setLoading(false); }, [business]);

  const copyReviewLink = () => { const url = `${window.location.origin}/#/review/${business?.slug || "happy-hour-cafe"}`; navigator.clipboard.writeText(url); showToast("Review link copied!", "success"); };

  if (loading) return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div></>;
  if (!business) return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center"><div className="glass-strong rounded-3xl p-10 text-center"><h1 className="text-2xl font-bold text-white mb-2">No Business Found</h1><p className="text-slate-400">Unable to load dashboard data.</p></div></div></>;

  const navItems: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "reviews", label: "Reviews", icon: <MessageSquare className="w-4 h-4" /> },
    { key: "questions", label: "Questions", icon: <ListChecks className="w-4 h-4" /> },
    { key: "qr", label: "QR Codes", icon: <QrCodeIcon className="w-4 h-4" /> },
    { key: "automation", label: "Automation", icon: <Zap className="w-4 h-4" /> },
    { key: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      <SpatialBackground />
      <div className="min-h-screen flex">
        <aside className="w-64 hidden md:flex flex-col glass-strong border-r border-white/10 min-h-screen p-4 sticky top-0">
          <div className="flex items-center gap-3 mb-8 px-2">
            {business.logo_url ? <img src={business.logo_url} alt={business.name} className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>}
            <div><h2 className="text-sm font-bold text-white truncate">{business.name}</h2><p className="text-xs text-slate-500">RootNova Dashboard</p></div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${tab === item.key ? "sidebar-link-active text-white" : "text-slate-400"}`}>{item.icon} {item.label}</button>)}
          </nav>
          <div className="mt-auto pt-4 border-t border-white/5">
            <button onClick={copyReviewLink} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white sidebar-link"><QrCodeIcon className="w-4 h-4" /> Copy Review Link</button>
            <a href={`#/review/${business.slug}`} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white sidebar-link"><ExternalLink className="w-4 h-4" /> View Public Page</a>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          <div className="md:hidden flex gap-1 mb-6 glass rounded-xl p-1 overflow-x-auto">
            {navItems.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`flex-1 min-w-fit py-2 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 ${tab === item.key ? "bg-primary-600 text-white" : "text-slate-400"}`}>{item.icon} {item.label}</button>)}
          </div>
          {tab === "overview" && <OverviewTab businessId={business.id} businessName={business.name} />}
          {tab === "reviews" && <ReviewsTab businessId={business.id} />}
          {tab === "questions" && <QuestionsTab businessId={business.id} />}
          {tab === "qr" && <QrTab businessId={business.id} slug={business.slug} />}
          {tab === "automation" && <AutomationTab businessId={business.id} />}
          {tab === "settings" && <SettingsTab business={business} onUpdate={(b) => setBusiness(b)} />}
        </main>
      </div>
    </>
  );
}

function OverviewTab({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [stats, setStats] = useState({ totalReviews: 0, avgRating: 0, totalViews: 0, totalCompletions: 0, ratingDist: [0,0,0,0,0], recentReviews: [] as ReviewSession[] });
  useEffect(() => {
    const load = async () => {
      try {
        const { data: reviews } = await supabase.from("review_sessions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100);
        const { count: views } = await supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("event_type", "page_view");
        const { count: completions } = await supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("business_id", businessId).eq("event_type", "ai_completion");
        const all = (reviews || []) as ReviewSession[];
        const dist = [0,0,0,0,0]; all.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
        setStats({ totalReviews: all.length, avgRating: all.length > 0 ? all.reduce((s, r) => s + r.rating, 0) / all.length : 0, totalViews: views || 0, totalCompletions: completions || 0, ratingDist: dist, recentReviews: all.slice(0, 10) });
      } catch {}
    };
    load();
  }, [businessId]);
  const maxDist = Math.max(...stats.ratingDist, 1);
  return (
    <div className="space-y-6 screen-enter">
      <div><h1 className="text-2xl font-bold text-white mb-1">Dashboard Overview</h1><p className="text-slate-400 text-sm">Real-time analytics for {businessName}</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Star className="w-5 h-5" />} label="Avg Rating" value={stats.avgRating.toFixed(1)} color="text-amber-400" bg="bg-amber-500/10" />
        <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Total Reviews" value={String(stats.totalReviews)} color="text-primary-400" bg="bg-primary-500/10" />
        <StatCard icon={<Eye className="w-5 h-5" />} label="Page Views" value={String(stats.totalViews)} color="text-accent-400" bg="bg-accent-500/10" />
        <StatCard icon={<Sparkles className="w-5 h-5" />} label="AI Generated" value={String(stats.totalCompletions)} color="text-success-400" bg="bg-success-500/10" />
      </div>
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-400" /> Rating Distribution</h3>
        <div className="space-y-3">
          {stats.ratingDist.map((count, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm text-slate-400 w-12 flex items-center gap-1">{i + 1} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
              <div className="flex-1 h-6 bg-slate-800/50 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${(count / maxDist) * 100}%`, background: ["#ef4444","#f97316","#eab308","#3b82f6","#a855f7"][i] }} /></div>
              <span className="text-sm font-semibold text-white w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary-400" /> Recent Reviews</h3>
        {stats.recentReviews.length === 0 ? <p className="text-slate-500 text-sm py-8 text-center">No reviews yet. Share your review link to get started!</p> : <div className="space-y-3">{stats.recentReviews.slice(0, 5).map((r) => <ReviewRow key={r.id} review={r} />)}</div>}
      </div>
    </div>
  );
}

function ReviewsTab({ businessId }: { businessId: string }) {
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const load = async () => { try { const { data } = await supabase.from("review_sessions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }); setReviews((data || []) as ReviewSession[]); } catch {} setLoading(false); }; load(); }, [businessId]);
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-6 screen-enter">
      <div><h1 className="text-2xl font-bold text-white mb-1">All Reviews</h1><p className="text-slate-400 text-sm">{reviews.length} total reviews</p></div>
      {reviews.length === 0 ? <div className="glass-card rounded-2xl p-12 text-center"><MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No reviews yet.</p></div> : <div className="space-y-3">{reviews.map((r) => <ReviewRow key={r.id} review={r} expanded />)}</div>}
    </div>
  );
}

function QuestionsTab({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Question | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ question_text: "", flow_type: "ALWAYS", optionsText: "", sort_order: 0 });
  const load = useCallback(async () => { try { const { data } = await supabase.from("questions").select("*").eq("business_id", businessId).order("sort_order"); setQuestions((data || []) as Question[]); } catch {} setLoading(false); }, [businessId]);
  useEffect(() => { load(); }, [load]);
  const handleSave = async () => {
    const options = form.optionsText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!form.question_text || options.length === 0) { showToast("Question text and options are required", "error"); return; }
    try {
      if (editing) { const { error } = await supabase.from("questions").update({ question_text: form.question_text, flow_type: form.flow_type, options, sort_order: form.sort_order }).eq("id", editing.id); if (error) throw error; showToast("Question updated!", "success"); }
      else { const { error } = await supabase.from("questions").insert({ business_id: businessId, question_text: form.question_text, question_type: "multiple_choice", flow_type: form.flow_type, options, is_required: true, is_active: true, sort_order: form.sort_order }); if (error) throw error; showToast("Question created!", "success"); }
      setEditing(null); setShowNew(false); setForm({ question_text: "", flow_type: "ALWAYS", optionsText: "", sort_order: 0 }); load();
    } catch { showToast("Failed to save question", "error"); }
  };
  const handleDelete = async (id: string) => { try { await supabase.from("questions").delete().eq("id", id); showToast("Question deleted", "success"); load(); } catch { showToast("Failed to delete", "error"); } };
  const handleToggleActive = async (q: Question) => { try { await supabase.from("questions").update({ is_active: !q.is_active }).eq("id", q.id); load(); } catch {} };
  const startEdit = (q: Question) => { setEditing(q); setForm({ question_text: q.question_text, flow_type: q.flow_type, optionsText: q.options.join("\n"), sort_order: q.sort_order }); setShowNew(true); };
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-6 screen-enter">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white mb-1">Review Questions</h1><p className="text-slate-400 text-sm">{questions.length} questions configured</p></div>
        <button onClick={() => { setShowNew(true); setEditing(null); setForm({ question_text: "", flow_type: "ALWAYS", optionsText: "", sort_order: questions.length }); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:-translate-y-0.5 transition-all"><Plus className="w-4 h-4" /> Add Question</button>
      </div>
      {showNew && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">{editing ? "Edit Question" : "New Question"}</h3><button onClick={() => { setShowNew(false); setEditing(null); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div>
          <Field label="Question Text" value={form.question_text} onChange={(v) => setForm({ ...form, question_text: v })} />
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Flow Type</label><select value={form.flow_type} onChange={(e) => setForm({ ...form, flow_type: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500"><option value="ALWAYS">Always show</option><option value="POSITIVE">Positive only (4-5 stars)</option><option value="NEGATIVE">Negative only (1-3 stars)</option></select></div>
          <Field label="Options (one per line)" value={form.optionsText} onChange={(v) => setForm({ ...form, optionsText: v })} textarea />
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Sort Order</label><input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500" /></div>
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:-translate-y-0.5 transition-all"><Save className="w-4 h-4" /> Save Question</button>
        </div>
      )}
      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.id} className="glass rounded-xl p-4 border border-white/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1"><span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300">{q.flow_type}</span><span className="text-xs text-slate-500">Order: {q.sort_order}</span>{!q.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Inactive</span>}</div>
                <h3 className="text-sm font-semibold text-white mb-1">{q.question_text}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2">{q.options.map((o, i) => <span key={i} className="text-xs px-2 py-1 rounded-lg glass text-slate-300">{o}</span>)}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(q)} className="p-2 rounded-lg glass text-slate-300 hover:text-white hover:bg-white/10 transition-all"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => handleToggleActive(q)} className={`p-2 rounded-lg glass transition-all ${q.is_active ? "text-success-400" : "text-slate-500"}`}><Star className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(q.id)} className="p-2 rounded-lg glass text-error-400 hover:bg-error-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QrTab({ businessId, slug }: { businessId: string; slug: string }) {
  const { showToast } = useToast();
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", qr_type: "review", destination_url: "" });
  const load = useCallback(async () => { try { const { data } = await supabase.from("qr_codes").select("*").eq("business_id", businessId).order("created_at", { ascending: false }); setQrCodes((data || []) as QrCode[]); } catch {} setLoading(false); }, [businessId]);
  useEffect(() => { load(); }, [load]);
  const handleCreate = async () => {
    if (!form.name) { showToast("Name is required", "error"); return; }
    const dest = form.destination_url || `${window.location.origin}/#/review/${slug}`;
    try { const { error } = await supabase.from("qr_codes").insert({ business_id: businessId, name: form.name, qr_type: form.qr_type, destination_url: dest, status: "active", scan_count: 0, metadata: {} }); if (error) throw error; showToast("QR code created!", "success"); setShowNew(false); setForm({ name: "", qr_type: "review", destination_url: "" }); load(); } catch { showToast("Failed to create QR code", "error"); }
  };
  const handleDelete = async (id: string) => { try { await supabase.from("qr_codes").delete().eq("id", id); showToast("QR code deleted", "success"); load(); } catch { showToast("Failed to delete", "error"); } };
  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); showToast("URL copied!", "success"); };
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-6 screen-enter">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white mb-1">QR Codes</h1><p className="text-slate-400 text-sm">{qrCodes.length} QR codes created</p></div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:-translate-y-0.5 transition-all"><Plus className="w-4 h-4" /> Create QR Code</button>
      </div>
      {showNew && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">New QR Code</h3><button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div>
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Table Top QR" />
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Type</label><select value={form.qr_type} onChange={(e) => setForm({ ...form, qr_type: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500"><option value="review">Review Page</option><option value="menu">Menu</option><option value="custom">Custom URL</option></select></div>
          <Field label="Destination URL (optional)" value={form.destination_url} onChange={(v) => setForm({ ...form, destination_url: v })} placeholder="https://..." />
          <button onClick={handleCreate} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:-translate-y-0.5 transition-all"><Save className="w-4 h-4" /> Create</button>
        </div>
      )}
      {qrCodes.length === 0 ? <div className="glass-card rounded-2xl p-12 text-center"><QrCodeIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No QR codes yet. Create one to track scans!</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {qrCodes.map((qr) => (
            <div key={qr.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3"><div><h3 className="text-sm font-bold text-white">{qr.name}</h3><span className="text-xs text-slate-500">{qr.qr_type}</span></div><button onClick={() => handleDelete(qr.id)} className="p-2 rounded-lg glass text-error-400 hover:bg-error-500/10 transition-all"><Trash2 className="w-4 h-4" /></button></div>
              <div className="flex items-center gap-2 mb-3"><code className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-primary-300 text-xs truncate">{qr.destination_url}</code><button onClick={() => copyUrl(qr.destination_url)} className="p-2 rounded-lg glass text-slate-300 hover:text-white"><Copy className="w-4 h-4" /></button></div>
              <div className="flex items-center gap-4 text-xs text-slate-400"><span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {qr.scan_count} scans</span><span className={`px-2 py-0.5 rounded-full ${qr.status === "active" ? "bg-success-500/15 text-success-400" : "bg-slate-700 text-slate-400"}`}>{qr.status}</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AutomationTab({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", trigger_type: "low_rating", action_type: "send_sms", delay_hours: 1 });
  const load = useCallback(async () => { try { const { data } = await supabase.from("automation_rules").select("*").eq("business_id", businessId).order("created_at", { ascending: false }); setRules((data || []) as AutomationRule[]); } catch {} setLoading(false); }, [businessId]);
  useEffect(() => { load(); }, [load]);
  const handleCreate = async () => {
    if (!form.name) { showToast("Name is required", "error"); return; }
    try { const { error } = await supabase.from("automation_rules").insert({ business_id: businessId, name: form.name, trigger_type: form.trigger_type, trigger_config: {}, action_type: form.action_type, action_config: {}, delay_hours: form.delay_hours, status: "active", trigger_count: 0 }); if (error) throw error; showToast("Automation rule created!", "success"); setShowNew(false); setForm({ name: "", trigger_type: "low_rating", action_type: "send_sms", delay_hours: 1 }); load(); } catch { showToast("Failed to create rule", "error"); }
  };
  const handleToggle = async (r: AutomationRule) => { try { await supabase.from("automation_rules").update({ status: r.status === "active" ? "paused" : "active" }).eq("id", r.id); load(); } catch {} };
  const handleDelete = async (id: string) => { try { await supabase.from("automation_rules").delete().eq("id", id); showToast("Rule deleted", "success"); load(); } catch { showToast("Failed to delete", "error"); } };
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-6 screen-enter">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white mb-1">Automation Rules</h1><p className="text-slate-400 text-sm">{rules.length} rules configured</p></div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:-translate-y-0.5 transition-all"><Plus className="w-4 h-4" /> Add Rule</button>
      </div>
      {showNew && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">New Automation Rule</h3><button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div>
          <Field label="Rule Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Alert on low rating" />
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Trigger</label><select value={form.trigger_type} onChange={(e) => setForm({ ...form, trigger_type: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500"><option value="low_rating">Low Rating (1-3 stars)</option><option value="high_rating">High Rating (4-5 stars)</option><option value="new_review">Any New Review</option></select></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Action</label><select value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500"><option value="send_sms">Send SMS Alert</option><option value="send_email">Send Email</option><option value="webhook">Trigger Webhook</option></select></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Delay (hours)</label><input type="number" value={form.delay_hours} onChange={(e) => setForm({ ...form, delay_hours: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500" /></div>
          <button onClick={handleCreate} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:-translate-y-0.5 transition-all"><Save className="w-4 h-4" /> Create Rule</button>
        </div>
      )}
      {rules.length === 0 ? <div className="glass-card rounded-2xl p-12 text-center"><Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No automation rules yet. Create one to automate responses!</p></div> : (
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className="glass rounded-xl p-4 border border-white/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1"><span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300">{r.trigger_type}</span><span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-300">{r.action_type}</span><span className="text-xs text-slate-500">Delay: {r.delay_hours}h</span></div>
                  <h3 className="text-sm font-semibold text-white">{r.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">Triggered {r.trigger_count} times{r.last_triggered_at ? ` - Last: ${new Date(r.last_triggered_at).toLocaleDateString()}` : ""}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleToggle(r)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${r.status === "active" ? "bg-success-500/15 text-success-400" : "bg-slate-700 text-slate-400"}`}>{r.status === "active" ? "Active" : "Paused"}</button>
                  <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg glass text-error-400 hover:bg-error-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ business, onUpdate }: { business: Business; onUpdate: (b: Business) => void }) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: business.name, welcome_message: business.welcome_message, google_place_id: business.google_place_id || "", public_review_enabled: business.public_review_enabled, business_category: business.business_category || "", contact_email: business.contact_email || "", contact_phone: business.contact_phone || "", location_city: business.location_city || "" });
  const handleSave = async () => {
    try {
      const { error } = await supabase.from("businesses").update({ name: form.name, welcome_message: form.welcome_message, google_place_id: form.google_place_id || null, public_review_enabled: form.public_review_enabled, business_category: form.business_category || null, contact_email: form.contact_email || null, contact_phone: form.contact_phone || null, location_city: form.location_city || null }).eq("id", business.id);
      if (error) throw error;
      onUpdate({ ...business, ...form, google_place_id: form.google_place_id || null, business_category: form.business_category || null, contact_email: form.contact_email || null, contact_phone: form.contact_phone || null, location_city: form.location_city || null });
      setEditing(false); showToast("Settings saved successfully!", "success");
    } catch { showToast("Failed to save settings", "error"); }
  };
  const copyReviewLink = () => { const url = `${window.location.origin}/#/review/${business.slug}`; navigator.clipboard.writeText(url); showToast("Review link copied!", "success"); };
  return (
    <div className="space-y-6 screen-enter">
      <div><h1 className="text-2xl font-bold text-white mb-1">Business Settings</h1><p className="text-slate-400 text-sm">Configure your review flow and business profile</p></div>
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <Field label="Business Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} disabled={!editing} />
        <Field label="Welcome Message" value={form.welcome_message} onChange={(v) => setForm({ ...form, welcome_message: v })} disabled={!editing} textarea />
        <Field label="Google Place ID" value={form.google_place_id} onChange={(v) => setForm({ ...form, google_place_id: v })} disabled={!editing} hint="Used for: search.google.com/local/writereview?placeid=..." />
        <Field label="Business Category" value={form.business_category} onChange={(v) => setForm({ ...form, business_category: v })} disabled={!editing} placeholder="e.g. Restaurant, Cafe, Salon" />
        <Field label="Contact Email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} disabled={!editing} placeholder="owner@business.com" />
        <Field label="Contact Phone" value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} disabled={!editing} placeholder="+1 234 567 890" />
        <Field label="Location City" value={form.location_city} onChange={(v) => setForm({ ...form, location_city: v })} disabled={!editing} placeholder="Mumbai" />
        <div className="flex items-center gap-3"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.public_review_enabled} onChange={(e) => setForm({ ...form, public_review_enabled: e.target.checked })} disabled={!editing} className="w-5 h-5 rounded accent-primary-500" /><span className="text-sm text-slate-300">Public review flow enabled</span></label></div>
        <div className="flex gap-3 pt-2">
          {editing ? (<><button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium hover:-translate-y-0.5 transition-all">Save Changes</button><button onClick={() => { setEditing(false); setForm({ name: business.name, welcome_message: business.welcome_message, google_place_id: business.google_place_id || "", public_review_enabled: business.public_review_enabled, business_category: business.business_category || "", contact_email: business.contact_email || "", contact_phone: business.contact_phone || "", location_city: business.location_city || "" }); }} className="px-6 py-2.5 rounded-xl glass text-slate-300 text-sm font-medium hover:bg-white/5">Cancel</button></>) : (<button onClick={() => setEditing(true)} className="px-6 py-2.5 rounded-xl glass text-white text-sm font-medium hover:bg-white/5 transition-all">Edit Settings</button>)}
        </div>
      </div>
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><QrCodeIcon className="w-5 h-5 text-primary-400" /> Review Link</h3>
        <div className="flex items-center gap-3"><code className="flex-1 px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-primary-300 text-sm truncate">{window.location.origin}/#/review/{business.slug}</code><button onClick={copyReviewLink} className="px-4 py-3 rounded-xl glass text-white hover:bg-white/10 transition-all"><Copy className="w-4 h-4" /></button></div>
        <a href={`#/review/${business.slug}`} className="mt-3 inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"><ExternalLink className="w-4 h-4" /> Open public review page</a>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: string; color: string; bg: string }) {
  return <div className="stat-card glass-card rounded-2xl p-5"><div className="flex items-center justify-between mb-3"><div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color}`}>{icon}</div></div><p className="text-2xl font-bold text-white">{value}</p><p className="text-xs text-slate-400 mt-1">{label}</p></div>;
}

function ReviewRow({ review, expanded }: { review: ReviewSession; expanded?: boolean }) {
  const colors = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#a855f7"];
  const c = colors[review.rating - 1] || "#6366f1";
  return (
    <div className="glass rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-1 shrink-0">{[1,2,3,4,5].map((s) => <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "fill-current" : ""}`} style={{ color: s <= review.rating ? c : "#334155" }} />)}</div>
        <div className="flex-1 min-w-0">
          {review.ai_generated_review && <p className={`text-sm text-slate-300 ${expanded ? "" : "line-clamp-2"}`}>"{review.ai_generated_review}"</p>}
          <div className="flex items-center gap-3 mt-1.5"><span className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span><span className={`text-xs px-2 py-0.5 rounded-full ${review.ai_status === "completed" ? "bg-success-500/15 text-success-400" : "bg-amber-500/15 text-amber-400"}`}>{review.ai_status}</span></div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, textarea, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; textarea?: boolean; hint?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      {textarea ? <textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} rows={2} placeholder={placeholder} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 disabled:opacity-60 resize-none" /> : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-white/10 text-white text-sm focus:outline-none focus:border-primary-500 disabled:opacity-60" />}
      {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
}
