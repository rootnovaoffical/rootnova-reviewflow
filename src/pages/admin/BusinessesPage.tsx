// Businesses management — RootNova admin only. List + create + edit.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listBusinesses, createBusiness, updateBusiness, deleteBusiness, slugify, ensureUniqueSlug, publicReviewUrl } from "../../lib/business";
import type { Business } from "../../types";
import { Button, Card, Input, Textarea, Select, Badge, Loading, EmptyState, Modal } from "../../components/ui";
import { Building2, Plus, ExternalLink, Copy, Check, Pencil, Trash2, Store } from "lucide-react";

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Business | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listBusinesses();
      setBusinesses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load businesses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function copyUrl(slug: string) {
    try {
      await navigator.clipboard.writeText(publicReviewUrl(slug));
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      // ignore
    }
  }

  async function handleDelete(biz: Business) {
    if (!confirm(`Delete "${biz.name}"? This will also delete its questions, sessions, and analytics. This cannot be undone.`)) return;
    try {
      await deleteBusiness(biz.id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) return <Loading label="Loading businesses..." />;
  if (error) return <Card className="p-8"><EmptyState title="Couldn't load businesses" description={error} /></Card>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Businesses</h1>
          <p className="mt-1 text-sm text-slate-400">Create and manage every business on the platform.</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> New business
        </Button>
      </header>

      {businesses.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<Building2 className="w-10 h-10" />}
            title="No businesses yet"
            description="Create your first business to start collecting reviews."
            action={<Button onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="w-4 h-4" /> Create business</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {businesses.map((biz) => (
            <Card key={biz.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${biz.primary_color || "#6366f1"}, ${biz.secondary_color || "#a855f7"})` }}>
                    {biz.logo_url ? (
                      <img src={biz.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Store className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/admin/businesses/${biz.id}`} className="font-semibold text-white hover:text-indigo-300 truncate block">
                      {biz.name}
                    </Link>
                    <p className="text-xs text-slate-500 truncate">/r/{biz.slug}</p>
                  </div>
                </div>
                <Badge color={biz.status === "active" ? "green" : "slate"}>{biz.status}</Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => copyUrl(biz.slug)} className="flex-1">
                  {copiedSlug === biz.slug ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy URL</>}
                </Button>
                <a href={publicReviewUrl(biz.slug)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 transition">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(biz); setShowForm(true); }}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-300" onClick={() => handleDelete(biz)}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
                <Link to={`/admin/businesses/${biz.id}`} className="ml-auto text-sm text-indigo-400 hover:text-indigo-300 font-medium">Details →</Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <BusinessFormModal
          business={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

function BusinessFormModal({ business, onClose, onSaved }: { business: Business | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(business?.name || "");
  const [slug, setSlug] = useState(business?.slug || "");
  const [slugTouched, setSlugTouched] = useState(!!business);
  const [welcomeMessage, setWelcomeMessage] = useState(business?.welcome_message || "");
  const [logoUrl, setLogoUrl] = useState(business?.logo_url || "");
  const [primaryColor, setPrimaryColor] = useState(business?.primary_color || "#6366f1");
  const [secondaryColor, setSecondaryColor] = useState(business?.secondary_color || "#a855f7");
  const [googlePlaceId, setGooglePlaceId] = useState(business?.google_place_id || "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(business?.google_maps_url || "");
  const [status, setStatus] = useState(business?.status || "active");
  const [publicReviewEnabled, setPublicReviewEnabled] = useState(business?.public_review_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-suggest slug from name unless slug was manually edited.
  useEffect(() => {
    if (!slugTouched && !business) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched, business]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const finalSlug = slug || slugify(name);
      const payload = {
        name,
        slug: finalSlug,
        welcome_message: welcomeMessage || "We'd love to hear about your experience!",
        logo_url: logoUrl || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        google_place_id: googlePlaceId || null,
        google_maps_url: googleMapsUrl || null,
        google_review_url: null,
        status: status as "active" | "inactive",
        public_review_enabled: publicReviewEnabled,
      };
      if (!payload.google_place_id) {
        setError("Google Place ID is required.");
        setSaving(false);
        return;
      }
      if (business) {
        let updatedSlug = finalSlug;
        if (finalSlug !== business.slug) {
          updatedSlug = await ensureUniqueSlug(finalSlug, business.id);
        }
        await updateBusiness(business.id, { ...payload, slug: updatedSlug });
      } else {
        const uniqueSlug = await ensureUniqueSlug(finalSlug);
        await createBusiness({ ...payload, slug: uniqueSlug });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={business ? "Edit business" : "New business"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Business name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Happy Hour Cafe" />
        <Input
          label="Slug (public URL identifier)"
          required
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
          hint={`Public URL: /r/${slug || "your-slug"}`}
          placeholder="happy-hour-cafe"
        />
        <Textarea label="Welcome message" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} placeholder="We'd love to hear about your experience!" />
        <Input label="Logo URL (optional)" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." hint="Paste a publicly accessible image URL." />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Primary color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-10 rounded-lg bg-transparent cursor-pointer" />
              <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 rounded-xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-slate-100" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Secondary color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-12 h-10 rounded-lg bg-transparent cursor-pointer" />
              <input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1 rounded-xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-slate-100" />
            </div>
          </div>
        </div>
        <Input label="Google Place ID (required)" required value={googlePlaceId} onChange={(e) => setGooglePlaceId(e.target.value)} hint="The canonical Google identifier for this business. The review URL is generated automatically from this." placeholder="ChIJ..." />
        <Input label="Google Maps / Listing URL (optional)" value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." hint="Used only as a fallback if the Place ID can't resolve a review URL." />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">Public reviews</label>
            <label className="flex items-center gap-2 h-[42px] px-3.5 rounded-xl bg-slate-950/60 border border-slate-700 cursor-pointer">
              <input type="checkbox" checked={publicReviewEnabled} onChange={(e) => setPublicReviewEnabled(e.target.checked)} className="accent-indigo-500" />
              <span className="text-sm text-slate-300">{publicReviewEnabled ? "Enabled" : "Disabled"}</span>
            </label>
          </div>
        </div>
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{business ? "Save changes" : "Create business"}</Button>
        </div>
      </form>
    </Modal>
  );
}
