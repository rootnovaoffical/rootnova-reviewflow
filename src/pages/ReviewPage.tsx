import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Business, Question, ReviewSession } from "../lib/types";

type Step = "welcome" | "rating" | "questions" | "generating" | "reveal";
interface Answer {
  question_id: string;
  question_text: string;
  answer: string;
}

export default function ReviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("welcome");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [generatedReview, setGeneratedReview] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const primary = business?.primary_color || "#4f46e5";
  const secondary = business?.secondary_color || "#818cf8";

  useEffect(() => {
    if (!slug) return;
    loadBusiness();
  }, [slug]);

  useEffect(() => {
    if (business) {
      supabase
        .from("analytics_events")
        .insert({ business_id: business.id, event_type: "review_page_view", metadata: { slug } })
        .then(() => {});
    }
  }, [business, slug]);

  async function loadBusiness() {
    setLoading(true);
    const { data, error: bError } = await supabase
      .from("businesses")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (bError || !data) {
      setError("Business not found or inactive.");
      setLoading(false);
      return;
    }
    setBusiness(data as Business);
    setLoading(false);
  }

  async function loadQuestions() {
    if (!business) return;
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    setQuestions((data ?? []) as Question[]);
  }

  function startReview() {
    setStep("rating");
    if (business) {
      supabase
        .from("analytics_events")
        .insert({ business_id: business.id, event_type: "review_started", metadata: {} })
        .then(() => {});
    }
  }

  async function submitRating(r: number) {
    setRating(r);
    if (business) {
      supabase
        .from("analytics_events")
        .insert({ business_id: business.id, event_type: "rating_submitted", metadata: { rating: r } })
        .then(() => {});
    }
    await loadQuestions();
    setStep("questions");
  }

  const visibleQuestions = questions.filter((q) => {
    if (q.flow_type === "ALWAYS") return true;
    if (q.flow_type === "POSITIVE") return rating >= 4;
    if (q.flow_type === "NEGATIVE") return rating < 4;
    return false;
  });

  function selectAnswer(question: Question, answer: string) {
    const newAnswers = [...answers, {
      question_id: question.id,
      question_text: question.question_text,
      answer,
    }];
    setAnswers(newAnswers);

    if (currentQ + 1 < visibleQuestions.length) {
      setCurrentQ(currentQ + 1);
    } else {
      generateReview(newAnswers);
    }
  }

  async function generateReview(finalAnswers: Answer[]) {
    if (!business) return;
    setStep("generating");

    const { data: sessData, error: sessError } = await supabase
      .from("review_sessions")
      .insert({
        business_id: business.id,
        rating,
        answers: finalAnswers,
        ai_status: "pending",
        google_place_id_snapshot: business.google_place_id,
      })
      .select("*")
      .maybeSingle();

    if (sessError || !sessData) {
      setError("Failed to create review session.");
      setStep("rating");
      return;
    }
    setSession(sessData as ReviewSession);

    if (business) {
      supabase
        .from("analytics_events")
        .insert({
          business_id: business.id,
          session_id: sessData.id,
          event_type: "review_session_created",
          metadata: { rating },
        })
        .then(() => {});
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessData.id }),
        }
      );

      if (!res.ok) {
        throw new Error("AI generation failed");
      }

      const result = await res.json();
      const reviewText = result.review || result.ai_generated_review || "";

      if (reviewText) {
        setGeneratedReview(reviewText);
        setStep("reveal");
        if (business) {
          supabase
            .from("analytics_events")
            .insert({
              business_id: business.id,
              session_id: sessData.id,
              event_type: "review_completed",
              metadata: { rating },
            })
            .then(() => {});
        }
      } else {
        await pollForCompletion(sessData.id);
      }
    } catch {
      await pollForCompletion(sessData.id);
    }
  }

  const pollForCompletion = useCallback(async (sessionId: string) => {
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setError("AI review generation timed out. Please try again.");
        setStep("rating");
        return;
      }
      attempts++;

      const { data } = await supabase
        .from("review_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();

      if (data) {
        const s = data as ReviewSession;
        if (s.ai_status === "completed" && s.ai_generated_review) {
          setGeneratedReview(s.ai_generated_review);
          setSession(s);
          setStep("reveal");
          return;
        }
        if (s.ai_status === "failed") {
          setError("AI review generation failed. Please try again.");
          setStep("rating");
          return;
        }
      }
      setTimeout(poll, 2000);
    };
    poll();
  }, []);

  function reset() {
    setStep("welcome");
    setRating(0);
    setHoverRating(0);
    setCurrentQ(0);
    setAnswers([]);
    setSession(null);
    setGeneratedReview("");
    setCopied(false);
    setError(null);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(generatedReview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 h-10 w-10" />
      </div>
    );
  }

  if (error && step === "welcome") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="card max-w-md p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{
        background: `linear-gradient(135deg, ${primary}15 0%, ${secondary}10 50%, #ffffff 100%)`,
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-12">
        {step === "welcome" && business && (
          <div className="card w-full p-8 text-center animate-[fadeIn_0.5s_ease]">
            {business.logo_url && (
              <img
                src={business.logo_url}
                alt={business.name}
                className="mx-auto mb-6 h-20 w-20 rounded-2xl object-cover shadow-lg"
              />
            )}
            <h1 className="text-2xl font-bold text-slate-900">{business.name}</h1>
            {business.welcome_message && (
              <p className="mt-3 text-sm text-slate-600">{business.welcome_message}</p>
            )}
            <button
              onClick={startReview}
              className="btn-primary mt-8 w-full py-3 text-base"
              style={{ background: primary }}
            >
              Start Review
            </button>
          </div>
        )}

        {step === "rating" && business && (
          <div className="card w-full p-8 text-center animate-[fadeIn_0.4s_ease]">
            <h2 className="text-xl font-bold text-slate-900">How was your experience?</h2>
            <p className="mt-2 text-sm text-slate-500">Tap a star to rate us</p>

            <div className="my-10 flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => submitRating(star)}
                    className="transition-all duration-200"
                    style={{
                      transform: active ? "scale(1.15)" : "scale(1)",
                    }}
                  >
                    <div
                      className="relative h-14 w-14 transition-all duration-200"
                      style={{
                        filter: active
                          ? `drop-shadow(0 4px 12px ${primary}80)`
                          : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="h-full w-full">
                        <defs>
                          <linearGradient id={`star-${star}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={active ? "#fbbf24" : "#e2e8f0"} />
                            <stop offset="50%" stopColor={active ? "#f59e0b" : "#cbd5e1"} />
                            <stop offset="100%" stopColor={active ? "#d97706" : "#94a3b8"} />
                          </linearGradient>
                        </defs>
                        <path
                          d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.6 6.8L12 17.5 5.8 20.4l1.6-6.8L2.2 9l6.9-.7L12 2z"
                          fill={`url(#star-${star})`}
                          stroke={active ? "#d97706" : "#94a3b8"}
                          strokeWidth="0.5"
                        />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>

            {hoverRating > 0 && (
              <p className="text-sm font-medium text-slate-600">
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][hoverRating]}
              </p>
            )}
          </div>
        )}

        {step === "questions" && business && visibleQuestions.length > 0 && (
          <div className="card w-full p-8 animate-[fadeIn_0.4s_ease]">
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Question {currentQ + 1} of {visibleQuestions.length}</span>
                <span>{Math.round(((currentQ) / visibleQuestions.length) * 100)}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(currentQ / visibleQuestions.length) * 100}%`,
                    background: primary,
                  }}
                />
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              {visibleQuestions[currentQ].question_text}
            </h2>

            <div className="mt-6 space-y-3">
              {visibleQuestions[currentQ].options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => selectAnswer(visibleQuestions[currentQ], opt)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-all duration-200 hover:border-transparent hover:text-white hover:shadow-md"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "transparent";
                    e.currentTarget.style.background = primary;
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.background = "white";
                    e.currentTarget.style.color = "#334155";
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "questions" && visibleQuestions.length === 0 && (
          <div className="card w-full p-8 text-center">
            <p className="text-sm text-slate-600">No questions available. Generating your review...</p>
          </div>
        )}

        {step === "generating" && (
          <div className="card w-full p-12 text-center animate-[fadeIn_0.4s_ease]">
            <div className="relative mx-auto mb-6 h-16 w-16">
              <div
                className="absolute inset-0 animate-spin rounded-full border-2 border-slate-100"
                style={{ borderTopColor: primary }}
              />
              <div
                className="absolute inset-2 animate-pulse rounded-full"
                style={{ background: `${primary}20` }}
              />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Crafting your review...</h2>
            <p className="mt-2 text-sm text-slate-500">
              Our AI is writing a personalized review based on your feedback
            </p>
          </div>
        )}

        {step === "reveal" && business && (
          <div className="w-full animate-[fadeIn_0.5s_ease]">
            <div className="card overflow-hidden">
              <div
                className="px-6 py-4"
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
              >
                <p className="text-xs font-medium text-white/80">Your Review</p>
                <div className="mt-1 flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={s <= rating ? "text-amber-300" : "text-white/30"}>
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-6">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {generatedReview}
                </p>
              </div>

              <div className="border-t border-slate-100 p-4 space-y-3">
                <button
                  onClick={copyToClipboard}
                  className="btn-secondary w-full"
                >
                  {copied ? "✓ Copied!" : "Copy to Clipboard"}
                </button>

                {rating >= 4 && business.google_review_url && (
                  <a
                    href={business.google_review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn w-full py-3 text-base text-white"
                    style={{ background: primary }}
                  >
                    Leave Google Review
                  </a>
                )}

                <button onClick={reset} className="btn-ghost w-full">
                  Submit Another Review
                </button>
              </div>
            </div>
          </div>
        )}

        {error && step !== "welcome" && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-center text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
