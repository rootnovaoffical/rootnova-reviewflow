import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Business, Question } from "../lib/types";
import SpatialBackground from "../components/SpatialBackground";
import StarRating3D from "../components/StarRating3D";
import { Confetti, Shockwave, FloatingEmojis, AuroraGlow } from "../components/Effects";

type Stage = "loading" | "welcome" | "rating" | "questions" | "generating" | "result" | "google" | "disabled" | "error";

const AI_MESSAGES = [
  "Listening to what stood out...",
  "Finding the feeling behind your experience...",
  "Shaping your words...",
  "Making it sound like you...",
  "Your experience is becoming a story...",
];

const REGEN_LIMIT = 3;

export default function PublicReviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stage, setStage] = useState<Stage>("loading");
  const [rating, setRating] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [shockwaveTrigger, setShockwaveTrigger] = useState(false);
  const [emojisTrigger, setEmojisTrigger] = useState(false);
  const [aiMessageIndex, setAiMessageIndex] = useState(0);
  const [regenCount, setRegenCount] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [, setVariationSeed] = useState(0);
  const aiMessageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (stage === "generating") {
      setAiMessageIndex(0);
      aiMessageTimer.current = setInterval(() => {
        setAiMessageIndex((prev) => (prev + 1) % AI_MESSAGES.length);
      }, 2000);
    } else {
      if (aiMessageTimer.current) {
        clearInterval(aiMessageTimer.current);
        aiMessageTimer.current = null;
      }
    }
    return () => {
      if (aiMessageTimer.current) clearInterval(aiMessageTimer.current);
    };
  }, [stage]);

  const googleDestination = business?.google_review_url || business?.google_review_url_derived || null;

  const handleStart = async () => {
    if (!business) return;
    setStage("rating");
    supabase.from("analytics_events").insert({ business_id: business.id, event_type: "review_start", metadata: {} }).then();
  };

  const handleRatingSubmit = async () => {
    if (!business || rating === 0) return;
    const { data, error } = await supabase.from("review_sessions").insert({
      business_id: business.id, rating, answers: [], ai_status: "pending",
    }).select().single();
    if (error || !data) { setStage("error"); return; }
    setSessionId(data.id);
    supabase.from("analytics_events").insert({ business_id: business.id, session_id: data.id, event_type: "rating_submitted", metadata: { rating } }).then();
    if (rating >= 4) { setConfettiTrigger(true); setShockwaveTrigger(true); setEmojisTrigger(true); }
    const { data: loadedQuestions } = await supabase.from("questions").select("*").eq("business_id", business.id).eq("is_active", true).order("sort_order");
    const qs = (loadedQuestions || []) as Question[];
    setQuestions(qs);
    if (qs.length > 0) {
      setStage("questions");
    } else {
      setStage("generating");
      const seed = Math.floor(Math.random() * 1000);
      setVariationSeed(seed);
      setTimeout(() => generateReview(data.id, rating, [], seed, false), 500);
    }
  };

  const handleAnswerSelect = (qid: string, opt: string) => {
    setAnswers((a) => ({ ...a, [qid]: opt }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    }
  };

  const handleQuestionsSubmit = async () => {
    if (!business || !sessionId) return;
    const answerArray = Object.entries(answers).map(([qid, answer]) => ({ question_id: qid, answer }));
    await supabase.from("review_sessions").update({ answers: answerArray }).eq("id", sessionId);
    supabase.from("analytics_events").insert({ business_id: business.id, session_id: sessionId, event_type: "questions_submitted", metadata: { count: answerArray.length } }).then();
    setStage("generating");
    const seed = Math.floor(Math.random() * 1000);
    setVariationSeed(seed);
    setTimeout(() => generateReview(sessionId, rating, answerArray, seed, false), 500);
  };

  const generateReview = async (sid: string, r: number, ans: Record<string, unknown>[], seed: number, isRegen: boolean) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ sessionId: sid, rating: r, answers: ans, businessId: business?.id, regenerate: isRegen, variationSeed: seed }),
      });
      const json = await res.json();
      const review = json.review || "Thank you for your feedback! We're glad you had a great experience.";
      setAiReview(review);
      await supabase.from("review_sessions").update({ ai_generated_review: review, ai_status: "completed", completed_at: new Date().toISOString() }).eq("id", sid);
      supabase.from("analytics_events").insert({ business_id: business?.id, session_id: sid, event_type: "ai_completion", metadata: { regenerated: isRegen } }).then();
    } catch {
      setAiReview("Thank you for your feedback! We appreciate you taking the time to share your experience.");
      await supabase.from("review_sessions").update({ ai_status: "completed", completed_at: new Date().toISOString() }).eq("id", sid);
    }
    setStage("result");
  };

  const handleRegenerate = async () => {
    if (!sessionId || !business || regenCount >= REGEN_LIMIT || isRegenerating) return;
    setIsRegenerating(true);
    setStage("generating");
    const answerArray = Object.entries(answers).map(([qid, answer]) => ({ question_id: qid, answer }));
    const seed = Math.floor(Math.random() * 1000) + regenCount * 100;
    setVariationSeed(seed);
    await generateReview(sessionId, rating, answerArray, seed, true);
    setRegenCount((c) => c + 1);
    setIsRegenerating(false);
  };

  const handleCopyReview = () => {
    if (aiReview) navigator.clipboard.writeText(aiReview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    supabase.from("analytics_events").insert({ business_id: business?.id, session_id: sessionId, event_type: "copy_event", metadata: {} }).then();
  };

  const handleShareToGoogle = () => {
    if (aiReview) navigator.clipboard.writeText(aiReview);
    supabase.from("analytics_events").insert({ business_id: business?.id, session_id: sessionId, event_type: "google_click", metadata: {} }).then();
    if (googleDestination) {
      window.open(googleDestination, "_blank");
      setStage("google");
    }
  };

  if (stage === "loading") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" /></div></>;
  if (stage === "error") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center text-center p-4"><div><h1 className="text-2xl font-bold text-white mb-2">Business Not Found</h1><p className="text-slate-400">This review link is invalid.</p></div></div></>;
  if (stage === "disabled") return <><SpatialBackground /><div className="min-h-screen flex items-center justify-center text-center p-4"><div><h1 className="text-2xl font-bold text-white mb-2">Reviews Temporarily Disabled</h1><p className="text-slate-400">Please check back later.</p></div></div></>;

  return (
    <>
      <SpatialBackground />
      <Confetti trigger={confettiTrigger} />
      <Shockwave trigger={shockwaveTrigger} />
      <FloatingEmojis emojis={["\u2B50", "\uD83C\uDF89", "\uD83D\uDE04"]} trigger={emojisTrigger} />
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl">
          <AuroraGlow color={business?.primary_color || "#6366f1"} />

          {business?.logo_url && (
            <div className="flex justify-center mb-6">
              <img src={business.logo_url} alt={business.name} className="w-20 h-20 rounded-2xl object-cover border border-white/10 shadow-lg" />
            </div>
          )}

          {stage === "welcome" && (
            <div className="glass-strong rounded-3xl p-10 text-center stage-transition">
              <h1 className="text-3xl font-bold text-white mb-3">{business?.name}</h1>
              <p className="text-lg text-slate-300 mb-8">{business?.welcome_message || "We'd love to hear about your experience!"}</p>
              <button onClick={handleStart} className="choice3d px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-lg font-semibold rounded-xl shadow-lg shadow-primary-500/30">
                Share Your Experience
              </button>
            </div>
          )}

          {stage === "rating" && (
            <div className="glass-strong rounded-3xl p-10 text-center stage-transition">
              <h2 className="text-2xl font-bold text-white mb-2">How was your experience?</h2>
              <p className="text-slate-400 mb-8">Your honest moment matters</p>
              <StarRating3D value={rating} onChange={setRating} />
              <button onClick={handleRatingSubmit} disabled={rating === 0} className="choice3d mt-8 px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all">
                {rating === 0 ? "Select a rating to continue" : "Continue"}
              </button>
            </div>
          )}

          {stage === "questions" && questions.length > 0 && (
            <div className="glass-strong rounded-3xl p-10 stage-transition">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Quick Questions</h2>
                <span className="text-sm text-slate-400">{currentQuestionIndex + 1} of {questions.length}</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
                <div className="progress-bar-fill h-full bg-gradient-to-r from-primary-500 to-accent-400 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
              </div>
              <div className="space-y-6">
                {questions.map((q, qi) => (
                  <div key={q.id} className={qi === currentQuestionIndex ? "question-enter" : "hidden"}>
                    <p className="text-white font-medium mb-3">{q.question_text}{q.is_required && <span className="text-error-400 ml-1">*</span>}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => handleAnswerSelect(q.id, opt)}
                          className={`choice3d px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            answers[q.id] === opt ? "bg-primary-600/30 border border-primary-500/50 text-white" : "glass text-slate-300 hover:text-white"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {qi === currentQuestionIndex && currentQuestionIndex < questions.length - 1 && answers[q.id] && (
                      <button onClick={handleNextQuestion} className="choice3d mt-4 px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-medium rounded-xl transition-all">
                        Next Question
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {currentQuestionIndex === questions.length - 1 && (
                <button onClick={handleQuestionsSubmit} className="choice3d mt-8 w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl transition-all">
                  Bring My Experience to Life
                </button>
              )}
            </div>
          )}

          {stage === "generating" && (
            <div className="glass-strong rounded-3xl p-10 text-center stage-transition">
              <div className="ai-generating rounded-2xl p-8 mb-6">
                <div className="ai-orb mb-6">
                  <div className="ai-orb-ring" />
                  <div className="ai-orb-ring" />
                  <div className="ai-orb-ring" />
                  <div className="ai-orb-core" />
                </div>
                <p className="text-lg font-medium text-white animate-fade-in" key={aiMessageIndex}>{AI_MESSAGES[aiMessageIndex]}</p>
                <p className="text-sm text-slate-400 mt-2">Shaping your experience into words</p>
              </div>
            </div>
          )}

          {stage === "result" && (
            <div className="glass-strong rounded-3xl p-10 stage-transition">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">Your Review</h2>
              <div className="glass rounded-2xl p-6 mb-8 review-reveal">
                <p className="text-slate-200 leading-relaxed text-lg">{aiReview}</p>
              </div>
              <div className="flex flex-col gap-3">
                {rating >= 4 && googleDestination && (
                  <button
                    onClick={handleShareToGoogle}
                    className="action-primary choice3d w-full py-4 text-white text-lg font-semibold rounded-xl"
                  >
                    {"\u2B50 Share My Experience"}
                  </button>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleRegenerate}
                    disabled={regenCount >= REGEN_LIMIT || isRegenerating}
                    className="action-secondary choice3d flex-1 py-3 text-white font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {regenCount >= REGEN_LIMIT ? "All versions explored" : "\u2728 Try Another Voice"}
                  </button>
                  <button
                    onClick={handleCopyReview}
                    className={`action-utility choice3d flex-1 py-3 text-white font-medium rounded-xl ${copied ? "copied-pulse" : ""}`}
                  >
                    {copied ? "\u2713 Saved!" : "Save My Words"}
                  </button>
                </div>
              </div>
              {rating >= 4 && !googleDestination && (
                <p className="text-sm text-slate-400 text-center mt-4">Google review destination is not configured for this business.</p>
              )}
              {rating < 4 && (
                <button onClick={() => setStage("welcome")} className="action-utility choice3d mt-4 w-full py-3 text-white font-medium rounded-xl">
                  Done
                </button>
              )}
            </div>
          )}

          {stage === "google" && (
            <div className="glass-strong rounded-3xl p-10 text-center stage-transition">
              <div className="text-5xl mb-4">{"\u2705"}</div>
              <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
              <p className="text-slate-300 mb-6">We've opened Google Reviews in a new tab. Your feedback means the world to us!</p>
              <button onClick={() => setStage("welcome")} className="action-utility choice3d px-6 py-3 text-white font-medium rounded-xl">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
