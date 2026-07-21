import { useEffect, useState } from 'react';
import { Save, ExternalLink, QrCode as QrCodeIcon, Building2, Globe, Mail, Phone, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { LoadingSpinner, PageHeader, Card, Button, Input, TextArea } from '../components/UI';

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
  const [form, setForm] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    fetchBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchBusiness() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(
          'id, name, slug, logo_url, welcome_message, google_review_url, public_review_enabled, business_category, contact_email, contact_phone, location_city'
        )
        .eq('id', businessId)
        .single();

      if (error) throw error;
      setForm(data);
    } catch (err) {
      console.error('Error fetching business:', err);
      showToast('error', 'Failed to load business settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form) return;
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
      const { error } = await supabase
        .from('businesses')
        .update({
          name: form.name.trim(),
          slug: form.slug.trim(),
          logo_url: form.logo_url,
          welcome_message: form.welcome_message,
          google_review_url: form.google_review_url,
          public_review_enabled: form.public_review_enabled,
          business_category: form.business_category,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          location_city: form.location_city,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (error) throw error;
      showToast('success', 'Business settings saved');
      await fetchBusiness();
    } catch (err) {
      console.error('Error saving business:', err);
      showToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function reviewLink() {
    const slug = form?.slug || '';
    return `${window.location.origin}/review/${slug}`;
  }

  function qrImageUrl() {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reviewLink())}`;
  }

  if (loading || !form) return <LoadingSpinner label="Loading settings..." />;

  return (
    <div>
      <PageHeader
        title="Business Settings"
        description="Configure your business profile and public review page"
        action={
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        }
      />

      {/* Public Review Link + QR */}
      <Card className="p-5 mb-6 bg-gradient-to-br from-blue-500/10 to-transparent">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="flex-shrink-0">
            <img
              src={qrImageUrl()}
              alt="QR code for review link"
              className="w-36 h-36 rounded-lg bg-white p-2"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <QrCodeIcon className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-semibold text-white">Public Review Link</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-3">
              Share this link or QR code with customers to collect reviews.
            </p>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3">
              <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <a
                href={reviewLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-300 hover:text-blue-200 truncate flex-1"
              >
                {reviewLink()}
              </a>
              <ExternalLink className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            </div>
          </div>
        </div>
      </Card>

      {/* Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Profile</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Business Name
              </label>
              <Input
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="Business name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Slug</label>
              <Input
                value={form.slug}
                onChange={(v) => setForm({ ...form, slug: v })}
                placeholder="my-business"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Used in the public review URL: /review/{form.slug || '...'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Business Category
              </label>
              <Input
                value={form.business_category || ''}
                onChange={(v) => setForm({ ...form, business_category: v })}
                placeholder="e.g. Restaurant, Salon, Clinic"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Logo URL</label>
              <Input
                value={form.logo_url || ''}
                onChange={(v) => setForm({ ...form, logo_url: v })}
                placeholder="https://..."
              />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Review Page</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Welcome Message
              </label>
              <TextArea
                value={form.welcome_message || ''}
                onChange={(v) => setForm({ ...form, welcome_message: v })}
                placeholder="We'd love to hear about your experience!"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Google Review URL
              </label>
              <Input
                value={form.google_review_url || ''}
                onChange={(v) => setForm({ ...form, google_review_url: v })}
                placeholder="https://search.google.com/..."
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.public_review_enabled}
                  onChange={(e) =>
                    setForm({ ...form, public_review_enabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400/50"
                />
                <span className="text-sm text-zinc-300">Public review page enabled</span>
              </label>
              <p className="text-xs text-zinc-500 mt-1 ml-6">
                When disabled, the public review link will not accept new submissions.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Contact</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Contact Email
              </label>
              <Input
                value={form.contact_email || ''}
                onChange={(v) => setForm({ ...form, contact_email: v })}
                placeholder="contact@business.com"
                type="email"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Contact Phone
              </label>
              <Input
                value={form.contact_phone || ''}
                onChange={(v) => setForm({ ...form, contact_phone: v })}
                placeholder="+1 555-000-0000"
              />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Location</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Location City
              </label>
              <Input
                value={form.location_city || ''}
                onChange={(v) => setForm({ ...form, location_city: v })}
                placeholder="e.g. San Francisco"
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
