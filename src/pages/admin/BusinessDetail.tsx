import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import type { Business, Question, ReviewSession } from "../../lib/types";
import { Loading, ErrorState, EmptyState } from "../../components/States";
import { formatDateTime } from "../../lib/utils";
import { useQRCode, downloadQR } from "../../lib/qr";

export default function AdminBusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const reviewUrl = business ? `${window.location.origin}/r/${business.slug}` : null;
  const qrUrl = useQRCode(reviewUrl);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("businesses").select("*").eq("id", id).single(),
      supabase.from("questions").select("*").eq("business_id", id).order("sort_order"),
      supabase.from("review_sessions").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(20),
    ]).then(([b, q, r]) => {
      setBusiness(b.data as Business);
      setQuestions((q.data || []) as Question[]);
      setReviews((r.data || []) as ReviewSession[]);
      setLoading(false);
    });
  }, [id]);

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
          <dl className="space-y-2 text-sm">
            <div><dt className="text-slate-500">Welcome Message</dt><dd className="text-white">{business.welcome_message}</dd></div>
            <div><dt className="text-slate-500">Google Review URL</dt><dd className="text-white truncate">{business.google_review_url || "—"}</dd></div>
            <div><dt className="text-slate-500">Public Reviews</dt><dd className="text-white">{business.public_review_enabled ? "Enabled" : "Disabled"}</dd></div>
          </dl>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">ReviewFlow QR Code</h3>
          {qrUrl && <img src={qrUrl} alt="QR Code" className="w-48 h-48 rounded-xl mb-4" />}
          <p className="text-xs text-slate-500 mb-3 break-all">{reviewUrl}</p>
          {qrUrl && <button onClick={() => downloadQR(qrUrl, `${business.slug}-qr.png`)} className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Download QR</button>}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-400 mb-4">Questions ({questions.length})</h3>
          {questions.length === 0 ? <p className="text-slate-500 text-sm">No questions configured</p> : (
            <div className="space-y-2">
              {questions.map((q) => (
                <div key={q.id} className="text-sm"><p className="text-white">{q.question_text}</p><p className="text-xs text-slate-500">{q.flow_type} • {q.options.length} options</p></div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="glass rounded-2xl p-6 mt-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Recent Reviews</h3>
        {reviews.length === 0 ? <EmptyState title="No reviews yet" /> : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="flex items-start gap-4 border-b border-white/5 pb-3 last:border-0">
                <div className="text-2xl">{"\u2B50".repeat(r.rating)}</div>
                <div className="flex-1">
                  {r.ai_generated_review && <p className="text-sm text-slate-300">{r.ai_generated_review.slice(0, 150)}{r.ai_generated_review.length > 150 ? "..." : ""}</p>}
                  <p className="text-xs text-slate-500 mt-1">{formatDateTime(r.created_at)} • {r.ai_status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
