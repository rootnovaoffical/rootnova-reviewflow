import { useState, useEffect } from 'react';
import { Settings, Save, Link2, QrCode, Sparkles, ExternalLink, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { buildGoogleReviewUrl, buildGoogleMapsUrl } from '../lib/storage';
import { LoadingSpinner, PageHeader, Card, Badge, Button, Input, TextArea, ImageUpload } from '../components/UI';

interface BusinessData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  welcome_message: string | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  google_review_url: string | null;
  public_review_enabled: boolean;
  business_category: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location_city: string | null;
}

interface BusinessSettingsModuleProps {
  businessId: string;
}

export default function BusinessSettingsModule({ businessId }: BusinessSettingsModuleProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BusinessData | null>(null);

  useEffect(() => {
    fetchBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function fetchBusiness() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug, logo_url, welcome_message, google_place_id, google_maps_url, google_review_url, public_review_enabled, business_category, contact_email, contact_phone, location_city')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      setForm(data as BusinessData);
    } catch (err) {
      showToast('error', `Failed to load business settings: ${(err as Error).message}`);
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

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        logo_url: form.logo_url,
        welcome_message: form.welcome_message,
        google_place_id: form.google_place_id,
        google_maps_url: form.google_maps_url,
        google_review_url: form.google_review_url,
        public_review_enabled: form.public_review_enabled,
        business_category: form.business_category,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        location_city: form.location_city,
      };

      const { error } = await supabase.from('businesses').update(payload).eq('id', businessId);
      if (error) throw error;
      showToast('success', 'Business settings saved');
      fetchBusiness();
    } catch (err) {
      showToast('error', `Save failed: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleAutoGenerateReviewUrl() {
    if (!form?.google_place_id?.trim()) {
      showToast('error', 'Enter a Google Place ID first');
      return;
    }
    const url = buildGoogleReviewUrl(form.google_place_id.trim());
    setForm({ ...form, google_review_url: url });
    showToast('success', 'Google Review URL generated');
  }

  function handleAutoGenerateMapsUrl() {
    if (!form?.google_place_id?.trim()) {
      showToast('error', 'Enter a Google Place ID first');
      return;
    }
    const url = buildGoogleMapsUrl(form.google_place_id.trim());
    setForm({ ...form, google_maps_url: url });
    showToast('success', 'Google Maps URL generated');
  }

  if (loading || !form) return <LoadingSpinner label="Loading business settings..." />;

  const reviewLink = form.slug ? `${window.location.origin}/review/${form.slug}` : '';
  const qrCodeUrl = reviewLink ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(reviewLink)}` : '';

  return (
    <div>
      <PageHeader
        title="Business Settings"
        description="Configure your business profile, review settings, and Google integration"
        action={<Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}</Button>}
      />

      <div className="space-y-6">
        {/* Logo & Basic Info */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" />
            Business Profile
          </h3>

          <div className="mb-5">
            <ImageUpload
              onUpload={(url) => setForm({ ...form, logo_url: url })}
              currentUrl={form.logo_url}
              label="Business Logo"
              bucket="business-logos"
              folderId={businessId}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Name</label>
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Business name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Slug</label>
              <Input value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="business-slug" />
              {reviewLink && (
                <p className="text-xs text-zinc-500 mt-1">Public URL: <span className="text-blue-400">{reviewLink}</span></p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Category</label>
              <Input value={form.business_category ?? ''} onChange={(v) => setForm({ ...form, business_category: v })} placeholder="e.g. Restaurant, Salon, Dental" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Location (City)</label>
              <Input value={form.location_city ?? ''} onChange={(v) => setForm({ ...form, location_city: v })} placeholder="City" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Welcome Message</label>
            <TextArea value={form.welcome_message ?? ''} onChange={(v) => setForm({ ...form, welcome_message: v })} placeholder="Welcome message shown to customers on the review page" rows={3} />
          </div>
        </Card>

        {/* Contact Info */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact Email</label>
              <Input type="email" value={form.contact_email ?? ''} onChange={(v) => setForm({ ...form, contact_email: v })} placeholder="contact@business.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Contact Phone</label>
              <Input value={form.contact_phone ?? ''} onChange={(v) => setForm({ ...form, contact_phone: v })} placeholder="+1 (555) 000-0000" />
            </div>
          </div>
        </Card>

        {/* Google Integration */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Google Integration
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Google Place ID</label>
              <Input value={form.google_place_id ?? ''} onChange={(v) => setForm({ ...form, google_place_id: v })} placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4" />
              <p className="text-xs text-zinc-500 mt-1">Find your Place ID at <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Places API</a></p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleAutoGenerateReviewUrl}>
                <Sparkles className="w-3.5 h-3.5" />
                Auto-generate Google Review URL
              </Button>
              <Button variant="secondary" size="sm" onClick={handleAutoGenerateMapsUrl}>
                <Link2 className="w-3.5 h-3.5" />
                Auto-generate Maps URL
              </Button>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Google Maps URL</label>
              <Input value={form.google_maps_url ?? ''} onChange={(v) => setForm({ ...form, google_maps_url: v })} placeholder="https://www.google.com/maps/place/..." />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Google Review URL</label>
              <Input value={form.google_review_url ?? ''} onChange={(v) => setForm({ ...form, google_review_url: v })} placeholder="https://search.google.com/local/writereview?placeid=..." />
              {form.google_review_url && (
                <a href={form.google_review_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1">
                  <ExternalLink className="w-3 h-3" /> Test review URL
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* Public Review Settings & QR Code */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-blue-400" />
            Public Review Page
          </h3>

          <div className="flex items-center gap-3 mb-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.public_review_enabled}
                onChange={(e) => setForm({ ...form, public_review_enabled: e.target.checked })}
                className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/30 w-4 h-4"
              />
              <span className="text-sm text-zinc-300">Enable public review page</span>
            </label>
            <Badge color={form.public_review_enabled ? 'green' : 'gray'}>
              {form.public_review_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          {reviewLink && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Public Review Link</label>
                <div className="flex items-center gap-2">
                  <Input value={reviewLink} onChange={() => {}} />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(reviewLink);
                      showToast('success', 'Link copied to clipboard');
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <a href={reviewLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2">
                  <ExternalLink className="w-3 h-3" /> Open review page
                </a>
              </div>

              <div className="flex flex-col items-center justify-center">
                <label className="block text-xs font-medium text-zinc-400 mb-2">QR Code for Review Page</label>
                <div className="rounded-xl bg-white p-2">
                  <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                </div>
                <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                  <QrCode className="w-3 h-3" /> Scan to leave a review
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
