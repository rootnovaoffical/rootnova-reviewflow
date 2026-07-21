import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import SpatialBackground from '../components/SpatialBackground';
import StarRating3D from '../components/StarRating3D';
import { Sparkles, ArrowRight, ArrowLeft, Copy, RefreshCw, ExternalLink, Check } from 'lucide-react';

type Step = 'welcome' | 'rating' | 'questions' | 'generating' | 'result';

interface Business { id: string; name: string; slug: string; welcome_message: string | null; google_review_url: string | null; }
interface QuestionRow { id: string; question_text: string; flow_type: string; options: string[] | null; question_type: string; sort_order: number; }

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))]);
}

export default function PublicReviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('welcome');
  const [rating, setRating] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBusiness() {
      if (!slug) return;
      try {
        const { data, error: err } = await supabase.from('businesses').select('*').eq('slug', slug).single();
        if (err) throw err;
        if (data) setBusiness(data as Business);
      } catch { setError('Business not found'); }
      finally { setLoading(false); }
    }
    loadBusiness();
  }, [slug]);

  async function startReview() {
    if (!business) return;
    try {
      const { data, error: err } = await supabase.from('review_sessions').insert({ business_id: business.id, ai_status: 'pending' }).select().single();
      if (err) throw err;
      setSessionId(data.id);
      setStep('rating');
    } catch { setError('Failed to start review session'); }
  }

  async function onRatingSelect(r: number) {
    setRating(r);
    try {
      const { data } = await supabase.from('questions').select('*').eq('business_id', business?.id).eq('is_active', true).order('sort_order', { ascending: true });
      if (data) {
        const filtered = (data as QuestionRow[]).filter((q) => {
          if (q.flow_type === 'positive' && r < 4) return false;
          if (q.flow_type === 'negative' && r >= 4) return false;
          if (q.flow_type === 'neutral' && (r < 3 || r > 3)) return false;
          return true;
        });
        setQuestions(filtered);
      }
      setStep('questions');
    } catch { setStep('questions'); }
  }

  const generateReview = useCallback(async (regenerate = false) => {
    setStep('generating');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const response = await withTimeout(
        fetch(`${supabaseUrl}/functions/v1/generate-review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
          body: JSON.stringify({ sessionId, rating, answers, businessId: business?.id, businessName: business?.name, regenerate }),
        }), 30000
      );
      if (!response.ok) throw new Error('Generation failed');
      const data = await response.json();
      setAiReview(data.review || data.text || '');
      setStep('result');
    } catch {
      setAiReview(generateFallbackReview(business?.name || '', rating || 0, answers));
      setStep('result');
    }
  }, [sessionId, rating, answers, business]);

  function generateFallbackReview(name: string, r: number, ans: Record<string, string>): string {
    const positive = r >= 4;
    const parts: string[] = [];
    if (positive) parts.push(`I had a fantastic experience at ${name}.`);
    else if (r === 3) parts.push(`My visit to ${name} was decent overall.`);
    else parts.push(`Unfortunately, my experience at ${name} was disappointing.`);
    const answerTexts = Object.values(ans).filter(Boolean);
    if (answerTexts.length > 0) parts.push(answerTexts.slice(0, 2).join('. '));
    if (positive) parts.push(`The staff was friendly and attentive. I would definitely recommend ${name} to others.`);
    else if (r === 3) parts.push(`There's room for improvement, but the service was acceptable.`);
    else parts.push(`I hope they can address these issues going forward.`);
    return parts.join(' ');
  }

  function copyReview() {
    navigator.clipboard.writeText(aiReview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (<div className="relative min-h-screen flex items-center justify-center"><SpatialBackground /><p className="relative z-10 text-zinc-400">Loading…</p></div>);
  if (error) return (<div className="relative min-h-screen flex items-center justify-center"><SpatialBackground /><div className="relative z-10 text-center"><h1 className="text-2xl font-bold text-white mb-2">Oops!</h1><p className="text-zinc-400">{error}</p></div></div>);
  if (!business) return null;

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <SpatialBackground />
      <div className="relative z-10 w-full max-w-lg">
        {step === 'welcome' && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 mb-4"><Sparkles className="w-8 h-8 text-blue-400" /></div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to {business.name}</h1>
            {business.welcome_message && <p className="text-zinc-400 text-sm mb-6">{business.welcome_message}</p>}
            <p className="text-zinc-300 text-sm mb-6">We'd love to hear about your experience. Your feedback helps us improve and grow.</p>
            <button onClick={startReview} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:from-blue-600 hover:to-cyan-600 transition-all text-sm">Start Review <ArrowRight className="w-4 h-4" /></button>
          </div>
        )}
        {step === 'rating' && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-white text-center mb-2">How was your experience?</h2>
            <p className="text-zinc-400 text-sm text-center mb-8">Tap a rating to get started</p>
            <StarRating3D value={rating} onChange={onRatingSelect} />
          </div>
        )}
        {step === 'questions' && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-4">Tell us more</h2>
            {questions.length === 0 ? <p className="text-zinc-400 text-sm mb-6">No additional questions. Let's generate your review!</p> : (
              <div className="space-y-5 mb-6">
                {questions.map((q) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">{q.question_text}</label>
                    {q.options && Array.isArray(q.options) && q.options.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt) => <button key={opt} onClick={() => setAnswers({ ...answers, [q.id]: opt })} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${answers[q.id] === opt ? 'bg-blue-500/20 border-blue-400/30 text-blue-200' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}>{opt}</button>)}
                      </div>
                    ) : <textarea value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-400/50" placeholder="Type your answer…" />}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <button onClick={() => setStep('rating')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
              <button onClick={() => generateReview(false)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 text-sm font-medium">Generate Review <Sparkles className="w-4 h-4" /></button>
            </div>
          </div>
        )}
        {step === 'generating' && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 mb-4"><Sparkles className="w-8 h-8 text-blue-400 animate-pulse" /></div>
            <h2 className="text-xl font-semibold text-white mb-2">Generating your review…</h2>
            <p className="text-zinc-400 text-sm">Our AI is crafting a personalized review based on your feedback.</p>
          </div>
        )}
        {step === 'result' && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-2">Your Review</h2>
            <p className="text-zinc-400 text-sm mb-4">Here's a review generated from your feedback. Feel free to copy it or post it directly to Google.</p>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-5"><p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{aiReview}</p></div>
            <div className="flex flex-wrap gap-3">
              <button onClick={copyReview} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 text-sm">{copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied!' : 'Copy'}</button>
              <button onClick={() => generateReview(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 text-sm"><RefreshCw className="w-4 h-4" /> Regenerate</button>
              {business.google_review_url && <a href={business.google_review_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 text-sm font-medium"><ExternalLink className="w-4 h-4" /> Post on Google</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
