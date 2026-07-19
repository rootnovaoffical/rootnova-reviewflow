import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export default function PartnerNewBusiness() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", slug: "", welcome_message: "", google_review_url: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    const { data: mem } = await supabase.from("organization_members").select("organization_id").eq("user_id", profile.id).single();
    if (!mem?.organization_id) { showToast("No organization found", "error"); setLoading(false); return; }
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data, error } = await supabase.from("businesses").insert({
      name: form.name, slug, welcome_message: form.welcome_message || "We'd love to hear about your experience!",
      google_review_url: form.google_review_url || null, organization_id: mem.organization_id, status: "active",
    }).select().single();
    if (error) { showToast(error.message, "error"); setLoading(false); return; }
    showToast("Business created", "success");
    navigate(`/partner/businesses/${data.id}`);
  };

  return (
    <Layout title="New Business">
      <div className="glass rounded-2xl p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Name</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Slug (optional)</label>
            <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="auto-generated from name"Nature_flags").ictiolJ       <input value={form.slug} o/m.slug} onChange={(e) => setFosaew_e focus:outlilug || form.namone focus:border-primary-500" />
             const slug = f    <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Name</label>
            <input required value={form.namrows={3}...f, slug: e.target.value }))} placeholder="auto-generated from name"Nature_flags").ictiolJ       <input value={forGdata,        URLite/10 rounded-lg text-white focus:outli data, error } = one focus:border-primary-500" />
          -|-$/g, "");
    co
          <div>
            <labhttps://-|-$/g.con/mapste Asset</h3>
          <laate-300 mb-1.5">Slug (optional)</label>
            <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}       <}>
   sted","g-slate-900ofile }-400" : "bg-erro6te-300 mbOTNOVA_SUPER_ADMIN">RootNova Supenge={handleUpload} <img src={b.logo_semimap((lect>
        </div>
 a

  0ofile }ld">criptione Ass: file]);
or) { sho               <but</outln-colors">Send Invite>
              <p className="text-xs text-slate-500">{b.status} • {b.public_review_enabled ? "Reviews enabled" : "Reviews disabled"}</p>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
