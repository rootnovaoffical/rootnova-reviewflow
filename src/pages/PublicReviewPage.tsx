import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Sparkles, ArrowRight, Check, RefreshCw, Copy, ExternalLink, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import type { Business } from "../lib/types";
import SpatialBackground from "../components/SpatialBackground";
import EmojiRating3D, { RATING_OPTIONS } from "../components/StarRating3D";
import { Confetti, Shockwave, FloatingEmojis, AuroraGlow, SelectionParticles } from "../components/Effects";

type Stage = "loading" | "welcome" | "rating" | "questions" | "generating" | "result" | "google" | "disabled" | "error";

interface MCQQuestion {
  id: string;
  question_text: string;
  options: string[];
  multi: boolean;
}

const DEFAULT_QUESTIONS: MCQQuestion[] = [
  { id: "discovery", question_text: "How did you hear about us?", options: ["Instagram", "Google", "Friend or family", "Walk-in", "Returning customer"], multi: false },
  { id: "highlights", question_text: "What did you enjoy most about your experience?", options: ["Food", "Staff", "Ambience", "Drinks", "Overall Experience"], multi: true },
  { id: "quality", question_text: "What stood out to you the most?", options: ["Quality", "Service", "Ambience", "Food & Drinks", "Overall Experience"], multi: true },
];

const POSITIVE_FOLLOWUP: MCQQuestion = {
  id: "positive_followup",
  question_text: "What would make your next visit even better?",
  options: ["More variety", "Faster service", "Better seating", "More offers", "It was already perfect!"],
  multi: true,
};

const NEGATIVE_FOLLOWUP: MCQQuestion = {
  id: "negative_followup",
  question_text: "How can we improve your experience?",
  options: ["Faster service", "Better quality", "Cleaner space", "More attentive staff", "Better communication"],
  multi: true,
};

function withTimeout<T>(promise: PromiseLike<T>, ms = 3000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function safeInsert(table: string, row: Record<string, unknown>) {
  withTimeout(supabase.from(table).insert(row).then(), 1000).catch(() => {});
}

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
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [shockwaveTrigger, setShockwaveTrigger] = useState(false);
  const [emojisTrigger, setEmojisTrigger] = useState(false);
  const [particleTrigger, setParticleTrigger] = useState(false);
  const [particleColor, setParticleColor] = useState("#6366f1");
  const [transitioning, setTransitioning] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load business by slug, or fall back to first available business
  useEffect(() => {
    const loadBusiness = async () => {
      try {
        let query = supabase.from("businesses").select("*");
        if (slug) {
          query = query.eq("slug", slug);
        } else {
          query = query.eq("public_review_enabled", true).eq("status", "active").limit(1);
        }
        const { data, error } = await withTimeout(query.maybeSingle().then(), 5000);
        if (error || !data) { setStage("error"); return; }
        setBusiness(data as Business);
        if (!(data as Business).public_review_enabled) { setStage("disabled"); return; }
        setStage("welcome");
        safeInsert("analytics_events", { business_id: (data as Business).id, event_type: "page_view", metadata: { slug: slug || "default" } });
      } catch {
        setStage("error");
      }
    };
    loadBusiness();
  }, [slug]);

  const buildQuestions = useCallback((r: number) => {
    const base = [...DEFAULT_QUESTIONS];
    if (r >= 4) base.push(POSITIVE_FOLLOWUP);
    else base.push(NEGATIVE_FOLLOWUP);
    return base.slice(0, 5);
  }, []);

  const smoothTransition = useCallback((next: Stage) => {
    if (transitioning) return;
    setTransitioning(true);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => { setStage(next); setTransitioning(false); }, 300);
  }, [transitioning]);

  const handleStart = () => {
    if (!business) return;
    smoothTransition("rating");
    safeInsert("analytics_events", { business_id: business.id, event_type: "review_start", metadata: {} });
  };

  const handleRatingSelect = (r: number) => {
    setRating(r);
    setParticleTrigger(true);
    setParticleColor(RATING_OPTIONS[r - 1]?.accent || "#6366f1");
    setTimeout(() => setParticleTrigger(false), 800);
    if (r >= 4) {
      setConfettiTrigger(false); setTimeout(() => setConfettiTrigger(true), 50);
      setShockwaveTrigger(false); setTimeout(() => setShockwaveTrigger(true), 50);
      setEmojisTrigger(false); setTimeout(() => setEmojisTrigger(true), 50);
    }
  };

  const handleRatingContinue = async () => {
    if (!business || rating === 0) return;
    try {
      const { data } = await withTimeout(
        supabase.from("review_sessions").insert({
          business_id: business.id, rating, answers: [], ai_status: "pending",
        }).select().single().then(), 5000
      );
      setSessionId(data.id);
      safeInsert("analytics_events", { business_id: business.id, session_id: data.id, event_type: "rating_submitted", metadata: { rating } });
    } catch {
      setSessionId(`local-${Date.now()}`);
    }
    setQuestions(buildQuestions(rating));
    setCurrentQuestionIndex(0);
    setSelectedChips({});
    smoothTransition("questions");
  };

  const handleChipToggle = (questionId: string, option: string, multi: boolean) => {
    setSelectedChips((prev) => {
      const current = prev[questionId] || [];
      if (multi) {
        const updated = current.includes(option) ? current.filter((i) => i !== option) : [...current, option];
        return { ...prev, [questionId]: updated };
      }
      return { ...prev, [questionId]: current.includes(option) ? [] : [option] };
    });
  };

  const isLastQuestion = currentQuestionIndex >= questions.length - 1;
  const currentQ = questions[currentQuestionIndex];
  const currentAnswer = currentQ ? (selectedChips[currentQ.id] || []) : [];
  const canProceed = currentQ ? currentAnswer.length > 0 : false;

  const handleNextQuestion = () => {
    if (!canProceed || transitioning) return;
    if (isLastQuestion) { handleGenerate(); }
    else { setCurrentQuestionIndex((i) => i + 1); }
  };

  const handleGenerate = async () => {
    if (!business || !sessionId) return;
    const answerArray = Object.entries(selectedChips).flatMap(([qid, opts]) => opts.map((opt) => ({ question_id: qid, answer: opt })));
    if (!sessionId.startsWith("local-")) {
      try { await withTimeout(supabase.from("review_sessions").update({ answers: answerArray }).eq("id", sessionId).then(), 4000); } catch { /* non-blocking */ }
    }
    safeInsert("analytics_events", { business_id: business.id, session_id: sessionId, event_type: "questions_submitted", metadata: { count: answerArray.length } });
    smoothTransition("generating");
    setTimeout(() => generateReview(sessionId, rating, answerArray, 0), 600);
  };

  const generateReview = async (sid: string, r: number, ans: { question_id: string; answer: string }[], regen: number) => {
    try {
      const res = await withTimeout(
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-review`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({ sessionId: sid, rating: r, answers: ans, businessId: business?.id, businessName: business?.name, regenerate: regen }),
        }).then((r2) => r2.json()), 10000
      );
      setAiReview(res.review || "Thank you for your feedback! We're glad you had a great experience.");
      if (!sid.startsWith("local-")) {
        withTimeout(supabase.from("review_sessions").update({ ai_generated_review: res.review, ai_status: "completed", completed_at: new Date().toISOString() }).eq("id", sid).then(), 4000).catch(() => {});
        safeInsert("analytics_events", { business_id: business?.id, session_id: sid, event_type: "ai_completion", metadata: { regenerate: regen } });
      }
    } catch {
      setAiReview(generateLocalReview(business?.name || "this business", r, ans));
    }
    smoothTransition("result");
  };

  const handleRegenerate = () => {
    if (!sessionId || !business) return;
    const nextRegen = regenCount + 1;
    setRegenCount(nextRegen);
    setStage("generating");
    const answerArray = Object.entries(selectedChips).flatMap(([qid, opts]) => opts.map((opt) => ({ question_id: qid, answer: opt })));
    setTimeout(() => generateReview(sessionId, rating, answerArray, nextRegen), 600);
  };

  const handleCopy = () => {
    if (aiReview) navigator.clipboard.writeText(aiReview);
    showToast("Copied to Clipboard!", "success");
    safeInsert("analytics_events", { business_id: business?.id, session_id: sessionId, event_type: "copy_event", metadata: {} });
  };

  const handleGooglePost = () => {
    if (aiReview) navigator.clipboard.writeText(aiReview);
    showToast("Review copied! Redirecting to Google...", "success");
    safeInsert("analytics_events", { business_id: business?.id, session_id: sessionId, event_type: "google_click", metadata: {} });
    const googleUrl = business?.google_review_url || (business?.google_place_id ? `https://search.google.com/local/writereview?placeid=${business.google_place_id}` : null);
    if (googleUrl) window.open(googleUrl, "_blank");
    setStage("google");
  };

  if (stage === "loading") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div></>;
  if (stage === "error") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center text-center p-4"><div className="glass-strong rounded-3xl p-10"><h1 className="text-2xl font-bold text-white mb-2">Business Not Found</h1><p className="text-slate-400">This review link is invalid.</p></div></div></>;
  if (stage === "disabled") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center text-center p-4"><div className="glass-strong rounded-3xl p-10"><h1 className="text-2xl font-bold text-white mb-2">Reviews Temporarily Disabled</h1><p className="text-slate-400">Please check back later.</p></div></div></>;

  return (
    <>
      <SpatialBackground />
      <Confetti trigger={confettiTrigger} />
      <Shockwave trigger={shockwaveTrigger} />
      <FloatingEmojis emojis={["\u2B50", "\uD83C\uDF89", "\uD83D\uDE04", "\uD83C\uDF88"]} trigger={emojisTrigger} />
      <SelectionParticles trigger={particleTrigger} color={particleColor} />

      <div className="min-h-screen flex items-center justify-center p-4 py-8">
        <div className="relative w-full max-w-2xl">
          <AuroraGlow color={business?.primary_color || "#6366f1"} />

          {business?.logo_url && (
            <div className="flex justify-center mb-6">
              <div className="logo-pill w-20 h-20 rounded-2xl p-[2px] transform hover:rotate-3 hover:scale-105 transition-all duration-300">
                <div className="w-full h-full bg-slate-950 rounded-[14px] overflow-hidden flex items-center justify-center">
                  <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 1: WELCOME */}
          {stage === "welcome" && (
            <div className="glass-card rounded-3xl p-10 text-center screen-enter">
              <div className="flex justify-center mb-4"><Sparkles className="w-8 h-8 text-primary-400 animate-pulse" /></div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-3">{business?.name}</h1>
              <p className="text-lg text-slate-300 mb-8">{business?.welcome_message || "We'd love to hear about your experience!"}</p>
              <button onClick={handleStart} className="pulse-ring px-8 py-4 bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white text-lg font-bold rounded-2xl shadow-lg shadow-primary-500/40 transform hover:-translate-y-1 hover:scale-105 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-3 group mx-auto">
                <span>Start Review</span><ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* SCREEN 2: 3D EMOJI STAR RATING */}
          {stage === "rating" && (
            <div className="glass-card rounded-3xl p-8 sm:p-10 text-center screen-enter">
              <h2 className="text-2xl font-bold text-white mb-2">How was your experience?</h2>
              <p className="text-slate-400 mb-8 text-sm">Your honest moment matters</p>
              <div className="mb-8"><EmojiRating3D value={rating} onChange={setRating} onSelect={handleRatingSelect} /></div>
              <button onClick={handleRatingContinue} disabled={rating === 0 || transitioning} className={`px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 mx-auto ${rating > 0 ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/40 hover:-translate-y-1 hover:scale-105 active:scale-95" : "glass text-slate-500 border border-white/5 cursor-not-allowed"}`}>
                <span>{rating > 0 ? "Continue" : "Select a rating to continue"}</span>
                {rating > 0 && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* SCREEN 3: STEP-BY-STEP MCQ FLOW */}
          {stage === "questions" && currentQ && (
            <div className="glass-card rounded-3xl p-8 sm:p-10 screen-enter">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary-300">Quick Questions {currentQuestionIndex + 1} of {questions.length}</span>
                  <span className="text-xs text-slate-500">{Math.round((currentQuestionIndex / questions.length) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-4">{currentQ.question_text}</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {currentQ.options.map((opt) => {
                  const isChecked = (selectedChips[currentQ.id] || []).includes(opt);
                  return (
                    <button key={opt} type="button" onClick={() => handleChipToggle(currentQ.id, opt, currentQ.multi)} className={`chip px-4 py-2.5 rounded-xl text-sm font-medium border flex items-center gap-1.5 ${isChecked ? "chip-selected bg-gradient-to-r from-primary-600 to-accent-500 text-white border-primary-400/60 shadow-[0_0_15px_rgba(99,102,241,0.4)]" : "glass border-white/10 text-slate-300 hover:text-white hover:border-white/20"}`}>
                      {isChecked && <Check className="w-4 h-4 text-emerald-300" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={handleNextQuestion} disabled={!canProceed || transitioning} className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 ${canProceed ? "bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/40 hover:-translate-y-0.5 active:scale-95" : "glass text-slate-500 border border-white/5 cursor-not-allowed"}`}>
                <span>{isLastQuestion ? "Generate AI Review" : "Next Question"}</span>
                {isLastQuestion ? <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          )}

          {/* SCREEN 4: AI GENERATING */}
          {stage === "generating" && (
            <div className="glass-card rounded-3xl p-10 text-center screen-enter">
              <div className="ai-generating rounded-2xl p-8 mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                  <div className="w-3 h-3 bg-accent-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
                <p className="text-lg font-medium text-white">Creating your review...</p>
                <p className="text-sm text-slate-400 mt-1">Crafting a personalized review from your feedback</p>
              </div>
            </div>
          )}

          {/* SCREEN 4: AI RESULT + 3 CTAs */}
          {stage === "result" && (
            <div className="glass-card rounded-3xl p-8 sm:p-10 screen-enter">
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/20 text-primary-300 border border-primary-500/30 mb-2"><Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Review Generated</span>
                <h2 className="text-xl font-bold text-white">Ready to Share!</h2>
              </div>
              <div className="glass rounded-2xl p-6 mb-6 relative"><p className="text-slate-200 leading-relaxed text-sm">"{aiReview}"</p></div>
              <div className="flex flex-col gap-3">
                <button onClick={handleRegenerate} disabled={transitioning} className="w-full py-3.5 rounded-2xl glass text-white font-medium hover:bg-white/10 transform hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /><span>Regenerate</span></button>
                <button onClick={handleCopy} className="w-full py-3.5 rounded-2xl glass text-white font-medium hover:bg-white/10 transform hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"><Copy className="w-4 h-4" /><span>Copy Review</span></button>
                <button onClick={handleGooglePost} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-success-600 to-success-500 text-white font-bold shadow-lg shadow-success-500/30 transform hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"><ExternalLink className="w-4 h-4" /><span>Post on Google</span></button>
              </div>
            </div>
          )}

          {/* GOOGLE THANK YOU */}
          {stage === "google" && (
            <div className="glass-card rounded-3xl p-10 text-center screen-enter">
              <div className="text-5xl mb-4">{"\u2705"}</div>
              <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
              <p className="text-slate-300 mb-6">We've opened Google Reviews in a new tab. Your feedback means the world to us!</p>
              <button onClick={() => setStage("welcome")} className="choice3d px-6 py-3 glass text-white font-medium rounded-xl hover:bg-white/10 transition-all">Done</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function generateLocalReview(businessName: string, rating: number, answers: { question_id: string; answer: string }[]): string {
  const highlights = answers.length > 0 ? answers.map((a) => a.answer).join(", ") : "great service and a wonderful atmosphere";
  if (rating >= 4) return `I had an amazing experience at ${businessName}. ${highlights}. The staff was attentive and I would definitely recommend it to others. Thank you for the wonderful experience!`;
  if (rating === 3) return `My experience at ${businessName} was good. ${highlights}. There's room for improvement but the staff was friendly.`;
  return `I had a disappointing experience at ${businessName}. ${highlights}. I hope management can address these issues.`;
}
