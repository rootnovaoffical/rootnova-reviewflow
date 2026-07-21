import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner, PageHeader, Card, Button, Input, TextArea } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { Save, ExternalLink, QrCode, Copy } from 'lucide-react';

interface BusinessSettings {
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
}

export default function BusinessSettingsModule({ businessId }: { businessId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BusinessSettings>({
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
        .select('name, slug, logo_url, welcome_message, google_review_url, public_review_enabled, business_category, contact_email, contact_phone, location_city')
        .eq('id', businessId)
        .single();
      if (error) throw error;
      if (data) {
        setForm({
          name: data.name ?? '',
          slug: data.slug ?? '',
          logo_url: data.logo_url ?? '',
          welcome_message: data.welcome_message ?? '',
          google_review_url: data.google_review_url ?? '',
          public_review_enabled: data.public_review_enabled ?? true,
          business_category: data.business_category ?? '',
          contact_email: data.contact_email ?? '',
          contact_phone: data.contact_phone ?? '',
          location_city: data.location_city ?? '',
        });
      }
    } catch {
      showToast('error', 'Failed to load business settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast('error', 'Business name is required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('businesses').update({
        name: form.name,
        slug: form.slug,
        logo_url: form.logo_url || null,
        welcome_message: form.welcome_message || null,
        google_review_url: form.google_review_url || null,
        public_review_enabled: form.public_review_enabled,
        business_category: form.business_category || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        location_city: form.location_city || null,
      }).eq('id', businessId);
      if (error) throw error;
      showToast('success', 'Settings saved successfully');
    } catch {
      showToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    const link = `${window.location.origin}/review/${form.slug}`;
    navigator.clipboard.writeText(link);
    showToast('success', 'Link copied to clipboard');
  }

  if (loading) return <LoadingSpinner label="Loading settings..." />;

  const reviewUrl = `${window.location.origin}/review/${form.slug}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reviewUrl)}`;

  return (
    <div>
      <PageHeader
        title="Business Settings"
        description="Configure your business profile and review page"
        action={<Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}</Button>}
      />

      {/* Public Review Link */}
      {form.slug && (
        <Card className="p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img src={qrImageUrl} alt="QR Code" className="w-28 h-28 rounded-lg bg-white p-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <QrCode className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Public Review Link</h3>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm text-blue-300 truncate">{reviewUrl}</code>
                <button onClick={copyLink} className="text-zinc-400 hover:text-white shrink-0"><Copy className="w-4 h-4" /></button>
                <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white shrink-0"><ExternalLink className="w-4 h-4" /></a>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Share this link or QR code with customers to collect reviews.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">General Information</h3>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Business Name</label>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Business name" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Slug</label>
            <Input value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="my-business" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Business Category</label>
            <Input value={form.business_category} onChange={(v) => setForm({ ...form, business_category: v })} placeholder="Restaurant, Salon, etc." />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Logo URL</label>
            <Input value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Welcome Message</label>
            <TextArea value={form.welcome_message} onChange={(v) => setForm({ ...form, welcome_message: v })} placeholder="Welcome message for customers..." rows={3} />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Contact & Review Settings</h3>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Google Review URL</label>
            <Input value={form.google_review_url} onChange={(v) => setForm({ ...form, google_review_url: v })} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Contact Email</label>
            <Input value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} placeholder="contact@business.com" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Contact Phone</label>
            <Input value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} placeholder="+1..." />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Location City</label>
            <Input value={form.location_city} onChange={(v) => setForm({ ...form, location_city: v })} placeholder="City" />
          </div>
          <div className="pt-1">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={form.public_review_enabled} onChange={(e) => setForm({ ...form, public_review_enabled: e.target.checked })} className="accent-blue-500 w-4 h-4" />
              Public Review Enabled
            </label>
            <p className="text-xs text-zinc-500 mt-1 ml-6">When enabled, customers can submit reviews via the public review page.</p>
          </div>
        </Card>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </div>
  );
}
