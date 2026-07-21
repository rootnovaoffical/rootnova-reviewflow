import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Sparkles, ArrowRight, Check, RefreshCw, Copy, ExternalLink, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import type { Business, Question } from "../lib/types";
import SpatialBackground from "../components/SpatialBackground";
import EmojiRating3D from "../components/StarRating3D";

type Stage = "loading" | "welcome" | "rating" | "questions" | "generating" | "result" | "google" | "disabled" | "error";

function withTimeout<T>(p: PromiseLike<T>, ms = 3000): Promise<T> { return Promise.race([Promise.resolve(p), new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]); }
function safeInsert(table: string, row: Record<string, unknown>) { withTimeout(supabase.from(table).insert(row).then(), 1000).catch(() => {}); }

export default function PublicReviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const { showToast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [rating, setRating] = useState(0);
  const [selectedChips, setSelectedChips] = useState<Record<string, string[]>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [regenCount, setRegenCount] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [dbQuestions, setDbQuestions] = useState<Question[]>([]);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        let query = supabase.from("businesses").select("*");
        if (slug) query = query.eq("slug", slug);
        else query = query.eq("public_review_enabled", true).eq("status", "active").limit(1);
        const { data, error } = await withTimeout(query.maybeSingle().then(), 5000);
        if (error || !data) { setStage("error"); return; }
        setBusiness(data as Business);
        if (!(data as Business).public_review_enabled) { setStage("disabled"); return; }
        setStage("welcome");
        safeInsert("analytics_events", { business_id: (data as Business).id, event_type: "page_view", metadata: { slug: slug || "default" } });
        const { data: qs } = await supabase.from("questions").select("*").eq("business_id", (data as Business).id).eq("is_active", true).order("sort_order");
        setDbQuestions((qs || []) as Question[]);
      } catch { setStage("error"); }
    };
    load();
  }, [slug]);

  const activeQuestions = dbQuestions.filter(q => q.flow_type === "ALWAYS" || (rating >= 4 && q.flow_type === "POSITIVE") || (rating <= 3 && q.flow_type === "NEGATIVE"));
  const smoothTransition = useCallback((next: Stage) => { if (transitioning) return; setTransitioning(true); if (transitionTimer.current) clearTimeout(transitionTimer.current); transitionTimer.current = setTimeout(() => { setStage(next); setTransitioning(false); }, 300); }, [transitioning]);

  const handleStart = () => { if (!business) return; smoothTransition("rating"); safeInsert("analytics_events", { business_id: business.id, event_type: "review_start", metadata: {} }); };
  const handleRatingContinue = async () => {
    if (!business || rating === 0) return;
    try {
      const { data } = await withTimeout(supabase.from("review_sessions").insert({ business_id: business.id, rating, answers: [], ai_status: "pending" }).select().single().then(), 5000);
      setSessionId(data.id);
      safeInsert("analytics_events", { business_id: business.id, session_id: data.id, event_type: "rating_submitted", metadata: { rating } });
    } catch { setSessionId(`local-${Date.now()}`); }
    setCurrentQuestionIndex(0); setSelectedChips({}); smoothTransition("questions");
  };
  const handleChipToggle = (qid: string, opt: string) => setSelectedChips((prev) => { const cur = prev[qid] || []; return { ...prev, [qid]: cur.includes(opt) ? cur.filter((i) => i !== opt) : [...cur, opt] }; });
  const isLast = currentQuestionIndex >= activeQuestions.length - 1;
  const currentQ = activeQuestions[currentQuestionIndex];
  const canProceed = currentQ ? (selectedChips[currentQ.id] || []).length > 0 : false;
  const handleNext = () => { if (!canProceed || transitioning) return; if (isLast) handleGenerate(); else setCurrentQuestionIndex((i) => i + 1); };

  const handleGenerate = async () => {
    if (!business || !sessionId) return;
    const ans = Object.entries(selectedChips).flatMap(([qid, opts]) => opts.map((o) => ({ question_id: qid, answer: o })));
    if (!sessionId.startsWith("local-")) { try { await withTimeout(supabase.from("review_sessions").update({ answers: ans }).eq("id", sessionId).then(), 4000); } catch {} }
    safeInsert("analytics_events", { business_id: business.id, session_id: sessionId, event_type: "questions_submitted", metadata: { count: ans.length } });
    smoothTransition("generating"); setTimeout(() => generateReview(sessionId, rating, ans, 0), 600);
  };

  const generateReview = async (sid: string, r: number, ans: { question_id: string; answer: string }[], regen: number) => {
    try {
      const res = await withTimeout(fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-review`, { method: "POST", headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY }, body: JSON.stringify({ sessionId: sid, rating: r, answers: ans, businessId: business?.id, businessName: business?.name, regenerate: regen }) }).then((r2) => r2.json()), 10000);
      setAiReview(res.review || "Thank you for your feedback!");
      if (!sid.startsWith("local-")) { withTimeout(supabase.from("review_sessions").update({ ai_generated_review: res.review, ai_status: "completed", completed_at: new Date().toISOString() }).eq("id", sid).then(), 4000).catch(() => {}); safeInsert("analytics_events", { business_id: business?.id, session_id: sid, event_type: "ai_completion", metadata: { regenerate: regen } }); }
    } catch { setAiReview(generateLocalReview(business?.name || "this business", r, ans)); }
    smoothTransition("result");
  };

  const handleRegenerate = () => { if (!sessionId || !business) return; const n = regenCount + 1; setRegenCount(n); setStage("generating"); const ans = Object.entries(selectedChips).flatMap(([qid, opts]) => opts.map((o) => ({ question_id: qid, answer: o }))); setTimeout(() => generateReview(sessionId, rating, ans, n), 600); };
  const handleCopy = () => { if (aiReview) navigator.clipboard.writeText(aiReview); showToast("Copied to Clipboard!", "success"); };
  const handleGooglePost = () => { if (aiReview) navigator.clipboard.writeText(aiReview); showToast("Review copied! Redirecting to Google...", "success"); const url = business?.google_review_url || (business?.google_place_id ? `https://search.google.com/local/writereview?placeid=${business.google_place_id}` : null); if (url) window.open(url, "_blank"); setStage("google"); };

  if (stage === "loading") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div></>;
  if (stage === "error") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center text-center p-4"><div className="glass-strong rounded-3xl p-10"><h1 className="text-2xl font-bold text-white mb-2">Business Not Found</h1><p className="text-slate-400">This review link is invalid.</p></div></div></>;
  if (stage === "disabled") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center text-center p-4"><div className="glass-strong rounded-3xl p-10"><h1 className="text-2xl font-bold text-white mb-2">Reviews Temporarily Disabled</h1><p className="text-slate-400">Please check back later.</p></div></div></>;

  return (
    <>
      <SpatialBackground />
      <div className="min-h-screen flex items-center justify-center p-4 py-8">
        <div className="relative w-full max-w-2xl">
          {business?.logo_url && <div className="flex justify-center mb-6"><div className="w-20 h-20 rounded-2xl p-[2px] bg-gradient-to-br from-primary-500/30 to-accent-500/30"><div className="w-full h-full bg-slate-950 rounded-[14px] overflow-hidden"><img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" /></div></div></div>}
          {stage === "welcome" && <div className="glass-card rounded-3xl p-10 text-center screen-enter"><Sparkles className="w-8 h-8 text-primary-400 animate-pulse mx-auto mb-4" /><h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-3">{business?.name}</h1><p className="text-lg text-slate-300 mb-8">{business?.welcome_message || "We'd love to hear about your experience!"}</p><button onClick={handleStart} className="px-8 py-4 bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white text-lg font-bold rounded-2xl shadow-lg shadow-primary-500/40 transform hover:-translate-y-1 hover:scale-105 active:translate-y-0 transition-all flex items-center justify-center gap-3 mx-auto"><span>Start Review</span><ArrowRight className="w-5 h-5" /></button></div>}
          {stage === "rating" && <div className="glass-card rounded-3xl p-8 sm:p-10 text-center screen-enter"><h2 className="text-2xl font-bold text-white mb-2">How was your experience?</h2><p className="text-slate-400 mb-8 text-sm">Your honest moment matters</p><div className="mb-8"><EmojiRating3D value={rating} onChange={setRating} onSelect={() => {}} /></div><button onClick={handleRatingContinue} disabled={rating === 0 || transitioning} className={`px-8 py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 mx-auto ${rating > 0 ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/40 hover:-translate-y-1 hover:scale-105 active:scale-95" : "glass text-slate-500 border border-white/5 cursor-not-allowed"}`}><span>{rating > 0 ? "Continue" : "Select a rating"}</span>{rating > 0 && <ArrowRight className="w-4 h-4" />}</button></div>}
          {stage === "questions" && currentQ && <div className="glass-card rounded-3xl p-8 sm:p-10 screen-enter"><div className="mb-6"><div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold uppercase tracking-wider text-primary-300">Question {currentQuestionIndex + 1} of {activeQuestions.length}</span><span className="text-xs text-slate-500">{Math.round((currentQuestionIndex / activeQuestions.length) * 100)}%</span></div><div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500" style={{ width: `${((currentQuestionIndex + 1) / activeQuestions.length) * 100}%` }} /></div></div><h2 className="text-xl font-bold text-white mb-4">{currentQ.question_text}</h2><div className="flex flex-wrap gap-2 mb-6">{currentQ.options.map((opt) => { const checked = (selectedChips[currentQ.id] || []).includes(opt); return <button key={opt} type="button" onClick={() => handleChipToggle(currentQ.id, opt)} className={`chip px-4 py-2.5 rounded-xl text-sm font-medium border flex items-center gap-1.5 ${checked ? "bg-gradient-to-r from-primary-600 to-accent-500 text-white border-primary-400/60 shadow-[0_0_15px_rgba(99,102,241,0.4)]" : "glass border-white/10 text-slate-300 hover:text-white hover:border-white/20"}`}>{checked && <Check className="w-4 h-4 text-emerald-300" />}<span>{opt}</span></button>; })}</div><button onClick={handleNext} disabled={!canProceed || transitioning} className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${canProceed ? "bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/40 hover:-translate-y-0.5 active:scale-95" : "glass text-slate-500 border border-white/5 cursor-not-allowed"}`}><span>{isLast ? "Generate AI Review" : "Next"}</span>{isLast ? <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" /> : <ChevronRight className="w-5 h-5" />}</button></div>}
          {stage === "generating" && <div className="glass-card rounded-3xl p-10 text-center screen-enter"><div className="flex items-center justify-center gap-3 mb-4"><div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} /><div className="w-3 h-3 bg-accent-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} /><div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} /></div><p className="text-lg font-medium text-white">Creating your review...</p></div>}
          {stage === "result" && <div className="glass-card rounded-3xl p-8 sm:p-10 screen-enter"><div className="text-center mb-6"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/30 mb-2"><Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Review Generated</span><h2 className="text-xl font-bold text-white">Ready to Share!</h2></div><div className="glass rounded-2xl p-6 mb-6"><p className="text-slate-200 leading-relaxed text-sm">"{aiReview}"</p></div><div className="flex flex-col gap-3"><button onClick={handleRegenerate} disabled={transitioning} className="w-full py-3.5 rounded-2xl glass text-white font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /><span>Regenerate</span></button><button onClick={handleCopy} className="w-full py-3.5 rounded-2xl glass text-white font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"><Copy className="w-4 h-4" /><span>Copy Review</span></button><button onClick={handleGooglePost} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-success-600 to-success-500 text-white font-bold shadow-lg shadow-success-500/30 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"><ExternalLink className="w-4 h-4" /><span>Post on Google</span></button></div></div>}
          {stage === "google" && <div className="glass-card rounded-3xl p-10 text-center screen-enter"><div className="text-5xl mb-4">{"\u2705"}</div><h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2><p className="text-slate-300 mb-6">We've opened Google Reviews in a new tab.</p><button onClick={() => setStage("welcome")} className="px-6 py-3 glass text-white font-medium rounded-xl hover:bg-white/10 transition-all">Done</button></div>}
        </div>
      </div>
    </>
  );
}

function generateLocalReview(name: string, rating: number, answers: { question_id: string; answer: string }[]): string {
  const h = answers.length > 0 ? answers.map((a) => a.answer).join(", ") : "great service and a wonderful atmosphere";
  if (rating >= 4) return `I had an amazing experience at ${name}. ${h}. The staff was attentive and I would definitely recommend it to others. Thank you for the wonderful experience!`;
  if (rating === 3) return `My experience at ${name} was good. ${h}. There's room for improvement but the staff was friendly.`;
  return `I had a disappointing experience at ${name}. ${h}. I hope management can address these issues.`;
}
