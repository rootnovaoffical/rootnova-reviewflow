import { useEffect, useState } from 'react';
import { Save, ExternalLink, QrCode as QrIcon, Link2, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, EmptyState, PageHeader, Card, Button, Input, TextArea } from '../components/UI';
import { useToast } from '../context/ToastContext';

interface BusinessRecord {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  welcome_message: string | null;
  google_review_url: string | null;
  public_review_enabled: boolean;
  business_category: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location_city: string | null;
}

type FormState = {
  name: string;
  slug: string;
  logo_url: string;
  welcome_message: string;
  google_review_url: string;
  public_review_enabled: boolean;
  business_category: string;
  contact_email: string;
  contact_phone: string;
  location_city: string;
};

export default function BusinessSettingsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [form, setForm] = useState<FormState>({
    name: '', slug: '', logo_url: '', welcome_message: '', google_review_url: '',
    public_review_enabled: true, business_category: '', contact_email: '', contact_phone: '', location_city: '',
  });

  async function fetchBusiness() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug, logo_url, welcome_message, google_review_url, public_review_enabled, business_category, contact_email, contact_phone, location_city')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      const b = data as BusinessRecord;
      setBusiness(b);
      setForm({
        name: b.name ?? '',
        slug: b.slug ?? '',
        logo_url: b.logo_url ?? '',
        welcome_message: b.welcome_message ?? '',
        google_review_url: b.google_review_url ?? '',
        public_review_enabled: b.public_review_enabled,
        business_category: b.business_category ?? '',
        contact_email: b.contact_email ?? '',
        contact_phone: b.contact_phone ?? '',
        location_city: b.location_city ?? '',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load business settings';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('error', 'Business name is required');
      return;
    }
    if (!form.slug.trim()) {
      showToast('error', 'Slug is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        logo_url: form.logo_url.trim() || null,
        welcome_message: form.welcome_message.trim() || null,
        google_review_url: form.google_review_url.trim() || null,
        public_review_enabled: form.public_review_enabled,
        business_category: form.business_category.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        location_city: form.location_city.trim() || null,
      };

      const { error } = await supabase.from('businesses').update(payload).eq('id', businessId);
      if (error) throw error;
      showToast('success', 'Business settings saved');
      await fetchBusiness();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  }

  function qrImageUrl(url: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }

  if (loading) return <LoadingSpinner label="Loading settings..." />;
  if (!business) return <EmptyState icon={Building2} title="Business not found" description="Could not load this business record." />;

  const reviewUrl = `${window.location.origin}/review/${form.slug}`;

  return (
    <div>
      <PageHeader
        title="Business Settings"
        description="Configure your business profile and public review page"
        action={<Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}</Button>}
      />

      {/* Public review link + QR */}
      <Card className="p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="shrink-0">
            <img src={qrImageUrl(reviewUrl)} alt="Review link QR code" className="w-32 h-32 rounded-lg bg-white p-1.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Public Review Link</h3>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-blue-300 break-all">{reviewUrl}</code>
              <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Customers scan this QR code or visit the link to leave a review.</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Acme Corp" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Slug</label>
            <Input value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="acme-corp" />
            <p className="text-xs text-zinc-500 mt-1">Used in your public review URL</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Logo URL</label>
            <Input value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Welcome Message</label>
            <TextArea value={form.welcome_message} onChange={(v) => setForm({ ...form, welcome_message: v })} placeholder="We'd love to hear about your experience!" rows={3} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Google Review URL</label>
            <Input value={form.google_review_url} onChange={(v) => setForm({ ...form, google_review_url: v })} placeholder="https://google.com/maps/..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Category</label>
            <Input value={form.business_category} onChange={(v) => setForm({ ...form, business_category: v })} placeholder="Restaurant" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact Email</label>
            <Input type="email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} placeholder="hello@acme.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact Phone</label>
            <Input value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} placeholder="+1 555-0100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Location City</label>
            <Input value={form.location_city} onChange={(v) => setForm({ ...form, location_city: v })} placeholder="San Francisco" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={form.public_review_enabled} onChange={(e) => setForm({ ...form, public_review_enabled: e.target.checked })} className="w-4 h-4 rounded accent-blue-500" />
              Public Review Enabled
            </label>
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </Card>
    </div>
  );
}
