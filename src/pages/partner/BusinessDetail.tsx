import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { Business, Question, ReviewSession } from "../../lib/types";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { insertAuditLog } from "../../lib/auth";
import { uploadBusinessLogo } from "../../lib/storage";
import { useQRCode, downloadQR } from "../../lib/qr";
import { formatDateTime } from "../../lib/utils";

export default function PartnerBusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", welcome_message: "", google_review_url: "", public_review_enabled: true });
  const logoRef = useRef<HTMLInputElement>(null);
  const reviewUrl = business ? `${window.location.origin}/r/${business.slug}` : null;
  const qrUrl = useQRCode(reviewUrl);

  const load = () => {
    if (!id || !profile) return;
    Promise.all([
      supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).single(),
      supabase.from("businesses").select("*").eq("id", id).single(),
      supabase.from("questions").select("*").eq("business_id", id).order("sort_order"),
      supabase.from("review_sessions").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(20),
    ]).then(([mem, b, q, r]) => {
      const businessData = b.data as Business;
      const memberOrg = mem.data?.organization_id;
      if (!businessData || businessData.organization_id !== memberOrg) {
        setBusiness(null);
        setLoading(false);
        return;
      }
      setBusiness(businessData);
      setQuestions((q.data || []) as Question[]);
      setReviews((r.data || []) as ReviewSession[]);
      setEditForm({ name: businessData.name, welcome_message: businessData.welcome_message, google_review_url: businessData.google_review_url || "", public_review_enabled: businessData.public_review_enabled });
      setLoading(false);
    });
  };
  useEffect(() => { if (profile) load(); }, [id, profile]);

  const saveEdit = async () => {
    if (!business || !profile) return;
    const { error } = await supabase.from("businesses").update({
      name: editForm.name, welcome_message: editForm.welcome_message, google_review_url: editForm.google_review_url || null, public_review_enabled: editForm.public_review_enabled,
    }).eq("id", business.id);
    if (error) { showToast("Failed to save", "error"); return; }
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "business_updated", target_type: "business", target_id: business.id });
    showToast("Business updated", "success");
    setEditing(false); load();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business) return;
    const url = await uploadBusinessLogo(business.id, file);
    if (url) {
      await supabase.from("businesses").update({ logo_url: url }).eq("id", business.id);
      if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "business_logo_updated", target_type: "business", target_id: business.id });
      showToast("Logo updated", "success"); load();
    } else { showToast("Upload failed", "error"); }
    if (logoRef.current) logoRef.current.value = "";
  };

  if (loading) return <Layout title="Business"><Loading /></Layout>;
  if (!business) return <Layout title="Business"><ErrorState message="Business not found" /></Layout>;

  return (
    <Layout title={business.name}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            {business.logo_url ? <img src={business.logo_url} alt={business.name} className="w-14 h-14 rounded-xl object-cover" /> : <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">{business.name[0]}</div>}
            <div><h2 className="text-lg font-bold text-white">{business.name}</h2><p className="text-sm text-slate-400">{business.status}</p></div>
          </div>
          {editing ? (
            <div className="space-y-3">
              <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" />
              <textarea value={editForm.welcome_message} onChange={(e) => setEditForm((f) => ({ ...f, welcome_message: e.target.value }))} className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" rows={2} />
              <input value={editForm.google_review_url} onChange={(e) => setEditForm((f) => ({ ...f, google_review_url: e.target.value }))} placeholder="Google Review URL" className="w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm" />
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editForm.public_review_enabled} onChange={(e) => setEditForm((f) => ({ ...f, public_review_enabled: e.target.checked }))} /> Public reviews enabled</label>
              <div className="flex gap-2"><button onClick={saveEdit} className="flex-1 py-2 bg-primary-600 text-white text-sm rounded-lg">Save</button><button onClick={() => setEditing(false)} className="flex-1 py-2 glass text-white text-sm rounded-lg">Cancel</button></div>
            </div>
          ) : (
            <div>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-slate-500">Welcome Message</dt><dd className="text-white">{business.welcome_message}</dd></div>
                <div><dt className="text-slate-500">Google Review URL</dt><dd className="text-white truncate">{business.google_review_url || "—"}</dd></div>
                <div><dt className="text-slate-500">Public Reviews</dt><dd className="text-white">{business.public_review_enabled ? "Enabled" : "Disabled"}</dd></div>
              </dl>
              <button onClick={() => setEditing(true)} className="mt-4 w-full py-2 glass text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors">Edit</button>
            </div>
          )}
          <div className="mt-4">
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer" />
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">ReviewFlow QR</h3>
          {qrUrl && <img src={qrUrl} alt="QR" className="w-48 h-48 rounded-xl mb-4" />}
          <p className="text-xs text-slate-500 mb-3 break-all">{reviewUrl}</p>
          {qrUrl && <button onClick={() => downloadQR(qrUrl, `${business.slug}-qr.png`)} className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Download QR</button>}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Questions ({questions.length})</h3>
          {questions.length === 0 ? <p className="text-slate-500 text-sm">No questions</p> : (
            <div className="space-y-2">{questions.map((q) => <div key={q.id}><p className="text-sm text-white">{q.question_text}</p><p className="text-xs text-slate-500">{q.flow_type} • {q.options.length} options</p></div>)}</div>
          )}
        </div>
      </div>
      <div className="glass rounded-2xl p-6 mt-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Recent Reviews</h3>
        {reviews.length === 0 ? <EmptyState title="No reviews yet" /> : (
          <div className="space-y-3">{reviews.map((r) => (
            <div key={r.id} className="flex items-start gap-4 border-b border-white/5 pb-3 last:border-0">
              <div className="text-2xl">{"\u2B50".repeat(r.rating)}</div>
              <div className="flex-1">{r.ai_generated_review && <p className="text-sm text-slate-300">{r.ai_generated_review.slice(0, 150)}...</p>}<p className="text-xs text-slate-500 mt-1">{formatDateTime(r.created_at)} • {r.ai_status}</p></div>
            </div>
          ))}</div>
        )}
      </div>
    </Layout>
  );
}
