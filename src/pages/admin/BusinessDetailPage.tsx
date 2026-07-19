// Business detail — tabs: overview, questions, sessions, analytics, admins. Includes QR code.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getBusiness, publicReviewUrl, updateBusiness } from "../../lib/business";
import { listQuestions, createQuestion, updateQuestion, deleteQuestion } from "../../lib/questions";
import { listSessions } from "../../lib/sessions";
import { listBusinessAdminsRemote, createBusinessAdmin, removeBusinessAdmin } from "../../lib/admins";
import { generateQRDataUrl, downloadQRCode } from "../../lib/qr";
import {
  getDashboardMetrics,
  getRatingDistribution,
  getSessionsOverTime,
  getSentimentSplit,
  getTopCategories,
  getEventCounts,
} from "../../lib/analytics";
import type { Business, Question, ReviewSession, BusinessAdmin } from "../../types";
import { Button, Card, Input, Textarea, Select, Badge, Loading, EmptyState, Modal } from "../../components/ui";
import { AreaChart, BarChart, DonutChart, BarList } from "../../components/charts";
import { Copy, Check, Download, QrCode, Plus, Pencil, Trash2, ExternalLink, Users, HelpCircle, MessageSquareText, BarChart3, Store, Star, Sparkles, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Tab = "overview" | "questions" | "sessions" | "analytics" | "admins";

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const biz = await getBusiness(id);
        if (!mounted) return;
        setBusiness(biz);
        if (biz) {
          const url = publicReviewUrl(biz.slug);
          generateQRDataUrl(url, 512).then(setQrUrl).catch(() => {});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <Loading label="Loading business..." />;
  if (!business) return <Card className="p-8"><EmptyState title="Business not found" /></Card>;

  const reviewUrl = publicReviewUrl(business.slug);

  async function copyReviewUrl() {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Store className="w-4 h-4" /> },
    { id: "questions", label: "Questions", icon: <HelpCircle className="w-4 h-4" /> },
    { id: "sessions", label: "Sessions", icon: <MessageSquareText className="w-4 h-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "admins", label: "Admins", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${business.primary_color || "#6366f1"}, ${business.secondary_color || "#a855f7"})` }}>
            {business.logo_url ? (
              <img src={business.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Store className="w-7 h-7 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{business.name}</h1>
            <p className="text-sm text-slate-400">/r/{business.slug} · <Badge color={business.status === "active" ? "green" : "slate"}>{business.status}</Badge></p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 -mb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              tab === t.id
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab business={business} reviewUrl={reviewUrl} copied={copied} copyReviewUrl={copyReviewUrl} qrUrl={qrUrl} onDownloadQr={() => downloadQRCode(reviewUrl, `${business.slug}-qr.png`, 1024)} />
      )}
      {tab === "questions" && <QuestionsTab businessId={business.id} />}
      {tab === "sessions" && <SessionsTab businessId={business.id} />}
      {tab === "analytics" && <AnalyticsTab businessId={business.id} />}
      {tab === "admins" && <AdminsTab businessId={business.id} />}
    </div>
  );
}

function OverviewTab({ business, reviewUrl, copied, copyReviewUrl, qrUrl, onDownloadQr }: {
  business: Business; reviewUrl: string; copied: boolean; copyReviewUrl: () => void; qrUrl: string; onDownloadQr: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="p-5 lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Business information</h2>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Name" value={business.name} />
          <Field label="Slug" value={`/r/${business.slug}`} />
          <Field label="Status" value={business.status} />
          <Field label="Public reviews" value={business.public_review_enabled ? "Enabled" : "Disabled"} />
          <Field label="Google Place ID" value={business.google_place_id || "—"} />
          <Field label="Google Maps URL" value={business.google_maps_url || "—"} link={business.google_maps_url || undefined} />
          <Field label="Auto-generated Google Review URL" value={business.google_review_url_derived || "—"} link={business.google_review_url_derived || undefined} />
          <Field label="Legacy Google Review URL" value={business.google_review_url || "—"} link={business.google_review_url || undefined} />
          <Field label="Welcome message" value={business.welcome_message || "—"} />
          <Field label="Primary color" value={business.primary_color || "—"} />
          <Field label="Secondary color" value={business.secondary_color || "—"} />
        </dl>
        {business.google_review_url_derived && (
          <a
            href={business.google_review_url_derived}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
          >
            <ExternalLink className="w-4 h-4" />
            Test Google Review Link
          </a>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-white">Public review URL & QR</h2>
        <div className="rounded-xl bg-slate-950/60 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-200 break-all">{reviewUrl}</div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={copyReviewUrl}>
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy URL</>}
          </Button>
          <a href={reviewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 transition">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        {qrUrl && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="rounded-2xl bg-white p-3">
              <img src={qrUrl} alt="QR code" className="w-44 h-44" />
            </div>
            <Button size="sm" variant="outline" onClick={onDownloadQr}><Download className="w-3.5 h-3.5" /> Download PNG</Button>
            <p className="text-xs text-slate-500 text-center">Points to your RootNova ReviewFlow URL — change the flow later without reprinting.</p>
          </div>
        )}
      </Card>

      {editing && (
        <EditBusinessModal business={business} onClose={() => setEditing(false)} onSaved={(b) => { setEditing(false); window.location.reload(); }} />
      )}
    </div>
  );
}

function Field({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</dt>
      <dd className="mt-0.5 text-slate-200 break-words">
        {link ? <a href={link} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">{value}</a> : value}
      </dd>
    </div>
  );
}

function EditBusinessModal({ business, onClose, onSaved }: { business: Business; onClose: () => void; onSaved: (b: Business) => void }) {
  const [name, setName] = useState(business.name);
  const [welcomeMessage, setWelcomeMessage] = useState(business.welcome_message || "");
  const [logoUrl, setLogoUrl] = useState(business.logo_url || "");
  const [primaryColor, setPrimaryColor] = useState(business.primary_color || "#6366f1");
  const [secondaryColor, setSecondaryColor] = useState(business.secondary_color || "#a855f7");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(business.google_maps_url || "");
  const [googlePlaceId, setGooglePlaceId] = useState(business.google_place_id || "");
  const [status, setStatus] = useState(business.status);
  const [publicReviewEnabled, setPublicReviewEnabled] = useState(business.public_review_enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!googlePlaceId.trim()) { setError("Google Place ID is required."); setSaving(false); return; }
      const updated = await updateBusiness(business.id, {
        name, welcome_message: welcomeMessage, logo_url: logoUrl || null,
        primary_color: primaryColor, secondary_color: secondaryColor,
        google_review_url: null, google_maps_url: googleMapsUrl || null,
        google_place_id: googlePlaceId || null, status, public_review_enabled: publicReviewEnabled,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit business" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Business name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Welcome message" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} />
        <Input label="Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
        <div className="grid grid-cols-2 gap-4">
          <ColorInput label="Primary color" value={primaryColor} onChange={setPrimaryColor} />
          <ColorInput label="Secondary color" value={secondaryColor} onChange={setSecondaryColor} />
        </div>
        <Input label="Google Place ID (required)" required value={googlePlaceId} onChange={(e) => setGooglePlaceId(e.target.value)} hint="The review URL is generated automatically from this." placeholder="ChIJ..." />
        <Input label="Google Maps / Listing URL (optional)" value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Public reviews</label>
            <label className="flex items-center gap-2 h-[42px] px-3.5 rounded-xl bg-slate-950/60 border border-slate-700 cursor-pointer">
              <input type="checkbox" checked={publicReviewEnabled} onChange={(e) => setPublicReviewEnabled(e.target.checked)} className="accent-indigo-500" />
              <span className="text-sm text-slate-300">{publicReviewEnabled ? "Enabled" : "Disabled"}</span>
            </label>
          </div>
        </div>
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-12 h-10 rounded-lg bg-transparent cursor-pointer" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 rounded-xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-slate-100" />
      </div>
    </div>
  );
}

// Questions tab
function QuestionsTab({ businessId }: { businessId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listQuestions(businessId);
      setQuestions(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [businessId]);

  async function handleDelete(q: Question) {
    if (!confirm(`Delete "${q.question_text}"?`)) return;
    try { await deleteQuestion(q.id); await load(); } catch (e) { alert(e instanceof Error ? e.message : "Delete failed"); }
  }

  if (loading) return <Loading label="Loading questions..." />;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Questions</h2>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-3.5 h-3.5" /> New question</Button>
      </div>
      {questions.length === 0 ? (
        <EmptyState icon={<HelpCircle className="w-10 h-10" />} title="No questions yet" description="Add multiple-choice questions for your review flow." />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white">{q.question_text}</p>
                    <Badge color={q.flow_type === "ALWAYS" ? "blue" : q.flow_type === "POSITIVE" ? "green" : "amber"}>{q.flow_type}</Badge>
                    {!q.is_active && <Badge color="slate">inactive</Badge>}
                    {!q.is_required && <Badge color="slate">optional</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.options.map((opt, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-300">{opt}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setEditing(q); setShowForm(true); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(q)} className="p-1.5 rounded-lg text-rose-400 hover:bg-slate-800 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <QuestionFormModal
          businessId={businessId}
          question={editing}
          sortOrder={questions.length}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </Card>
  );
}

function QuestionFormModal({ businessId, question, sortOrder, onClose, onSaved }: {
  businessId: string; question: Question | null; sortOrder: number; onClose: () => void; onSaved: () => void;
}) {
  const [questionText, setQuestionText] = useState(question?.question_text || "");
  const [flowType, setFlowType] = useState<"ALWAYS" | "POSITIVE" | "NEGATIVE">(question?.flow_type || "ALWAYS");
  const [options, setOptions] = useState<string[]>(question?.options?.length ? question.options : [""]);
  const [isRequired, setIsRequired] = useState(question?.is_required ?? true);
  const [isActive, setIsActive] = useState(question?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(i: number, val: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));
  }
  function addOption() { setOptions((prev) => [...prev, ""]); }
  function removeOption(i: number) { setOptions((prev) => prev.filter((_, idx) => idx !== i)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!questionText.trim()) { setError("Question text is required."); return; }
    if (cleanOptions.length < 2) { setError("Provide at least 2 options."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { question_text: questionText.trim(), flow_type: flowType, options: cleanOptions, is_required: isRequired, is_active: isActive, sort_order: question?.sort_order ?? sortOrder };
      if (question) await updateQuestion(question.id, payload);
      else await createQuestion(businessId, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={question ? "Edit question" : "New question"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Question text" required value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="What did you enjoy most?" />
        <Select label="Flow type" value={flowType} onChange={(e) => setFlowType(e.target.value as "ALWAYS" | "POSITIVE" | "NEGATIVE")}>
          <option value="ALWAYS">Always (shown for every rating)</option>
          <option value="POSITIVE">Positive (shown for 4-5 stars)</option>
          <option value="NEGATIVE">Negative (shown for 1-3 stars)</option>
        </Select>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">Multiple-choice options</label>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} className="flex-1 rounded-xl bg-slate-950/60 border border-slate-700 px-3.5 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                {options.length > 1 && (
                  <button type="button" onClick={() => removeOption(i)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-rose-300"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"><Plus className="w-3.5 h-3.5 inline" /> Add option</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 cursor-pointer">
            <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="accent-indigo-500" />
            <span className="text-sm text-slate-300">Required</span>
          </label>
          <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-indigo-500" />
            <span className="text-sm text-slate-300">Active</span>
          </label>
        </div>
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{question ? "Save changes" : "Create question"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function SessionsTab({ businessId }: { businessId: string }) {
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setSessions(await listSessions(businessId, 100)); } finally { setLoading(false); }
    })();
  }, [businessId]);
  if (loading) return <Loading label="Loading sessions..." />;
  if (sessions.length === 0) return <Card className="p-8"><EmptyState icon={<MessageSquareText className="w-10 h-10" />} title="No review sessions yet" /></Card>;
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-white mb-4">Review sessions</h2>
      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1 text-amber-400"><Star className="w-3.5 h-3.5 fill-amber-400" />{s.rating}</span>
                  <Badge color={s.ai_status === "completed" ? "green" : s.ai_status === "failed" ? "red" : "amber"}>{s.ai_status}</Badge>
                  <span className="text-xs text-slate-500">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</span>
                </div>
                {s.ai_generated_review ? (
                  <p className="text-sm text-slate-200">{s.ai_generated_review}</p>
                ) : (
                  <p className="text-sm text-slate-500 italic">No review generated</p>
                )}
                {Array.isArray(s.answers) && s.answers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.answers.flatMap((a) => a.selected).map((sel, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">{sel}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AnalyticsTab({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<{ totalSessions: number; averageRating: number; aiReviewsGenerated: number } | null>(null);
  const [ratings, setRatings] = useState<{ rating: number; count: number }[]>([]);
  const [overTime, setOverTime] = useState<{ date: string; count: number }[]>([]);
  const [sentiment, setSentiment] = useState<{ positive: number; neutral: number; negative: number } | null>(null);
  const [topPositive, setTopPositive] = useState<{ category: string; count: number }[]>([]);
  const [topNegative, setTopNegative] = useState<{ category: string; count: number }[]>([]);
  const [eventCounts, setEventCounts] = useState<{ copied: number; googleClicked: number } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const filters = { businessId };
      const [m, r, t, s, tp, tn, ec] = await Promise.all([
        getDashboardMetrics(filters),
        getRatingDistribution(filters),
        getSessionsOverTime(filters, 30),
        getSentimentSplit(filters),
        getTopCategories(filters, "POSITIVE"),
        getTopCategories(filters, "NEGATIVE"),
        getEventCounts(filters),
      ]);
      setMetrics(m); setRatings(r); setOverTime(t); setSentiment(s); setTopPositive(tp); setTopNegative(tn); setEventCounts(ec);
      setLoading(false);
    })();
  }, [businessId]);

  if (loading) return <Loading label="Loading analytics..." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4"><p className="text-xs text-slate-400">Total sessions</p><p className="text-2xl font-bold text-white mt-1">{metrics?.totalSessions ?? 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-400">Avg rating</p><p className="text-2xl font-bold text-white mt-1">{metrics?.averageRating?.toFixed(1) ?? "—"}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-400">AI reviews</p><p className="text-2xl font-bold text-white mt-1">{metrics?.aiReviewsGenerated ?? 0}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-400">Google clicks</p><p className="text-2xl font-bold text-white mt-1">{eventCounts?.googleClicked ?? 0}</p></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-white mb-4">Sessions over time</h2>
          <AreaChart data={overTime} />
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-white mb-4">Sentiment</h2>
          {sentiment && <DonutChart data={[{ label: "Positive", value: sentiment.positive, color: "#10b981" }, { label: "Neutral", value: sentiment.neutral, color: "#f59e0b" }, { label: "Negative", value: sentiment.negative, color: "#f43f5e" }]} />}
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5"><h2 className="font-semibold text-white mb-4">Rating distribution</h2><BarChart data={ratings.map((r) => ({ label: `${r.rating}★`, value: r.count }))} /></Card>
        <Card className="p-5"><h2 className="font-semibold text-white mb-4">Top positive</h2><BarList data={topPositive} color="#10b981" /></Card>
        <Card className="p-5"><h2 className="font-semibold text-white mb-4">Top improvements</h2><BarList data={topNegative} color="#f43f5e" /></Card>
      </div>
    </div>
  );
}

function AdminsTab({ businessId }: { businessId: string }) {
  const [admins, setAdmins] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  async function load() {
    setLoading(true);
    try { setAdmins(await listBusinessAdminsRemote(businessId)); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [businessId]);

  async function handleRemove(adminId: string) {
    if (!confirm("Remove this business admin?")) return;
    try { await removeBusinessAdmin(adminId); await load(); } catch (e) { alert(e instanceof Error ? e.message : "Remove failed"); }
  }

  if (loading) return <Loading label="Loading admins..." />;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">Business admins</h2>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-3.5 h-3.5" /> Add admin</Button>
      </div>
      {admins.length === 0 ? (
        <EmptyState icon={<Users className="w-10 h-10" />} title="No admins assigned" description="Add a business admin so they can manage this business." />
      ) : (
        <div className="space-y-2">
          {admins.map((a) => {
            const admin = a as { id: string; user_id: string; created_at: string; profiles?: { full_name: string; email: string } | null };
            return (
              <div key={admin.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div>
                  <p className="text-sm font-medium text-white">{admin.profiles?.full_name || "Unnamed"}</p>
                  <p className="text-xs text-slate-400">{admin.profiles?.email || admin.user_id}</p>
                </div>
                <button onClick={() => handleRemove(admin.id)} className="p-1.5 rounded-lg text-rose-400 hover:bg-slate-800"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>
      )}
      {showForm && (
        <AddAdminModal
          businessId={businessId}
          onClose={() => setShowForm(false)}
          onCreated={(creds) => { setCreatedCreds(creds); setShowForm(false); load(); }}
        />
      )}
      {createdCreds && (
        <Modal open onClose={() => setCreatedCreds(null)} title="Admin created" size="sm">
          <p className="text-sm text-slate-300 mb-3">Share these credentials with the business admin. They can sign in and change their password later.</p>
          <div className="space-y-2 rounded-xl bg-slate-950/60 border border-slate-700 p-3">
            <div><span className="text-xs text-slate-500">Email</span><p className="text-sm text-white font-mono">{createdCreds.email}</p></div>
            <div><span className="text-xs text-slate-500">Password</span><p className="text-sm text-white font-mono">{createdCreds.password}</p></div>
          </div>
          <Button className="mt-4 w-full" onClick={() => setCreatedCreds(null)}>Done</Button>
        </Modal>
      )}
    </Card>
  );
}

function AddAdminModal({ businessId, onClose, onCreated }: { businessId: string; onClose: () => void; onCreated: (creds: { email: string; password: string }) => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await createBusinessAdmin({ email: email.trim(), full_name: fullName.trim(), business_id: businessId, password: password || undefined });
      onCreated({ email: res.email, password: res.password || "(existing user)" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create admin");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add business admin" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Manager" />
        <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@business.com" />
        <Input label="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to auto-generate" hint="Minimum 8 characters. If the user already exists, this is ignored." />
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Create admin</Button>
        </div>
      </form>
    </Modal>
  );
}
