import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Business, Question } from "../lib/types";
import SpatialBackground from "../components/SpatialBackground";
import StarRating3D from "../components/StarRating3D";
import { Confetti, Shockwave, FloatingEmojis, AuroraGlow } from "../components/Effects";

type Stage = "loading" | "welcome" | "rating" | "questions" | "generating" | "result" | "google" | "disabled" | "error";

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

  const loadQuestions = useCallback(async (businessId: string) => {
    const { data } = await supabase.from("questions").select("*").eq("business_id", businessId).eq("is_active", true).order("sort_order");
    setQuestions((data || []) as Question[]);
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
    await loadQuestions(business.id);
    setStage(questions.length > 0 ? "questions" : "generating");
    if (questions.length === 0) setTimeout(() => generateReview(data.id, rating, []), 500);
  };

  const handleQuestionsSubmit = async () => {
    if (!business || !sessionId) return;
    const answerArray = Object.entries(answers).map(([qid, answer]) => ({ question_id: qid, answer }));
    await supabase.from("review_sessions").update({ answers: answerArray }).eq("id", sessionId);
    supabase.from("analytics_events").insert({ business_id: business.id, session_id: sessionId, event_type: "questions_submitted", metadata: { count: answerArray.length } }).then();
    setStage("generating");
    setTimeout(() => generateReview(sessionId, rating, answerArray), 500);
  };

  const generateReview = async (sid: string, r: number, ans: Record<string, unknown>[]) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ sessionId: sid, rating: r, answers: ans, businessId: business?.id }),
      });
      const json = await res.json();
      setAiReview(json.review || "Thank you for your feedback! We're glad you had a great experience.");
      await supabase.from("review_sessions").update({ ai_generated_review: json.review, ai_status: "completed", completed_at: new Date().toISOString() }).eq("id", sid);
      supabase.from("analytics_events").insert({ business_id: business?.id, session_id: sid, event_type: "ai_completion", metadata: {} }).then();
    } catch {
      setAiReview("Thank you for your feedback! We appreciate you taking the time to share your experience.");
      await supabase.from("review_sessions").update({ ai_status: "completed", completed_at: new Date().toISOString() }).eq("id", sid);
    }
    setStage("result");
  };

  const handleCopyReview = () => {
    if (aiReview) navigator.clipboard.writeText(aiReview);
    supabase.from("analytics_events").insert({ business_id: business?.id, session_id: sessionId, event_type: "copy_event", metadata: {} }).then();
  };

  const handleGoogleClick = () => {
    supabase.from("analytics_events").insert({ business_id: business?.id, session_id: sessionId, event_type: "google_click", metadata: {} }).then();
    if (business?.google_review_url) window.open(business.google_review_url, "_blank");
    setStage("google");
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
            <div className="glass-strong rounded-3xl p-10 text-center animate-scale-in">
              <h1 className="text-3xl font-bold text-white mb-3">{business?.name}</h1>
              <p className="text-lg text-slate-300 mb-8">{business?.welcome_message || "We'd love to hear about your experience!"}</p>
              <button onClick={handleStart} className="choice3d px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white text-lg font-semibold rounded-xl shadow-lg shadow-primary-500/30">
                Start Review
              </button>
            </div>
          )}

          {stage === "rating" && (
            <div className="glass-strong rounded-3xl p-10 text-center animate-scale-in">
              <h2 className="text-2xl font-bold text-white mb-2">How was your experience?</h2>
              <p className="text-slate-400 mb-8">Tap to rate</p>
              <StarRating3D value={rating} onChange={setRating} />
              <button onClick={handleRatingSubmit} disabled={rating === 0} className="choice3d mt-8 px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-all">
                Continue
              </button>
            </div>
          )}

          {stage === "questions" && (
            <div className="glass-strong rounded-3xl p-10 animate-scale-in">
              <h2 className="text-2xl font-bold text-white mb-6">Quick Questions</h2>
              <div className="space-y-6">
                {questions.map((q) => (
                  <div key={q.id}>
                    <p className="text-white font-medium mb-3">{q.question_text}{q.is_required && <span className="text-error-400 ml-1">*</span>}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                          className={`choice3d px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            answers[q.id] === opt ? "bg-primary-600/30 border-primary-500/50 text-white" : "glass text-slate-300 hover:text-white"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleQuestionsSubmit} className="choice3d mt-8 w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl transition-all">
                Submit & Generate Review
              </button>
            </div>
          )}

          {stage === "generating" && (
            <div className="glass-strong rounded-3xl p-10 text-center animate-scale-in">
              <div className="ai-generating rounded-2xl p-8 mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                  <div className="w-3 h-3 bg-accent-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
                <p className="text-lg font-medium text-white">Generating your review...</p>
                <p className="text-sm text-slate-400 mt-1">Crafting a personalized review from your feedback</p>
              </div>
            </div>
          )}

          {stage === "result" && (
            <div className="glass-strong rounded-3xl p-10 animate-scale-in">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">Your Review</h2>
              <div className="glass rounded-2xl p-6 mb-6">
                <p className="text-slate-200 leading-relaxed">{aiReview}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleCopyReview} className="choice3d flex-1 py-3 glass text-white font-medium rounded-xl hover:bg-white/10 transition-all">
                  Copy Review
                </button>
                {rating >= 4 && business?.google_review_url && (
                  <button onClick={handleGoogleClick} className="choice3d flex-1 py-3 bg-gradient-to-r from-success-600 to-success-500 text-white font-semibold rounded-xl shadow-lg shadow-success-500/30 transition-all">
                    Post on Google
                  </button>
                )}
              </div>
            </div>
          )}

          {stage === "google" && (
            <div className="glass-strong rounded-3xl p-10 text-center animate-scale-in">
              <div className="text-5xl mb-4">{"\u2705"}</div>
              <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
              <p className="text-slate-300 mb-6">We've opened Google Reviews in a new tab. Your feedback means the world to us!</p>
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
