import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import QRCode from "qrcode";
import { supabase } from "../../lib/supabase";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { Avatar } from "../../components/Avatar";
import { useToast } from "../../components/Toast";
import { Modal, ConfirmDialog } from "../../components/Modal";
import { timeAgo, cacheBustUrl } from "../../lib/utils";
import type { Business, Question, ReviewSession, FlowType } from "../../lib/types";

type Tab = "overview" | "questions" | "reviews" | "qr" | "analytics" | "settings";

export function PartnerBusinessDetail() {
  const { businessId } = useParams<{ businessId: string }>();
  const { toast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Business>>({});
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [qEditorOpen, setQEditorOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [qForm, setQForm] = useState<{ question_text: string; flow_type: FlowType; options: string[]; is_required: boolean }>({ question_text: "", flow_type: "ALWAYS", options: [], is_required: true });
  const [optionInput, setOptionInput] = useState("");
  const [deleteQOpen, setDeleteQOpen] = useState<Question | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const loadData = async () => {
    if (!businessId) return;
    setLoading(true);
    const { data: biz, error: bizErr } = await supabase.from("businesses").select("*").eq("id", businessId).maybeSingle();
    if (bizErr || !biz) { setError("Business not found"); setLoading(false); return; }
    setBusiness(biz as Business); setEditForm(biz as Business);
    const [qRes, rRes, aRes] = await Promise.all([
      supabase.from("questions").select("*").eq("business_id", businessId).order("sort_order", { ascending: true }),
      supabase.from("review_sessions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(20),
      supabase.from("analytics_events").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
    ]);
    setQuestions((qRes.data as Question[]) || []);
    setReviews((rRes.data as ReviewSession[]) || []);
    setAnalytics(aRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [businessId]);

  useEffect(() => {
    if (tab === "qr" && business && qrCanvasRef.current) {
      const url = `${window.location.origin}/r/${business.slug}`;
      QRCode.toCanvas(qrCanvasRef.current, url, { width: 256, margin: 2, color: { dark: "#0a0a0f", light: "#ffffff" } }, () => {});
      QRCode.toDataURL(url, { width: 512, margin: 2 }).then(setQrUrl).catch(() => {});
    }
  }, [tab, business]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("businesses").update({ name: editForm.name, welcome_message: editForm.welcome_message, primary_color: editForm.primary_color, secondary_color: editForm.secondary_color, google_place_id: editForm.google_place_id, google_review_url: editForm.google_review_url, public_review_enabled: editForm.public_review_enabled }).eq("id", businessId);
    if (error) toast(error.message, "error"); else { toast("Business updated", "success"); setEditing(false); loadData(); }
    setSaving(false);
  };

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    const path = `businesses/${businessId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("business-logos").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { toast(upErr.message, "error"); setLogoUploading(false); return; }
    const { data: pub } = supabase.storage.from("business-logos").getPublicUrl(path);
    const { error: updErr } = await supabase.from("businesses").update({ logo_url: pub.publicUrl }).eq("id", businessId);
    if (updErr) toast(updErr.message, "error"); else { toast("Logo updated instantly", "success"); loadData(); }
    setLogoUploading(false);
  };

  const handleToggleStatus = async () => {
    const newStatus = business?.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("businesses").update({ status: newStatus }).eq("id", businessId);
    if (error) toast(error.message, "error"); else { toast(`Business ${newStatus}`, "success"); setDeactivateOpen(false); loadData(); }
  };

  const downloadQr = () => { if (!qrUrl) return; const a = document.createElement("a"); a.href = qrUrl; a.download = `${business?.slug}-qr.png`; a.click(); };

  const openNewQ = () => { setEditingQ(null); setQForm({ question_text: "", flow_type: "ALWAYS", options: [], is_required: true }); setOptionInput(""); setQEditorOpen(true); };
  const openEditQ = (q: Question) => { setEditingQ(q); setQForm({ question_text: q.question_text, flow_type: q.flow_type, options: q.options, is_required: q.is_required }); setOptionInput(""); setQEditorOpen(true); };
  const addOption = () => { if (optionInput.trim()) { setQForm({ ...qForm, options: [...qForm.options, optionInput.trim()] }); setOptionInput(""); } };
  const removeOption = (idx: number) => { setQForm({ ...qForm, options: qForm.options.filter((_, i) => i !== idx) }); };

  const handleSaveQ = async () => {
    if (!qForm.question_text.trim()) { toast("Question text is required", "error"); return; }
    if (qForm.options.length === 0) { toast("Add at least one option", "error"); return; }
    setSaving(true);
    const payload = { business_id: businessId, question_text: qForm.question_text, question_type: "multiple_choice", flow_type: qForm.flow_type, options: qForm.options, is_required: qForm.is_required, is_active: true, sort_order: editingQ ? editingQ.sort_order : questions.length };
    if (editingQ) {
      const { error } = await supabase.from("questions").update(payload).eq("id", editingQ.id);
      if (error) toast(error.message, "error"); else toast("Question updated", "success");
    } else {
      const { error } = await supabase.from("questions").insert(payload);
      if (error) toast(error.message, "error"); else toast("Question created", "success");
    }
    setSaving(false); setQEditorOpen(false); loadData();
  };

  const handleDeleteQ = async () => {
    if (!deleteQOpen) return;
    const { error } = await supabase.from("questions").delete().eq("id", deleteQOpen.id);
    if (error) toast(error.message, "error"); else toast("Question deleted", "success");
    setDeleteQOpen(null); loadData();
  };

  if (loading) return <Loading message="Loading business…" />;
  if (error) return <ErrorState message={error} />;
  if (!business) return <ErrorState message="Business not found" />;

  const tabs: { key: Tab; label: string }[] = [{ key: "overview", label: "Overview" }, { key: "questions", label: "Questions" }, { key: "reviews", label: "Reviews" }, { key: "qr", label: "QR Code" }, { key: "analytics", label: "Analytics" }, { key: "settings", label: "Settings" }];
  const reviewUrl = `${window.location.origin}/r/${business.slug}`;
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const googleReviewUrl = business.google_review_url_derived || business.google_review_url;
  const eventCounts = analytics.reduce((acc, e) => { acc[e.event_type] = (acc[e.event_type] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/partner/businesses" className="text-ink-400 hover:text-ink-100">←</Link>
        <Avatar src={business.logo_url ? cacheBustUrl(business.logo_url) : business.logo_url} name={business.name} size="lg" ring />
        <div className="flex-1"><h1 className="font-display text-2xl font-bold text-ink-50">{business.name}</h1><p className="text-sm text-ink-400">/{business.slug}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${business.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-ink-700 text-ink-400"}`}>{business.status}</span>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-white/5 scrollbar-thin">
        {tabs.map((t) => (<button key={t.key} onClick={() => setTab(t.key)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${tab === t.key ? "border-violet-400 text-violet-300" : "border-transparent text-ink-400 hover:text-ink-100"}`}>{t.label}</button>))}
      </div>
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card"><p className="label">Status</p><p className="text-lg font-semibold text-ink-50">{business.status}</p></div>
            <div className="card"><p className="label">Reviews</p><p className="text-lg font-semibold text-ink-50">{reviews.length}</p></div>
            <div className="card"><p className="label">Avg Rating</p><p className="text-lg font-semibold text-ink-50">{avgRating} ⭐</p></div>
            <div className="card"><p className="label">Questions</p><p className="text-lg font-semibold text-ink-50">{questions.length}</p></div>
          </div>
          <div className="card space-y-3">
            <div><p className="label">Welcome Message</p><p className="text-ink-50">{business.welcome_message}</p></div>
            <div><p className="label">ReviewFlow URL</p><a href={reviewUrl} target="_blank" rel="noreferrer" className="text-sm text-violet-400 hover:underline">{reviewUrl}</a></div>
            <div><p className="label">Google Review Destination</p>{googleReviewUrl ? <a href={googleReviewUrl} target="_blank" rel="noreferrer" className="text-sm text-violet-400 hover:underline">{googleReviewUrl}</a> : <p className="text-sm text-ink-400">Not configured</p>}</div>
          </div>
        </div>
      )}
      {tab === "questions" && (
        <div className="space-y-3">
          <div className="flex justify-end"><button className="btn-primary" onClick={openNewQ}>Add Question</button></div>
          {questions.length === 0 ? <EmptyState title="No questions" message="Add questions to gather feedback from customers." /> : questions.map((q) => (
            <div key={q.id} className="card">
              <div className="flex items-start justify-between"><div><p className="font-medium text-ink-50">{q.question_text}</p><p className="text-xs text-ink-400">{q.flow_type} · {q.is_required ? "Required" : "Optional"}</p></div><div className="flex gap-2"><button className="btn-secondary text-xs" onClick={() => openEditQ(q)}>Edit</button><button className="btn-danger text-xs" onClick={() => setDeleteQOpen(q)}>Delete</button></div></div>
              <div className="mt-2 flex flex-wrap gap-1.5">{q.options.map((o) => <span key={o} className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-ink-300">{o}</span>)}</div>
            </div>
          ))}
        </div>
      )}
      {tab === "reviews" && (
        <div className="space-y-2">
          {reviews.length === 0 ? <EmptyState title="No reviews yet" message="Reviews will appear here once customers submit them." /> : reviews.map((r) => (
            <div key={r.id} className="card">
              <div className="flex items-center justify-between"><p className="font-medium text-ink-50">{r.rating} ⭐</p><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.ai_status === "completed" ? "bg-emerald-500/15 text-emerald-300" : r.ai_status === "failed" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>{r.ai_status}</span></div>
              {r.ai_generated_review && <p className="mt-2 text-sm text-ink-300">{r.ai_generated_review.slice(0, 200)}{r.ai_generated_review.length > 200 ? "…" : ""}</p>}
              <p className="mt-2 text-xs text-ink-400">{timeAgo(r.created_at)}</p>
            </div>
          ))}
        </div>
      )}
      {tab === "qr" && (
        <div className="card flex flex-col items-center gap-4">
          <canvas ref={qrCanvasRef} className="rounded-xl" />
          <p className="text-sm text-ink-400">{reviewUrl}</p>
          <button className="btn-primary" onClick={downloadQr}>Download QR</button>
        </div>
      )}
      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(eventCounts).map(([type, count]) => (
              <div key={type} className="card"><p className="label">{type.replace(/_/g, " ")}</p><p className="text-2xl font-bold text-ink-50">{count as React.ReactNode}</p></div>
            ))}
            {Object.keys(eventCounts).length === 0 && <p className="text-sm text-ink-400">No analytics events yet.</p>}
          </div>
        </div>
      )}
      {tab === "settings" && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h3 className="font-display text-base font-semibold text-ink-50">Business Logo</h3>
            <div className="flex items-center gap-4">
              <Avatar src={business.logo_url ? cacheBustUrl(business.logo_url) : business.logo_url} name={business.name} size="xl" ring />
              <label className="btn-secondary cursor-pointer">
                {logoUploading ? "Uploading…" : "Upload Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.currentTarget.value = ""; }} disabled={logoUploading} />
              </label>
            </div>
          </div>
          <div className="card max-w-2xl space-y-4">
            <h3 className="font-display text-base font-semibold text-ink-50">Business Details</h3>
            {editing ? (
              <>
                <div><label className="label">Name</label><input className="input" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div><label className="label">Welcome Message</label><textarea className="input" rows={2} value={editForm.welcome_message || ""} onChange={(e) => setEditForm({ ...editForm, welcome_message: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="label">Primary Color</label><input type="color" className="h-10 w-full rounded-lg" value={editForm.primary_color || "#6366f1"} onChange={(e) => setEditForm({ ...editForm, primary_color: e.target.value })} /></div><div><label className="label">Secondary Color</label><input type="color" className="h-10 w-full rounded-lg" value={editForm.secondary_color || "#a855f7"} onChange={(e) => setEditForm({ ...editForm, secondary_color: e.target.value })} /></div></div>
                <div><label className="label">Google Place ID</label><input className="input" value={editForm.google_place_id || ""} onChange={(e) => setEditForm({ ...editForm, google_place_id: e.target.value })} /></div>
                <div><label className="label">Google Review URL</label><input className="input" value={editForm.google_review_url || ""} onChange={(e) => setEditForm({ ...editForm, google_review_url: e.target.value })} /></div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={editForm.public_review_enabled ?? true} onChange={(e) => setEditForm({ ...editForm, public_review_enabled: e.target.checked })} /> <span className="text-sm text-ink-200">Public review enabled</span></label>
                <div className="flex gap-3"><button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button><button className="btn-secondary" onClick={() => { setEditing(false); setEditForm(business); }}>Cancel</button></div>
              </>
            ) : (
              <>
                <div><p className="label">Welcome Message</p><p className="text-ink-50">{business.welcome_message}</p></div>
                <div><p className="label">Google Place ID</p><p className="text-ink-100">{business.google_place_id || "—"}</p></div>
                <div><p className="label">Google Review URL</p><p className="text-ink-100">{business.google_review_url || "—"}</p></div>
                <div><p className="label">Public Review Enabled</p><p className="text-ink-100">{business.public_review_enabled ? "Yes" : "No"}</p></div>
                <button className="btn-secondary" onClick={() => setEditing(true)}>Edit Business</button>
              </>
            )}
          </div>
          <div className="card border-red-500/10">
            <h3 className="mb-2 font-display text-base font-semibold text-red-400">Danger Zone</h3>
            <p className="mb-4 text-sm text-ink-400">{business.status === "active" ? "Deactivate this business. The public review page will stop working." : "Reactivate this business."}</p>
            <button className="btn-danger" onClick={() => setDeactivateOpen(true)}>{business.status === "active" ? "Deactivate" : "Reactivate"}</button>
          </div>
        </div>
      )}
      <Modal open={qEditorOpen} onClose={() => setQEditorOpen(false)} title={editingQ ? "Edit Question" : "New Question"} size="lg">
        <div className="space-y-4">
          <div><label className="label">Question Text</label><input className="input" value={qForm.question_text} onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })} /></div>
          <div><label className="label">Flow Type</label><select className="input" value={qForm.flow_type} onChange={(e) => setQForm({ ...qForm, flow_type: e.target.value as FlowType })}><option value="ALWAYS">Always show</option><option value="POSITIVE">Show for positive (4-5 stars)</option><option value="NEGATIVE">Show for negative (1-3 stars)</option></select></div>
          <div><label className="label">Options</label><div className="flex gap-2"><input className="input" value={optionInput} onChange={(e) => setOptionInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }} placeholder="Type an option and press Enter" /><button className="btn-secondary" onClick={addOption}>Add</button></div><div className="mt-2 flex flex-wrap gap-1.5">{qForm.options.map((o, i) => <span key={i} className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs text-ink-300">{o}<button onClick={() => removeOption(i)} className="text-ink-400 hover:text-red-400">×</button></span>)}</div></div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={qForm.is_required} onChange={(e) => setQForm({ ...qForm, is_required: e.target.checked })} /> <span className="text-sm text-ink-200">Required</span></label>
          <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={() => setQEditorOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleSaveQ} disabled={saving}>{saving ? "Saving…" : "Save Question"}</button></div>
        </div>
      </Modal>
      <ConfirmDialog open={deleteQOpen !== null} onClose={() => setDeleteQOpen(null)} onConfirm={handleDeleteQ} title="Delete Question?" message="This will remove the question from the review flow." confirmLabel="Delete" danger />
      <ConfirmDialog open={deactivateOpen} onClose={() => setDeactivateOpen(false)} onConfirm={handleToggleStatus} title={business.status === "active" ? "Deactivate Business?" : "Reactivate Business?"} message={business.status === "active" ? "The public review page will stop working." : "The public review page will resume working."} confirmLabel={business.status === "active" ? "Deactivate" : "Reactivate"} danger={business.status === "active"} />
    </div>
  );
}
