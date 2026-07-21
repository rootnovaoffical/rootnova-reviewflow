export type AdminRole = 'super_admin' | 'partner_admin' | 'business_admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AdminRole;
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  business_category: string | null;
  welcome_message: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  google_review_url: string | null;
  google_maps_url: string | null;
  location_city: string | null;
  status: string | null;
  organization_id: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string | null;
  created_at: string;
}
