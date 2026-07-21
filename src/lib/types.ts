export type AdminRole = 'super_admin' | 'partner_admin' | 'business_admin';

export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  welcome_message: string | null;
  google_review_url: string | null;
  public_review_enabled: boolean;
  status: string;
  organization_id: string | null;
  business_category: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  location_city: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string | null;
  logo_url: string | null;
  created_at: string;
}
