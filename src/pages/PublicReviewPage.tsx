import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Business, Question } from "../lib/types";
import SpatialBackground from "../components/SpatialBackground";
import StarRating3D from "../components/StarRating3D";
import { Confetti, Shockwave, FloatingEmojis, AuroraGlow } from "../components/Effects";

type Stage = "loading" | "welcome" | "rating" | "questions" | "generating" | "result" | "google" | "disabled" | "error";

const STAGE_ORDER: Stage[] = ["welcome", "rating", "questions", "generating", "result", "google"];

const GEN_MESSAGES = [
  "Reading your feedback",
  "Understanding your experience",
  "Finding the right words",
  "Crafting your review",
  "Polishing the language",
];

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
  const [genMessageIdx, setGenMessageIdx] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [shockwaveTrigger, setShockwaveTrigger] = useState(false);
  const [emojisTrigger, setEmojisTrigger] = useState(false);
  const [copied, setCopied] = useState(false);
  const genTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const genMsgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const loadQuestions = useCallback(async (businessId: string, currentRating: number): Promise<Question[]> => {
    const { data, error } = await supabase.from("questions").select("*").eq("business_id", businessId).eq("is_active", true).order("sort_order");
    if (error) { console.error("Failed to load questions:", error.message); return []; }
    const all = (data || []) as Question[];
    const filtered = all.filter(q => q.flow_type === "ALWAYS" || (q.flow_type === "POSITIVE" && currentRating >= 4) || (q.flow_type === "NEGATIVE" && currentRating <= 3));
    setQuestions(filtered);
    return filtered;
  }, []);

  const handleStart = async () => {
    if (!business) return;
    setStage("rating");
    supabase.from("analytics_events").insert({ business_id: business.id, event_type: "review_start", metadata: {} }).then();
  };

  const handleRatingSubmit = async () => {
    if (!business || rating === 0) return;
    const sid = crypto.randomUUID();
    const { error: insErr } = await supabase.from("review_sessions").insert({
      id: sid, business_id: business.id, rating, answers: [], ai_status: "pending",
    });
    if (insErr) { setGenError("Failed to start review session"); return; }
    setSessionId(sid);
    supabase.from("analytics_events").insert({ business_id: business.id, session_id: sid, event_type: "rating_submitted", metadata: { rating } }).then();
    if (rating >= 4) { setConfettiTrigger(true); setShockwaveTrigger(true); setEmojisTrigger(true); }
    const qs = await loadQuestions(business.id, rating);
    if (qs.length > 0) {
      setStage("questions");
    } else {
      setGenError("No questions are configured for this business. Please ask the business to configure review questions.");
      setStage("error");
    }
  };

  const handleQuestionsSubmit = async () => {
    if (!business || !sessionId) return;
    const requiredQuestions = questions.filter(q => q.is_required);
    const unansweredRequired = requiredQuestions.filter(q => !answers[q.id]);
    if (unansweredRequired.length > 0) return;
    const answerArray = Object.entries(answers).map(([qid, answer]) => {
      const q = questions.find(qq => qq.id === qid);
      return { question_id: qid, question: q?.question_text || "", answer };
    });
    await supabase.from("review_sessions").update({ answers: answerArray }).eq("id", sessionId);
    supabase.from("analytics_events").insert({ business_id: business.id, session_id: sessionId, event_type: "questions_submitted", metadata: { count: answerArray.length } }).then();
    startGeneration(sessionId, rating, answerArray);
  };

  const startGeneration = (sid: string, r: number, ans: Record<string, unknown>[]) => {
    setStage("generating");
    setGenerating(true);
    setGenProgress(0);
    setGenStep(0);
    setGenMessageIdx(0);
    setGenError(null);

    let progress = 0;
    genTimerRef.current = setInterval(() => {
      progress += Math.random() * 6 + 2;
      if (progress > 92) progress = 92;
      setGenProgress(Math.min(progress, 92));
      const newStep = Math.min(Math.floor((progress / 100) * GEN_MESSAGES.length), GEN_MESSAGES.length - 1);
      if (newStep !== Math.floor((progress - 6) / 100 * GEN_MESSAGES.length)) setGenStep(newStep);
    }, 500);

    genMsgTimerRef.current = setInterval(() => {
      setGenMessageIdx((i) => (i + 1) % GEN_MESSAGES.length);
    }, 2200);

    setTimeout(() => generateReview(sid, r, ans), 800);
  };

  const FETCH_TIMEOUT_MS = 30000;

  const stopGenerationTimers = () => {
    if (genTimerRef.current) { clearInterval(genTimerRef.current); genTimerRef.current = null; }
    if (genMsgTimerRef.current) { clearInterval(genMsgTimerRef.current); genMsgTimerRef.current = null; }
  };

  const generateReview = async (sid: string, r: number, ans: Record<string, unknown>[]) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ sessionId: sid, rating: r, answers: ans, businessId: business?.id }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = await res.json();
      const review = json.review || "Thank you for your feedback! We're glad you had a great experience.";
      setAiReview(review);
      setEditText(review);
      supabase.from("analytics_events").insert({ business_id: business?.id, session_id: sid, event_type: "ai_completion", metadata: { provider: json.provider } }).then();
      stopGenerationTimers();
      setGenProgress(100);
      setGenStep(GEN_MESSAGES.length - 1);
      setGenerating(false);
      setTimeout(() => setStage("result"), 600);
    } catch (err) {
      stopGenerationTimers();
      setGenerating(false);
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      setGenError(isTimeout ? "Generation timed out. Please try again." : (err instanceof Error ? err.message : "Generation failed"));
      setGenProgress(0);
    }
  };

  const handleRetry = async () => {
    if (!sessionId || !business || generating) return;
    const answerArray = Object.entries(answers).map(([qid, answer]) => {
      const q = questions.find(qq => qq.id === qid);
      return { question_id: qid, question: q?.question_text || "", answer };
    });
    startGeneration(sessionId, rating, answerArray);
  };

  const handleRegenerate = async () => {
    if (!sessionId || !business || generating) return;
    setStage("generating");
    setGenerating(true);
    setGenProgress(0);
    setGenStep(0);
    setGenMessageIdx(0);
    setGenError(null);

    let progress = 0;
    genTimerRef.current = setInterval(() => {
      progress += Math.random() * 6 + 2;
      if (progress > 92) progress = 92;
      setGenProgress(Math.min(progress, 92));
    }, 500);
    genMsgTimerRef.current = setInterval(() => {
      setGenMessageIdx((i) => (i + 1) % GEN_MESSAGES.length);
    }, 2200);

    const answerArray = Object.entries(answers).map(([qid, answer]) => {
      const q = questions.find(qq => qq.id === qid);
      return { question_id: qid, question: q?.question_text || "", answer };
    });
    setTimeout(() => generateReview(sessionId, rating, answerArray), 800);
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

  const googleDestination = (() => {
    if (!business) return null;
    if (business.google_review_url) return business.google_review_url;
    if (business.google_maps_url) return business.google_maps_url;
    return null;
  })();

  const handleGoogleClick = () => {
    if (!googleDestination) return;
    supabase.from("analytics_events").insert({ business_id: business?.id, session_id: sessionId, event_type: "google_click", metadata: { destination: googleDestination } }).then();
    window.open(googleDestination, "_blank");
    setStage("google");
  };

  useEffect(() => {
    return () => stopGenerationTimers();
  }, []);

  const currentStepIndex = STAGE_ORDER.indexOf(stage);
  const progressSteps = STAGE_ORDER.slice(0, 5);
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  if (stage === "loading") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div></>;
  if (stage === "error") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center text-center p-4"><div><h1 className="text-2xl font-bold text-white mb-2">Business Not Found</h1><p className="text-slate-400">This review link is invalid.</p></div></div></>;
  if (stage === "disabled") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center text-center p-4"><div><h1 className="text-2xl font-bold text-white mb-2">Reviews Temporarily Disabled</h1><p className="text-slate-400">Please check back later.</p></div></div></>;

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
            <div className="glass-strong rounded-3xl p-10 text-center animate-step-in">
              <h2 className="text-2xl font-bold text-white mb-2">How was your experience?</h2>
              <p className="text-slate-400 mb-8">Tap to rate</p>
              <StarRating3D value={rating} onChange={setRating} />
              <button onClick={handleRatingSubmit} disabled={rating === 0} className="choice3d mt-8 px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-all hover:scale-105 disabled:hover:scale-100">
                Continue
              </button>
            </div>
          )}

          {stage === "questions" && (
            <div className="glass-strong rounded-3xl p-8 sm:p-10 animate-step-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Tell us more</h2>
                <span className="text-xs text-slate-500">{answeredCount}/{totalQuestions}</span>
              </div>
              <div className="space-y-6">
                {questions.map((q, qi) => (
                  <div key={q.id} className="animate-slide-up" style={{ animationDelay: `${qi * 100}ms` }}>
                    <p className="text-white font-medium mb-3">{q.question_text}{q.is_required && <span className="text-error-400 ml-1">*</span>}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                            className={`choice3d px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                              isSelected ? "bg-primary-600/30 border border-primary-500/50 text-white scale-105" : "glass text-slate-300 hover:text-white hover:scale-102"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleQuestionsSubmit} disabled={questions.filter(q => q.is_required).some(q => !answers[q.id])} className="choice3d mt-8 w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 disabled:opacity-40 disabled:hover:scale-100 text-white font-semibold rounded-xl transition-all hover:scale-102">
                Generate My Review
              </button>
            </div>
          )}

          {stage === "generating" && (
            <div className="glass-strong rounded-3xl p-10 text-center animate-step-in">
              <div className="ai-generating rounded-2xl p-8 mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-accent-500/10 to-primary-500/5 animate-aurora" />
                <div className="relative flex flex-col items-center">
                  <div className="relative w-24 h-24 mb-6">
                    <div className="ai-orb absolute inset-0 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 opacity-80" />
                    <div className="ai-pulse-ring absolute inset-0 rounded-full border-2 border-primary-400/50" />
                    <div className="ai-pulse-ring absolute inset-0 rounded-full border-2 border-primary-400/30" style={{ animationDelay: "1s" }} />
                  </div>

                  <div className="space-y-2 mb-6 w-full max-w-xs">
                    {GEN_MESSAGES.map((msg, i) => (
                      <div key={i} className={`flex items-center justify-center gap-2 text-sm transition-all duration-300 ${i === genStep ? "text-white opacity-100" : i < genStep ? "text-primary-400/60 opacity-60" : "text-slate-600 opacity-30"}`}>
                        <span>{i < genStep ? "\u2713" : i === genStep ? "\u25CF" : "\u25CB"}</span>
                        <span>{msg}</span>
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

              {genError ? (
                <div className="animate-shake">
                  <p className="text-lg font-medium text-error-400 mb-2">Generation hit a snag</p>
                  <p className="text-sm text-slate-400 mb-4">{genError}</p>
                  <button onClick={handleRetry} className="choice3d px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl transition-all hover:scale-105">
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-lg font-medium text-white">{GEN_MESSAGES[genMessageIdx]}...</p>
                  <p className="text-sm text-slate-400 mt-1">Transforming your feedback into a natural review</p>
                </>
              )}
            </div>
          )}

          {stage === "result" && (
            <div className="glass-strong rounded-3xl p-8 sm:p-10 animate-review-reveal">
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
                  {googleDestination ? (
                    <button onClick={handleGoogleClick} className="choice3d flex-1 py-3 bg-gradient-to-r from-success-600 to-success-500 text-white font-semibold rounded-xl shadow-lg shadow-success-500/30 transition-all hover:scale-105">
                      Continue to Google Review
                    </button>
                  ) : (
                    <p className="flex-1 text-center text-xs text-amber-400 py-3">Google review destination not configured for this business.</p>
                  )}
                </div>
              )}

              {!editingReview && rating < 4 && (
                <p className="text-center text-xs text-slate-500 mt-4">We're sorry your experience wasn't 5-star. Your feedback helps us improve.</p>
              )}
            </div>
          )}

          {stage === "google" && (
            <div className="glass-strong rounded-3xl p-10 text-center animate-step-in">
              <div className="text-6xl mb-4 animate-bounce">{"\u2705"}</div>
              <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
              <p className="text-slate-300 mb-6">We've opened Google Reviews in a new tab. Paste your review there to share it with the world!</p>
              <div className="glass rounded-2xl p-4 mb-6 text-left">
                <p className="text-xs text-slate-500 mb-2">Your review (tap to copy):</p>
                <p className="text-sm text-slate-200 leading-relaxed cursor-pointer" onClick={handleCopyReview}>{aiReview}</p>
              </div>
              <button onClick={() => setStage("welcome")} className="choice3d px-6 py-3 glass text-white font-medium rounded-xl hover:bg-white/10 transition-all">
                Start New Review
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
