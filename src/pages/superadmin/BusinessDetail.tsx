import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { PageHeader, Card, Badge } from "../../components/Shell";
import { useToast } from "../../context/ToastContext";
import { logAudit } from "../../lib/audit";
import { uploadBusinessLogo } from "../../lib/storage";
import { QRCodeImage } from "../../components/QRCode";
import type { Business, Question, ReviewSession } from "../../lib/types";

export default function SuperAdminBusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [welcome, setWelcome] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [publicEnabled, setPublicEnabled] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: b } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle();
    setBusiness(b as Business | null);
    if (b) { setName((b as Business).name); setWelcome((b as Business).welcome_message ?? ""); setGooglePlaceId((b as Business).google_place_id ?? ""); setPublicEnabled((b as Business).public_review_enabled); }
    const { data: qs } = await supabase.from("questions").select("*").eq("business_id", id).order("sort_order");
    setQuestions((qs as Question[]) || []);
    const { data: rs } = await supabase.from("review_sessions").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(20);
    setReviews((rs as ReviewSession[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const save = async () => {
    const { error } = await supabase.from("businesses").update({ name, welcome_message: welcome, google_place_id: googlePlaceId, public_review_enabled: publicEnabled, updated_at: new Date().toISOString() }).eq("id", id!);
    if (error) { show("Save failed", "error"); return; }
    await logAudit("business.update", "business", id!);
    show("Business updated", "success"); load();
  };

  const uploadLogo = async (file: File) => {
    const { url, error } = await uploadBusinessLogo(id!, file);
    if (error || !url) { show("Upload failed", "error"); return; }
    const { error: uErr } = await supabase.from("businesses").update({ logo_url: url }).eq("id", id!);
    if (uErr) { show("Failed to save", "error"); return; }
    await logAudit("business.logo.update", "business", id!);
    show("Logo updated", "success"); load();
  };

  const reviewUrl = business ? `${window.location.origin}/r/${business.slug}` : "";
  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!business) return <div className="p-8 text-rose-400">Business not found.</div>;

  return (
    <div>
      <PageHeader title={business.name} subtitle={`/r/${business.slug}`} />
      <div className="p-8 grid lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-white font-semibold mb-4">Business details</h3>
          <div className="flex items-center gap-4 mb-4">
            {business.logo_url ? <img src={business.logo_url} alt={business.name} className="h-16 w-16 rounded-xl object-cover" /> : <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-2xl">{business.name.slice(0, 1)}</div>}
            <label className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium cursor-pointer">Change logo<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} /></label>
          </div>
          <div className="space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
            <textarea value={welcome} onChange={(e) => setWelcome(e.target.value)} placeholder="Welcome message" rows={2} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
            <input value={googlePlaceId} onChange={(e) => setGooglePlaceId(e.target.value)} placeholder="Google Place ID" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
            <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={publicEnabled} onChange={(e) => setPublicEnabled(e.target.checked)} /> Public review enabled</label>
            <button onClick={save} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">Save changes</button>
          </div>
        </Card>
        <Card>
          <h3 className="text-white font-semibold mb-4">ReviewFlow QR & public link</h3>
          <div className="flex flex-col items-center gap-3"><QRCodeImage text={reviewUrl} size={200} /><p className="text-slate-400 text-xs break-all">{reviewUrl}</p><a href={reviewUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium">Open review page</a></div>
        </Card>
        <Card>
          <h3 className="text-white font-semibold mb-4">Questions ({questions.length})</h3>
          <div className="space-y-2">
            {questions.map((q) => (
              <div key={q.id} className="px-3 py-2 rounded-lg bg-slate-800/50">
                <p className="text-white text-sm">{q.question_text}</p>
                <p className="text-slate-400 text-xs">{q.flow_type} · {q.question_type} · {q.is_active ? "active" : "inactive"}</p>
                {q.options && q.options.length > 0 && <p className="text-slate-500 text-xs mt-1">Options: {q.options.join(", ")}</p>}
              </div>
            ))}
            {questions.length === 0 && <p className="text-slate-500 text-sm">No questions configured.</p>}
          </div>
        </Card>
        <Card>
          <h3 className="text-white font-semibold mb-4">Recent reviews ({reviews.length})</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {reviews.map((r) => (
              <div key={r.id} className="px-3 py-2 rounded-lg bg-slate-800/50">
                <div className="flex items-center justify-between"><span className="text-amber-400 text-sm">{"★".repeat(r.rating)}</span><Badge color={r.ai_status === "completed" ? "green" : "amber"}>{r.ai_status}</Badge></div>
                {r.ai_generated_review && <p className="text-slate-300 text-xs mt-1 line-clamp-2">{r.ai_generated_review}</p>}
              </div>
            ))}
            {reviews.length === 0 && <p className="text-slate-500 text-sm">No reviews yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
