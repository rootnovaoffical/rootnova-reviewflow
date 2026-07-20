import { useState, useRef, useEffect } from "react";
import BusinessShell from "./BusinessShell";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../lib/supabase";
import { updateProfile } from "../../lib/auth";
import { uploadAvatar, uploadBusinessLogo } from "../../lib/storage";
import { insertAuditLog } from "../../lib/auth";
import Avatar from "../../components/Avatar";
import { SkeletonCard } from "../../components/Skeleton";
import { ErrorState } from "../../components/States";
import type { Business } from "../../lib/types";

type Tab = "profile" | "business" | "branding" | "google" | "reviewflow";

export default function BusinessSettings() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("profile");
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const avatarRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({ full_name: profile?.full_name || "" });
  const [bizForm, setBizForm] = useState({
    name: "", business_category: "", location_city: "", contact_email: "", contact_phone: "", welcome_message: "",
  });
  const [brandForm, setBrandForm] = useState({ primary_color: "#6366f1", secondary_color: "#22d3ee" });
  const [googleForm, setGoogleForm] = useState({ google_review_url: "", google_place_id: "" });
  const [flowForm, setFlowForm] = useState({ public_review_enabled: true });

  useEffect(() => {
    if (!profile) return;
    supabase.from("business_admins").select("business_id").eq("user_id", profile.id).maybeSingle()
      .then(({ data }) => {
        if (!data?.business_id) { setLoading(false); return; }
        supabase.from("businesses").select("*").eq("id", data.business_id).single().then(({ data: b }) => {
          const biz = b as Business;
          setBusiness(biz);
          setBizForm({
            name: biz.name || "", business_category: biz.business_category || "", location_city: biz.location_city || "",
            contact_email: biz.contact_email || "", contact_phone: biz.contact_phone || "", welcome_message: biz.welcome_message || "",
          });
          setBrandForm({ primary_color: biz.primary_color || "#6366f1", secondary_color: biz.secondary_color || "#22d3ee" });
          setGoogleForm({ google_review_url: biz.google_review_url || "", google_place_id: biz.google_place_id || "" });
          setFlowForm({ public_review_enabled: biz.public_review_enabled });
          setLoading(false);
        });
      });
  }, [profile]);

  const saveProfile = async () => {
    if (!profile) return;
    await updateProfile(profile.id, { full_name: profileForm.full_name });
    await refreshProfile();
    showToast("Profile updated", "success");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const url = await uploadAvatar(profile.id, file);
    if (url) {
      await updateProfile(profile.id, { avatar_url: url });
      await refreshProfile();
      showToast("Avatar updated", "success");
    } else { showToast("Upload failed", "error"); }
    if (avatarRef.current) avatarRef.current.value = "";
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business) return;
    const url = await uploadBusinessLogo(business.id, file);
    if (url) {
      await supabase.from("businesses").update({ logo_url: url }).eq("id", business.id);
      if (profile) await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "business_logo_updated", target_type: "business", target_id: business.id });
      showToast("Logo updated", "success");
      supabase.from("businesses").select("*").eq("id", business.id).single().then(({ data }) => setBusiness(data as Business));
    } else { showToast("Upload failed", "error"); }
    if (logoRef.current) logoRef.current.value = "";
  };

  const saveBusiness = async () => {
    if (!business || !profile) return;
    const { error } = await supabase.from("businesses").update({
      name: bizForm.name, business_category: bizForm.business_category || null,
      location_city: bizForm.location_city || null, contact_email: bizForm.contact_email || null,
      contact_phone: bizForm.contact_phone || null, welcome_message: bizForm.welcome_message,
    }).eq("id", business.id);
    if (error) { showToast("Failed to save", "error"); return; }
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "business_updated", target_type: "business", target_id: business.id });
    showToast("Business info saved", "success");
  };

  const saveBranding = async () => {
    if (!business || !profile) return;
    const { error } = await supabase.from("businesses").update({
      primary_color: brandForm.primary_color, secondary_color: brandForm.secondary_color,
    }).eq("id", business.id);
    if (error) { showToast("Failed to save", "error"); return; }
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "branding_updated", target_type: "business", target_id: business.id });
    showToast("Branding saved", "success");
  };

  const saveGoogle = async () => {
    if (!business || !profile) return;
    const { error } = await supabase.from("businesses").update({
      google_review_url: googleForm.google_review_url || null,
      google_place_id: googleForm.google_place_id || null,
    }).eq("id", business.id);
    if (error) { showToast("Failed to save", "error"); return; }
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "google_config_updated", target_type: "business", target_id: business.id });
    showToast("Google destination saved", "success");
  };

  const saveFlow = async () => {
    if (!business || !profile) return;
    const { error } = await supabase.from("businesses").update({ public_review_enabled: flowForm.public_review_enabled }).eq("id", business.id);
    if (error) { showToast("Failed to save", "error"); return; }
    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "reviewflow_settings_updated", target_type: "business", target_id: business.id });
    showToast("ReviewFlow settings saved", "success");
  };

  if (loading) return <BusinessShell title="Settings"><div className="p-4 md:p-8 space-y-6"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div></BusinessShell>;
  if (!business) return <BusinessShell title="Settings"><ErrorState message="No business assigned to your account." /></BusinessShell>;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "profile", label: "My Profile", icon: "\uD83D\uDC64" },
    { key: "business", label: "Business Info", icon: "\uD83C\uDFE2" },
    { key: "branding", label: "Branding", icon: "\uD83C\uDFA8" },
    { key: "google", label: "Google Reviews", icon: "\uD83D\uDD17" },
    { key: "reviewflow", label: "ReviewFlow", icon: "\u2699\uFE0F" },
  ];

  return (
    <BusinessShell title="Settings">
      <div className="p-4 md:p-8 page-enter">
        {/* Tab navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? "btn-primary text-white" : "btn-ghost text-slate-300"}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="glass rounded-2xl p-6 max-w-lg" key={tab}>
          {tab === "profile" && (
            <div className="space-y-4 animate-fade-up">
              <h3 className="text-sm font-medium text-slate-400">My Profile</h3>
              <div className="flex items-center gap-4">
                <Avatar url={profile?.avatar_url} name={profile?.full_name} size="lg" />
                <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                <input value={profileForm.full_name} onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))} className="input-field w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input disabled value={profile?.email || ""} className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 rounded-lg text-slate-400 text-sm" />
              </div>
              <button onClick={saveProfile} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-lg">Save Profile</button>
            </div>
          )}

          {tab === "business" && (
            <div className="space-y-4 animate-fade-up">
              <h3 className="text-sm font-medium text-slate-400">Business Information</h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Business Name</label>
                <input value={bizForm.name} onChange={(e) => setBizForm((f) => ({ ...f, name: e.target.value }))} className="input-field w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <input value={bizForm.business_category} onChange={(e) => setBizForm((f) => ({ ...f, business_category: e.target.value }))} className="input-field w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">City</label>
                  <input value={bizForm.location_city} onChange={(e) => setBizForm((f) => ({ ...f, location_city: e.target.value }))} className="input-field w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Contact Email</label>
                  <input value={bizForm.contact_email} onChange={(e) => setBizForm((f) => ({ ...f, contact_email: e.target.value }))} className="input-field w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Contact Phone</label>
                  <input value={bizForm.contact_phone} onChange={(e) => setBizForm((f) => ({ ...f, contact_phone: e.target.value }))} className="input-field w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Welcome Message</label>
                <textarea value={bizForm.welcome_message} onChange={(e) => setBizForm((f) => ({ ...f, welcome_message: e.target.value }))} className="input-field w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none" rows={2} />
              </div>
              <button onClick={saveBusiness} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-lg">Save Business</button>
            </div>
          )}

          {tab === "branding" && (
            <div className="space-y-4 animate-fade-up">
              <h3 className="text-sm font-medium text-slate-400">Brand Identity</h3>
              <div className="flex items-center gap-4">
                {business.logo_url ? <img src={business.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">{business.name[0]}</div>}
                <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Primary Color</label>
                  <input type="color" value={brandForm.primary_color} onChange={(e) => setBrandForm((f) => ({ ...f, primary_color: e.target.value }))} className="w-full h-12 rounded-lg cursor-pointer bg-transparent border border-white/10" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">Accent Color</label>
                  <input type="color" value={brandForm.secondary_color} onChange={(e) => setBrandForm((f) => ({ ...f, secondary_color: e.target.value }))} className="w-full h-12 rounded-lg cursor-pointer bg-transparent border border-white/10" />
                </div>
              </div>
              {/* Live preview */}
              <div className="rounded-xl p-4 border border-white/10" style={{ background: `linear-gradient(135deg, ${brandForm.primary_color}15, ${brandForm.secondary_color}10)` }}>
                <div className="flex justify-center mb-2">
                  {business.logo_url ? <img src={business.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-cover" /> : <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: `linear-gradient(135deg, ${brandForm.primary_color}, ${brandForm.secondary_color})` }}>{business.name[0]}</div>}
                </div>
                <p className="text-center text-sm text-white">{bizForm.name || business.name}</p>
                <div className="flex justify-center mt-2">
                  <span className="px-4 py-1.5 text-white text-xs font-semibold rounded-lg" style={{ background: `linear-gradient(135deg, ${brandForm.primary_color}, ${brandForm.secondary_color})` }}>Share Your Experience</span>
                </div>
              </div>
              <button onClick={saveBranding} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-lg">Save Branding</button>
            </div>
          )}

          {tab === "google" && (
            <div className="space-y-4 animate-fade-up">
              <h3 className="text-sm font-medium text-slate-400">Google Review Destination</h3>
              <div className="glass rounded-xl p-3 border border-primary-500/20">
                <p className="text-xs text-slate-300">When customers rate 4+ stars, they'll be guided to post on Google using this destination.</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Google Review URL</label>
                <input value={googleForm.google_review_url} onChange={(e) => setGoogleForm((f) => ({ ...f, google_review_url: e.target.value }))} className="input-field w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none" placeholder="https://search.google.com/local/writereview?placeid=..." />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Google Place ID (optional)</label>
                <input value={googleForm.google_place_id} onChange={(e) => setGoogleForm((f) => ({ ...f, google_place_id: e.target.value }))} className="input-field w-full px-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none" placeholder="ChIJ..." />
              </div>
              <button onClick={saveGoogle} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-lg">Save Google Settings</button>
            </div>
          )}

          {tab === "reviewflow" && (
            <div className="space-y-4 animate-fade-up">
              <h3 className="text-sm font-medium text-slate-400">ReviewFlow Settings</h3>
              <label className="flex items-center gap-3 p-4 bg-slate-900/40 rounded-xl border border-white/5 cursor-pointer">
                <input type="checkbox" checked={flowForm.public_review_enabled} onChange={(e) => setFlowForm((f) => ({ ...f, public_review_enabled: e.target.checked }))} className="w-5 h-5 rounded accent-primary-500" />
                <div>
                  <p className="text-white text-sm font-medium">Public ReviewFlow Active</p>
                  <p className="text-xs text-slate-500 mt-0.5">When enabled, customers can access your review page and leave feedback.</p>
                </div>
              </label>
              <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-slate-500 mb-1">Your public review link:</p>
                <p className="text-sm text-primary-300 break-all">{window.location.origin}/r/{business.slug}</p>
              </div>
              <button onClick={saveFlow} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-lg">Save Settings</button>
            </div>
          )}
        </div>
      </div>
    </BusinessShell>
  );
}
