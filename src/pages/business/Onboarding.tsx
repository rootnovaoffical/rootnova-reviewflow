import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { uploadBusinessLogo } from "../../lib/storage";
import { slugify } from "../../lib/utils";
import { insertAuditLog } from "../../lib/auth";
import SpatialBackground from "../../components/SpatialBackground";
import type { Business } from "../../lib/types";

const CATEGORIES = [
  "Restaurant", "Cafe", "Salon", "Spa", "Clinic", "Dental",
  "Gym", "Retail Store", "Hotel", "Real Estate", "Auto Service",
  "Legal Services", "Other",
];

const STEPS = ["Identity", "Branding", "Google", "Questions", "Review"];

export default function BusinessOnboarding() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [existingBusiness, setExistingBusiness] = useState<Business | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slugOk, setSlugOk] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    business_category: "",
    location_city: "",
    contact_email: "",
    contact_phone: "",
    welcome_message: "We'd love to hear about your experience!",
    primary_color: "#6366f1",
    secondary_color: "#22d3ee",
    google_review_url: "",
    google_place_id: "",
    logo_url: "",
  });

  const [questions, setQuestions] = useState<{ question_text: string; options: string }[]>([
    { question_text: "What did you enjoy most?", options: "Food\nService\nAtmosphere\nValue" },
  ]);

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).maybeSingle()
      .then(({ data }) => {
        if (!data?.business_id) { setChecking(false); return; }
        supabase.from("businesses").select("*").eq("id", data.business_id).single().then(({ data: b }) => {
          const biz = b as Business;
          setExistingBusiness(biz);
          if (biz) {
            setForm({
              name: biz.name || "",
              slug: biz.slug || "",
              business_category: biz.business_category || "",
              location_city: biz.location_city || "",
              contact_email: biz.contact_email || "",
              contact_phone: biz.contact_phone || "",
              welcome_message: biz.welcome_message || "We'd love to hear about your experience!",
              primary_color: biz.primary_color || "#6366f1",
              secondary_color: biz.secondary_color || "#22d3ee",
              google_review_url: biz.google_review_url || "",
              google_place_id: biz.google_place_id || "",
              logo_url: biz.logo_url || "",
            });
          }
          setChecking(false);
        });
      });
  }, [profile]);

  // Debounced slug check
  useEffect(() => {
    if (!form.slug || form.slug.length < 2) { setSlugOk(null); return; }
    if (existingBusiness && form.slug === existingBusiness.slug) { setSlugOk(true); return; }
    setCheckingSlug(true);
    if (slugTimer.current) clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => {
      const { data } = await supabase.from("businesses").select("id").eq("slug", form.slug).maybeSingle();
      setSlugOk(!data);
      setCheckingSlug(false);
    }, 400);
    return () => { if (slugTimer.current) clearTimeout(slugTimer.current); };
  }, [form.slug, existingBusiness]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !existingBusiness) {
      showToast("Save your business first before uploading a logo", "info");
      return;
    }
    const url = await uploadBusinessLogo(existingBusiness.id, file);
    if (url) {
      await supabase.from("businesses").update({ logo_url: url }).eq("id", existingBusiness.id);
      setForm((f) => ({ ...f, logo_url: url }));
      showToast("Logo uploaded", "success");
    } else {
      showToast("Upload failed", "error");
    }
    if (logoRef.current) logoRef.current.value = "";
  };

  const saveBusiness = async (): Promise<Business | null> => {
    if (!profile) return null;
    const slug = form.slug || slugify(form.name);
    if (!form.name || !slug) { showToast("Business name is required", "error"); return null; }

    const payload = {
      name: form.name,
      slug,
      business_category: form.business_category || null,
      location_city: form.location_city || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      welcome_message: form.welcome_message,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      google_review_url: form.google_review_url || null,
      google_place_id: form.google_place_id || null,
      public_review_enabled: true,
      status: "active",
    };

    if (existingBusiness) {
      const { data, error } = await supabase.from("businesses").update(payload).eq("id", existingBusiness.id).select().single();
      if (error) { showToast("Failed to save business", "error"); return null; }
      return data as Business;
    } else {
      const { data, error } = await supabase.from("businesses").insert(payload).select().single();
      if (error) { showToast("Failed to create business", "error"); return null; }
      const biz = data as Business;
      await supabase.from("business_admins").insert({ business_id: biz.id, user_id: profile.id });
      await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "business_created", target_type: "business", target_id: biz.id });
      setExistingBusiness(biz);
      return biz;
    }
  };

  const saveQuestions = async (businessId: string) => {
    const validQuestions = questions.filter((q) => q.question_text.trim());
    if (validQuestions.length === 0) return;

    const { error: deleteError } = await supabase.from("questions").delete().eq("business_id", businessId);
    if (deleteError) { showToast("Failed to update questions", "error"); return; }

    const inserts = validQuestions.map((q, i) => ({
      business_id: businessId,
      question_text: q.question_text.trim(),
      question_type: "multiple_choice",
      flow_type: "ALL",
      options: q.options.split("\n").filter(Boolean),
      is_required: true,
      is_active: true,
      sort_order: i,
    }));

    const { error } = await supabase.from("questions").insert(inserts);
    if (error) showToast("Failed to save questions", "error");
  };

  const handleNext = async () => {
    if (step === 0 && (!form.name || form.name.length < 2)) { showToast("Enter a business name", "error"); return; }
    if (step === 0 && slugOk === false) { showToast("This URL slug is already taken", "error"); return; }
    if (step < STEPS.length - 1) {
      if (step === 0) {
        setSaving(true);
        await saveBusiness();
        setSaving(false);
      }
      setStep((s) => s + 1);
    }
  };

  const handleFinish = async () => {
    if (!existingBusiness || !profile) return;
    setSaving(true);
    await saveBusiness();
    await saveQuestions(existingBusiness.id);
    await supabase.from("businesses").update({ onboarding_completed: true }).eq("id", existingBusiness.id);
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "onboarding_completed", target_type: "business", target_id: existingBusiness.id });
    setSaving(false);
    showToast("Onboarding complete! Your ReviewFlow is live.", "success");
    navigate("/business");
  };

  if (checking) {
    return (
      <>
        <SpatialBackground />
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </>
    );
  }

  const reviewUrl = form.slug ? `${window.location.origin}/r/${form.slug}` : null;
  const googleDest = form.google_review_url || (form.google_place_id ? `https://search.google.com/local/writereview?placeid=${form.google_place_id}` : null);

  return (
    <>
      <SpatialBackground />
      <div className="min-h-screen flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              Set Up Your ReviewFlow
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? "bg-gradient-to-r from-primary-500 to-accent-400" : "bg-white/10"}`} />
                <p className={`text-xs mt-1.5 text-center transition-colors ${i <= step ? "text-primary-300" : "text-slate-600"}`}>{s}</p>
              </div>
            ))}
          </div>

          <div className="glass-strong rounded-3xl p-8 page-enter" key={step}>
            {/* Step 0: Identity */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Name <span className="text-error-400">*</span></label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                    className="input-field w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                    placeholder="e.g. Sunrise Cafe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Your Review Link</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm whitespace-nowrap">rootnova.app/r/</span>
                    <input
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                      className="input-field flex-1 px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                      placeholder="sunrise-cafe"
                    />
                  </div>
                  <div className="mt-1.5">
                    {checkingSlug && <p className="text-xs text-slate-500">Checking...</p>}
                    {!checkingSlug && slugOk === true && <p className="text-xs text-success-400">{"\u2713"} Available — your link: {reviewUrl}</p>}
                    {!checkingSlug && slugOk === false && <p className="text-xs text-error-400">{"\u2717"} This slug is already taken</p>}
                    {slugOk === null && form.slug && <p className="text-xs text-slate-500">Your review link: {reviewUrl}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
                    <select
                      value={form.business_category}
                      onChange={(e) => setForm((f) => ({ ...f, business_category: e.target.value }))}
                      className="input-field w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">City</label>
                    <input
                      value={form.location_city}
                      onChange={(e) => setForm((f) => ({ ...f, location_city: e.target.value }))}
                      className="input-field w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                      placeholder="e.g. Mumbai"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Contact Email</label>
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                      className="input-field w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                      placeholder="contact@business.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Contact Phone</label>
                    <input
                      value={form.contact_phone}
                      onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                      className="input-field w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                      placeholder="+91 ..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Branding with live preview */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Welcome Message</label>
                  <textarea
                    value={form.welcome_message}
                    onChange={(e) => setForm((f) => ({ ...f, welcome_message: e.target.value }))}
                    className="input-field w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                    rows={2}
                    placeholder="We'd love to hear about your experience!"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Brand Colors</label>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Primary</label>
                      <input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="w-full h-12 rounded-lg cursor-pointer bg-transparent border border-white/10" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Accent</label>
                      <input type="color" value={form.secondary_color} onChange={(e) => setForm((f) => ({ ...f, secondary_color: e.target.value }))} className="w-full h-12 rounded-lg cursor-pointer bg-transparent border border-white/10" />
                    </div>
                  </div>
                </div>
                {existingBusiness && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Logo</label>
                    <div className="flex items-center gap-4">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">
                          {form.name[0] || "?"}
                        </div>
                      )}
                      <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer" />
                    </div>
                  </div>
                )}
                {/* Live preview */}
                <div>
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Live Preview</p>
                  <div className="rounded-2xl p-6 border border-white/10" style={{ background: `linear-gradient(135deg, ${form.primary_color}15, ${form.secondary_color}10)` }}>
                    <div className="flex justify-center mb-4">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border border-white/10" />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl" style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})` }}>
                          {form.name[0] || "?"}
                        </div>
                      )}
                    </div>
                    <h3 className="text-center text-lg font-bold text-white mb-1">{form.name || "Your Business"}</h3>
                    <p className="text-center text-sm text-slate-300 mb-4">{form.welcome_message || "We'd love to hear about your experience!"}</p>
                    <div className="flex justify-center">
                      <button className="px-6 py-2.5 text-white text-sm font-semibold rounded-xl" style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})` }}>
                        Share Your Experience
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Google */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="glass rounded-xl p-4 border border-primary-500/20">
                  <p className="text-sm text-slate-300">
                    {"\u2139\uFE0F"} When customers rate 4+ stars, they'll be guided to post their review on Google. This drives your Google rating up with authentic reviews.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Google Review URL</label>
                  <input
                    value={form.google_review_url}
                    onChange={(e) => setForm((f) => ({ ...f, google_review_url: e.target.value }))}
                    className="input-field w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                    placeholder="https://search.google.com/local/writereview?placeid=..."
                  />
                  <p className="text-xs text-slate-500 mt-1">The direct link where customers will post their review on Google.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-slate-600">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Google Place ID (optional)</label>
                  <input
                    value={form.google_place_id}
                    onChange={(e) => setForm((f) => ({ ...f, google_place_id: e.target.value }))}
                    className="input-field w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                    placeholder="ChIJ..."
                  />
                  <p className="text-xs text-slate-500 mt-1">If you don't have a direct URL, we'll create one from your Place ID.</p>
                </div>
                {/* Google handoff preview */}
                {googleDest && (
                  <div className="glass rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Preview: Google Handoff</p>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{"\u2B50"}</div>
                      <div className="flex-1">
                        <p className="text-sm text-white">Happy customer (4+ stars)</p>
                        <p className="text-xs text-slate-400">{"\u2193"} Directed to Google Reviews</p>
                      </div>
                      <div className="text-2xl">{"\uD83D\uDD17"}</div>
                    </div>
                    <p className="text-xs text-primary-300 mt-2 break-all">{googleDest}</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Questions */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="glass rounded-xl p-4 border border-primary-500/20">
                  <p className="text-sm text-slate-300">
                    Add quick questions customers answer after rating. Their answers help the AI craft a personalized, authentic review.
                  </p>
                </div>
                {questions.map((q, i) => (
                  <div key={i} className="glass rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 shrink-0">Q{i + 1}</span>
                      <input
                        value={q.question_text}
                        onChange={(e) => setQuestions((qs) => qs.map((x, j) => j === i ? { ...x, question_text: e.target.value } : x))}
                        className="input-field flex-1 px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
                        placeholder="What did you enjoy most?"
                      />
                      {questions.length > 1 && (
                        <button
                          onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}
                          className="px-2 py-2 text-error-400 hover:bg-error-500/10 rounded-lg transition-colors text-sm shrink-0"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      value={q.options}
                      onChange={(e) => setQuestions((qs) => qs.map((x, j) => j === i ? { ...x, options: e.target.value } : x))}
                      className="input-field w-full px-3 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
                      rows={3}
                      placeholder="One option per line"
                    />
                  </div>
                ))}
                <button
                  onClick={() => setQuestions((qs) => [...qs, { question_text: "", options: "" }])}
                  className="btn-ghost w-full py-2.5 text-white text-sm font-medium rounded-lg"
                >
                  + Add Question
                </button>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Review Your Setup</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between"><dt className="text-slate-500">Business</dt><dd className="text-white">{form.name || "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Category</dt><dd className="text-white">{form.business_category || "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">City</dt><dd className="text-white">{form.location_city || "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Review Link</dt><dd className="text-primary-300 break-all">{reviewUrl || "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Google Review</dt><dd className="text-white">{googleDest ? "Configured" : "Not set"}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Questions</dt><dd className="text-white">{questions.filter((q) => q.question_text.trim()).length} configured</dd></div>
                    <div className="flex justify-between items-center"><dt className="text-slate-500">Colors</dt><dd className="flex gap-2"><div className="w-5 h-5 rounded" style={{ background: form.primary_color }} /><div className="w-5 h-5 rounded" style={{ background: form.secondary_color }} /></dd></div>
                  </dl>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  You can change any of these later from your dashboard.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="btn-ghost px-6 py-3 text-white font-medium rounded-xl"
                >
                  Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={saving}
                  className="btn-primary flex-1 py-3 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Continue"}
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="btn-primary flex-1 py-3 text-white font-semibold rounded-xl disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}
                >
                  {saving ? "Completing..." : "Complete Setup"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
