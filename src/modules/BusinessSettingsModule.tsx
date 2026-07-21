import { useState, useEffect } from 'react';
import { Settings, Save, ExternalLink, QrCode as QrCodeIcon, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, PageHeader, Card, Button, Input, TextArea } from '../components/UI';
import { useToast } from '../context/ToastContext';

interface BusinessSettings {
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

export default function BusinessSettingsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState<BusinessSettings | null>(null);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    logo_url: '',
    welcome_message: '',
    google_review_url: '',
    public_review_enabled: true,
    business_category: '',
    contact_email: '',
    contact_phone: '',
    location_city: '',
  });

  useEffect(() => {
    fetchBusiness();
  }, [businessId]);

  async function fetchBusiness() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug, logo_url, welcome_message, google_review_url, public_review_enabled, business_category, contact_email, contact_phone, location_city')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      const b = data as BusinessSettings;
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
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to load business settings');
    } finally {
      setLoading(false);
    }
  }

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
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function reviewLink() {
    return `${window.location.origin}/review/${form.slug}`;
  }

  function qrImageUrl(url: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }

  if (loading) return <LoadingSpinner label="Loading settings..." />;

  return (
    <div>
      <PageHeader
        title="Business Settings"
        description="Configure your business profile and review settings"
        action={<Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}</Button>}
      />

      {/* Public Review Link Banner */}
      <Card className="p-5 mb-6 border-blue-400/20">
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <QrCodeIcon className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-white">Public Review Link</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-3">Share this link or QR code with customers to collect reviews.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-blue-300 truncate">
                {reviewLink()}
              </div>
              <a href={reviewLink()} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm"><ExternalLink className="w-3.5 h-3.5" /> Open</Button>
              </a>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.public_review_enabled}
                  onChange={(e) => setForm({ ...form, public_review_enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                Public review enabled
              </label>
            </div>
          </div>
          <div className="shrink-0">
            <img src={qrImageUrl(reviewLink())} alt="Review QR Code" className="w-32 h-32 rounded-lg bg-white p-1.5" />
          </div>
        </div>
      </Card>

      {/* General Settings */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-white">General</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="My Business" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Slug</label>
            <Input value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="my-business" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Logo URL</label>
            <Input value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} placeholder="https://..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Category</label>
            <Input value={form.business_category} onChange={(v) => setForm({ ...form, business_category: v })} placeholder="Restaurant" />
          </div>
        </div>
      </Card>

      {/* Review Settings */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-white">Review Settings</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Welcome Message</label>
            <TextArea value={form.welcome_message} onChange={(v) => setForm({ ...form, welcome_message: v })} placeholder="We'd love to hear about your experience!" rows={3} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Google Review URL</label>
            <Input value={form.google_review_url} onChange={(v) => setForm({ ...form, google_review_url: v })} placeholder="https://search.google.com/..." />
          </div>
        </div>
      </Card>

      {/* Contact Info */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-white">Contact Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact Email</label>
            <Input type="email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} placeholder="contact@business.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact Phone</label>
            <Input value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} placeholder="+1 555-0100" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Location City</label>
            <Input value={form.location_city} onChange={(v) => setForm({ ...form, location_city: v })} placeholder="San Francisco" />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </div>
  );
}
