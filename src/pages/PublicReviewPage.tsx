import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Business, Question } from "../lib/types";
import SpatialBackground from "../components/SpatialBackground";
import StarRating3D from "../components/StarRating3D";
import { Confetti, Shockwave, FloatingEmojis, AuroraGlow } from "../components/Effects";

type Stage = "loading" | "welcome" | "rating" | "questions" | "generating" | "result" | "google" | "disabled" | "error";

const STAGE_ORDER: Stage[] = ["welcome", "rating", "questions", "generating", "result", "google"];
const STAGE_LABELS: Record<string, string> = {
  welcome: "Start", rating: "Rate", questions: "Details", generating: "AI Review", result: "Review", google: "Done",
};

export default function PublicReviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stage, setStage] = useState<Stage>("loading");
  const [rating, setRating] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState(false);
  const [editText, setEditText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStep, setGenStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [shockwaveTrigger, setShockwaveTrigger] = useState(false);
  const [emojisTrigger, setEmojisTrigger] = useState(false);
  const [copied, setCopied] = useState(false);
  const genTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!slug) return;
    supabase.from("businesses").select("*").eq("slug", slug).maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { setStage("error"); return; }
        setBusiness(data as Business);
        if (!(data as Business).public_review_enabled) { setStage("disabled"); return; }
        setStage("welcome");
        supabase.from("analytics_events").insert({ business_id: (data as Business).id, event_type: "page_view", metadata: { slug } }).then();
      });
  }, [slug]);

  const loadQuestions = useCallback(async (businessId: string): Promise<Question[]> => {
    const { data } = await supabase.from("questions").select("*").eq("business_id", businessId).eq("is_active", true).order("sort_order");
    const list = (data || []) as Question[];
    setQuestions(list);
    return list;
  }, []);

  const handleStart = async () => {
    if (!business) return;
    setStage("rating");
    supabase.from("analytics_events").insert({ business_id: business.id, event_type: "review_start", metadata: {} }).then();
  };

  const handleRatingSubmit = async () => {
    if (!business || rating === 0) return;
    const { data } = await supabase.from("review_sessions").insert({
      business_id: business.id, rating, answers: [], ai_status: "pending",
    }).select().single();
    setSessionId(data.id);
    supabase.from("analytics_events").insert({ business_id: business.id, session_id: data.id, event_type: "rating_submitted", metadata: { rating } }).then();
    if (rating >= 4) { setConfettiTrigger(true); setShockwaveTrigger(true); setEmojisTrigger(true); }
    const qs = await loadQuestions(business.id);
    if (qs.length > 0) {
      setStage("questions");
    } else {
      startGeneration(data.id, rating, []);
    }
  };

  const handleQuestionsSubmit = async () => {
    if (!business || !sessionId) return;
    const answerArray = Object.entries(answers).map(([qid, answer]) => ({ question_id: qid, answer }));
    await supabase.from("review_sessions").update({ answers: answerArray }).eq("id", sessionId);
    supabase.from("analytics_events").insert({ business_id: business.id, session_id: sessionId, event_type: "questions_submitted", metadata: { count: answerArray.length } }).then();
    startGeneration(sessionId, rating, answerArray);
  };

  const startGeneration = (sid: string, r: number, ans: Record<string, unknown>[]) => {
    setStage("generating");
    setGenerating(true);
    setGenProgress(0);
    setGenStep(0);
    setError(null);

    const steps = ["Analyzing your rating", "Reading your feedback", "Crafting your review", "Polishing the language"];
    let stepIdx = 0;
    let progress = 0;
    genTimerRef.current = setInterval(() => {
      progress += Math.random() * 8 + 3;
      if (progress > 90) progress = 90;
      setGenProgress(Math.min(progress, 90));
      const newStep = Math.min(Math.floor((progress / 100) * steps.length), steps.length - 1);
      if (newStep !== stepIdx) { stepIdx = newStep; setGenStep(stepIdx); }
    }, 400);

    setTimeout(() => generateReview(sid, r, ans), 600);
  };

  const generateReview = async (sid: string, r: number, ans: Record<string, unknown>[]) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ sessionId: sid, rating: r, answers: ans, businessId: business?.id }),
      });
      const json = await res.json();
      const review = json.review || "Thank you for your feedback! We're glad you had a great experience.";
      setAiReview(review);
      setEditText(review);
      await supabase.from("review_sessions").update({ ai_generated_review: review, ai_status: "completed", completed_at: new Date().toISOString() }).eq("id", sid);
      supabase.from("analytics_events").insert({ business_id: business?.id, session_id: sid, event_type: "ai_completion", metadata: {} }).then();
    } catch {
      const fallback = "Thank you for your feedback! We appreciate you taking the time to share your experience.";
      setAiReview(fallback);
      setEditText(fallback);
      await supabase.from("review_sessions").update({ ai_generated_review: fallback, ai_status: "completed", completed_at: new Date().toISOString() }).eq("id", sid);
    }
    if (genTimerRef.current) clearInterval(genTimerRef.current);
    setGenProgress(100);
    setGenStep(3);
    setGenerating(false);
    setTimeout(() => setStage("result"), 500);
  };

  const handleRegenerate = async () => {
    if (!sessionId || !business) return;
    setStage("generating");
    setGenerating(true);
    setGenProgress(0);
    setGenStep(0);
    setError(null);

    const steps = ["Re-analyzing your feedback", "Exploring new phrasing", "Crafting a fresh review", "Polishing the language"];
    let stepIdx = 0;
    let progress = 0;
    genTimerRef.current = setInterval(() => {
      progress += Math.random() * 8 + 3;
      if (progress > 90) progress = 90;
      setGenProgress(Math.min(progress, 90));
      const newStep = Math.min(Math.floor((progress / 100) * steps.length), steps.length - 1);
      if (newStep !== stepIdx) { stepIdx = newStep; setGenStep(stepIdx); }
    }, 400);

    const answerArray = Object.entries(answers).map(([qid, answer]) => ({ question_id: qid, answer }));
    setTimeout(() => generateReview(sessionId, rating, answerArray), 600);
  };

  const handleSaveEdit = async () => {
    if (!sessionId || !editText) return;
    setAiReview(editText);
    await supabase.from("review_sessions").update({ ai_generated_review: editText }).eq("id", sessionId);
    setEditingReview(false);
  };

  const handleCopyReview = () => {
    if (aiReview) navigator.clipboard.writeText(aiReview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    supabase.from("analytics_events").insert({ business_id: business?.id, session_id: sessionId, event_type: "copy_event", metadata: {} }).then();
  };

  const handleGoogleClick = () => {
    supabase.from("analytics_events").insert({ business_id: business?.id, session_id: sessionId, event_type: "google_click", metadata: {} }).then();
    if (business?.google_review_url) window.open(business.google_review_url, "_blank");
    setStage("google");
  };

  useEffect(() => {
    return () => { if (genTimerRef.current) clearInterval(genTimerRef.current); };
  }, []);

  const currentStepIndex = STAGE_ORDER.indexOf(stage);
  const progressSteps = STAGE_ORDER.slice(0, 5);

  if (stage === "loading") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div></>;
  if (stage === "error") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center text-center p-4"><div><h1 className="text-2xl font-bold text-white mb-2">Business Not Found</h1><p className="text-slate-400">This review link is invalid.</p></div></div></>;
  if (stage === "disabled") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center text-center p-4"><div><h1 className="text-2xl font-bold text-white mb-2">Reviews Temporarily Disabled</h1><p className="text-slate-400">Please check back later.</p></div></div></>;

  const genSteps = ["Analyzing your rating", "Reading your feedback", "Crafting your review", "Polishing the language"];

  return (
    <>
      <SpatialBackground />
      <Confetti trigger={confettiTrigger} />
      <Shockwave trigger={shockwaveTrigger} />
      <FloatingEmojis emojis={["\u2B50", "\uD83C\uDF89", "\uD83D\uDE04"]} trigger={emojisTrigger} />
      <div className="min-h-screen flex items-center justify-center p-4 py-8">
        <div className="relative w-full max-w-2xl">
          <AuroraGlow color={business?.primary_color || "#6366f1"} />

          {business?.logo_url && (
            <div className="flex justify-center mb-6">
              <img src={business.logo_url} alt={business.name} className="w-20 h-20 rounded-2xl object-cover border border-white/10 shadow-lg animate-scale-in" />
            </div>
          )}

          {(stage === "rating" || stage === "questions" || stage === "generating" || stage === "result") && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {progressSteps.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-1 rounded-full transition-all duration-500 ${i <= currentStepIndex ? "bg-primary-500" : "bg-white/10"}`} />
                </div>
              ))}
            </div>
          )}

          {stage === "welcome" && (
            <div className="glass-strong rounded-3xl p-10 text-center animate-scale-in">
              <h1 className="text-4xl font-bold text-white mb-3">{business?.name}</h1>
              <p className="text-lg text-slate-300 mb-8">{business?.welcome_message || "We'd love to hear about your experience!"}</p>
              <button onClick={handleStart} className="choice3d px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-lg font-semibold rounded-xl shadow-lg shadow-primary-500/30 hover:scale-105 transition-transform">
                Start Review
              </button>
            </div>
          )}

          {stage === "rating" && (
            <div className="glass-strong rounded-3xl p-10 text-center animate-scale-in">
              <h2 className="text-2xl font-bold text-white mb-2">How was your experience?</h2>
              <p className="text-slate-400 mb-8">Tap to rate</p>
              <StarRating3D value={rating} onChange={setRating} />
              <button onClick={handleRatingSubmit} disabled={rating === 0} className="choice3d mt-8 px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-all hover:scale-105 disabled:hover:scale-100">
                Continue
              </button>
            </div>
          )}

          {stage === "questions" && (
            <div className="glass-strong rounded-3xl p-10 animate-scale-in">
              <h2 className="text-2xl font-bold text-white mb-6">Tell us more</h2>
              <div className="space-y-6">
                {questions.map((q, qi) => (
                  <div key={q.id} className="animate-slide-up" style={{ animationDelay: `${qi * 100}ms` }}>
                    <p className="text-white font-medium mb-3">{q.question_text}{q.is_required && <span className="text-error-400 ml-1">*</span>}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                          className={`choice3d px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            answers[q.id] === opt ? "bg-primary-600/30 border border-primary-500/50 text-white scale-105" : "glass text-slate-300 hover:text-white hover:scale-102"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleQuestionsSubmit} className="choice3d mt-8 w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl transition-all hover:scale-102">
                Generate My Review
              </button>
            </div>
          )}

          {stage === "generating" && (
            <div className="glass-strong rounded-3xl p-10 text-center animate-scale-in">
              <div className="ai-generating rounded-2xl p-8 mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-accent-500/10 to-primary-500/5 animate-aurora" />

                <div className="relative">
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${i === genStep ? "bg-primary-400 scale-150" : i < genStep ? "bg-primary-500/60 scale-100" : "bg-slate-600 scale-75"}`}
                        style={{ animation: `bounce 1s ${i * 0.15}s infinite` }}
                      />
                    ))}
                  </div>

                  <div className="space-y-2 mb-6">
                    {genSteps.map((step, i) => (
                      <div key={i} className={`flex items-center justify-center gap-2 text-sm transition-all duration-300 ${i === genStep ? "text-white opacity-100" : i < genStep ? "text-primary-400/60 opacity-60" : "text-slate-600 opacity-30"}`}>
                        <span>{i < genStep ? "\u2713" : i === genStep ? "\u25CF" : "\u25CB"}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="w-full max-w-xs mx-auto">
                    <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-300" style={{ width: `${genProgress}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{Math.round(genProgress)}%</p>
                  </div>
                </div>
              </div>
              <p className="text-lg font-medium text-white">Crafting your personalized review...</p>
              <p className="text-sm text-slate-400 mt-1">Using your rating and feedback to write a natural review</p>
            </div>
          )}

          {stage === "result" && (
            <div className="glass-strong rounded-3xl p-10 animate-scale-in">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">Your Review</h2>
              {editingReview ? (
                <div className="mb-6">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full glass rounded-2xl p-6 text-slate-200 leading-relaxed text-sm focus:outline-none focus:border-primary-500 border border-white/10 resize-none"
                    rows={6}
                    autoFocus
                  />
                  <div className="flex gap-3 mt-3">
                    <button onClick={handleSaveEdit} className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-colors">Save</button>
                    <button onClick={() => { setEditingReview(false); setEditText(aiReview || ""); }} className="flex-1 py-2 glass text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="glass rounded-2xl p-6 mb-6">
                  <p className="text-slate-200 leading-relaxed">{aiReview}</p>
                </div>
              )}

              {!editingReview && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setEditingReview(true)} className="choice3d flex-1 py-3 glass text-white font-medium rounded-xl hover:bg-white/10 transition-all">
                    Edit
                  </button>
                  <button onClick={handleRegenerate} disabled={generating} className="choice3d flex-1 py-3 glass text-white font-medium rounded-xl hover:bg-white/10 transition-all disabled:opacity-50">
                    Regenerate
                  </button>
                  <button onClick={handleCopyReview} className="choice3d flex-1 py-3 glass text-white font-medium rounded-xl hover:bg-white/10 transition-all">
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  {rating >= 4 && business?.google_review_url && (
                    <button onClick={handleGoogleClick} className="choice3d flex-1 py-3 bg-gradient-to-r from-success-600 to-success-500 text-white font-semibold rounded-xl shadow-lg shadow-success-500/30 transition-all hover:scale-105">
                      Post on Google
                    </button>
                  )}
                </div>
              )}

              {!editingReview && rating < 4 && (
                <p className="text-center text-xs text-slate-500 mt-4">We're sorry your experience wasn't 5-star. Your feedback helps us improve.</p>
              )}
            </div>
          )}

          {stage === "google" && (
            <div className="glass-strong rounded-3xl p-10 text-center animate-scale-in">
              <div className="text-6xl mb-4 animate-bounce">{"\u2705"}</div>
              <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
              <p className="text-slate-300 mb-6">We've opened Google Reviews in a new tab. Paste your review there to share it with the world!</p>
              <div className="glass rounded-2xl p-4 mb-6 text-left">
                <p className="text-xs text-slate-500 mb-2">Your review (tap to copy):</p>
                <p className="text-sm text-slate-200 leading-relaxed cursor-pointer" onClick={handleCopyReview}>{aiReview}</p>
              </div>
              <button onClick={() => setStage("welcome")} className="choice3d px-6 py-3 glass text-white font-medium rounded-xl hover:bg-white/10 transition-all">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
