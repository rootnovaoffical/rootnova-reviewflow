import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import SpatialBackground from '../components/UI';
import { supabase } from '../lib/supabase';
import { Star, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface Props { businessSlug: string; }

export default function PublicReviewPage({ businessSlug }: Props) {
  const { showToast } = useToast();
  const [step, setStep] = useState<'welcome' | 'rating' | 'questions' | 'generating' | 'result'>('welcome');
  const [business, setBusiness] = useState<{ id: string; name: string; welcome_message: string | null; logo_url: string | null } | null>(null);
  const [questions, setQuestions] = useState<{ id: string; question_text: string; question_type: string; options: string[] | null; is_required: boolean; flow_type: string; sort_order: number }[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [review, setReview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBusiness() {
      try {
        const { data, error: err } = await supabase
          .from('businesses')
          .select('id, name, welcome_message, logo_url, public_review_enabled')
          .eq('slug', businessSlug)
          .maybeSingle();
        if (err) throw err;
        if (!data) { setError('Business not found'); return; }
        if (!(data as { public_review_enabled: boolean }).public_review_enabled) { setError('Reviews are not enabled for this business'); return; }
        setBusiness(data as typeof business);
      } catch (e) { setError((e as Error).message); }
    }
    loadBusiness();
  }, [businessSlug]);

  async function loadQuestions() {
    if (!business) return;
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('is_active', true)
      .eq('business_id', business.id)
      .order('sort_order', { ascending: true });
    setQuestions((data as typeof questions) || []);
  }

  function handleRating(r: number) {
    setRating(r);
    loadQuestions();
    setStep('questions');
  }

  function handleAnswer(qId: string, val: string) {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  }

  async function submitAnswers() {
    if (!business || !rating) return;
    const required = questions.filter((q) => q.is_required);
    for (const q of required) {
      if (!answers[q.id] || answers[q.id].trim() === '') {
        showToast('error', 'Please answer all required questions');
        return;
      }
    }
    setLoading(true);
    setStep('generating');
    try {
      const { data, error: err } = await supabase
        .from('review_sessions')
        .insert({ business_id: business.id, rating, answers, ai_status: 'pending' })
        .select()
        .single();
      if (err) throw err;
      const sessionId = (data as { id: string }).id;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-review`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const result = await res.json() as { review?: string; error?: string };
      if (result.error) throw new Error(result.error);
      setReview(result.review ?? 'Thank you for your feedback!');
      setStep('result');
    } catch (e) {
      showToast('error', `Failed to generate review: ${(e as Error).message}`);
      setStep('questions');
    } finally {
      setLoading(false);
    }
  }

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <SpatialBackground />
      <div className="relative z-10 text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Oops!</h1>
        <p className="text-zinc-400">{error}</p>
      </div>
    </div>
  );

  if (!business) return (
    <div className="min-h-screen flex items-center justify-center relative">
      <SpatialBackground />
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin relative z-10" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative">
      <SpatialBackground />
      <div className="relative z-10 w-full max-w-2xl">
        <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 sm:p-10 shadow-2xl">
          {business.logo_url && <img src={business.logo_url} alt={business.name} className="w-16 h-16 rounded-xl object-cover mb-4 mx-auto" />}
          {step === 'welcome' && (
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">{business.welcome_message || `Welcome to ${business.name}`}</h1>
              <p className="text-zinc-400 mb-8">We'd love to hear about your experience. Your feedback helps us improve.</p>
              <button onClick={() => setStep('rating')} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 font-medium transition-colors">
                Start Review <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {step === 'rating' && (
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">How was your experience?</h2>
              <p className="text-zinc-400 mb-8 text-sm">Tap the emoji that best matches your experience</p>
              <div className="grid grid-cols-5 gap-2 sm:gap-4">
                {[5, 4, 3, 2, 1].map((r) => (
                  <button key={r} onClick={() => handleRating(r)} className="group flex flex-col items-center gap-2 transition-all hover:scale-110">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl ${r >= 4 ? 'bg-emerald-500/20 border border-emerald-400/30' : r === 3 ? 'bg-blue-500/20 border border-blue-400/30' : 'bg-red-500/20 border border-red-400/30'}`}>
                      {r === 5 ? '🤩' : r === 4 ? '😀' : r === 3 ? '😐' : r === 2 ? '😕' : '😡'}
                    </div>
                    <span className="text-xs text-zinc-400">{r === 5 ? 'Amazing' : r === 4 ? 'Good' : r === 3 ? 'Okay' : r === 2 ? 'Poor' : 'Terrible'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 'questions' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">A few quick questions</h2>
              <div className="space-y-5">
                {questions.length === 0 ? (
                  <p className="text-zinc-400 text-sm">No questions configured. Click continue to generate your review.</p>
                ) : questions.map((q) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-zinc-200 mb-2">{q.question_text}{q.is_required && <span className="text-red-400"> *</span>}</label>
                    {q.question_type === 'text' ? (
                      <input type="text" value={answers[q.id] ?? ''} onChange={(e) => handleAnswer(q.id, e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-400/50" placeholder="Your answer…" />
                    ) : q.question_type === 'multiple_choice' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(q.options || []).map((o) => (
                          <button key={o} onClick={() => handleAnswer(q.id, o)} className={`px-3 py-2 rounded-lg text-left text-sm border transition-colors ${answers[q.id] === o ? 'bg-blue-500/20 border-blue-400/30 text-blue-200' : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'}`}>
                            {o}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {[5, 4, 3, 2, 1].map((r) => (
                          <button key={r} onClick={() => handleAnswer(q.id, String(r))} className={`w-10 h-10 rounded-lg border ${answers[q.id] === String(r) ? 'bg-amber-500/30 border-amber-400/50 text-amber-200' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}>
                            <Star className="w-5 h-5 mx-auto" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={submitAnswers} disabled={loading} className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 font-medium transition-colors disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}
          {step === 'generating' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-bold text-white mb-2">Generating your review…</h2>
              <p className="text-zinc-400 text-sm">Our AI is crafting a personalized review based on your feedback.</p>
            </div>
          )}
          {step === 'result' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-4">Your Review is Ready!</h2>
              <div className="rounded-xl bg-white/5 border border-white/10 p-5 text-left mb-6">
                <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">{review}</p>
              </div>
              <button onClick={() => { setStep('welcome'); setRating(null); setAnswers({}); setReview(null); }} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 text-sm">
                Submit Another
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-zinc-600 mt-4">Powered by RootNova ReviewFlow</p>
      </div>
    </div>
  );
}
