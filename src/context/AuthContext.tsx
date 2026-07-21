import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, Business, Organization, AdminRole } from '../lib/types';

interface AuthContextType {
  user: Profile | null;
  business: Business | null;
  organization: Organization | null;
  role: AdminRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapRole(dbRole: string | null): AdminRole {
  if (!dbRole) return 'business_admin';
  const r = dbRole.toUpperCase();
  if (r.includes('SUPER')) return 'super_admin';
  if (r.includes('PARTNER')) return 'partner_admin';
  return 'business_admin';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<AdminRole>('business_admin');
  const [loading, setLoading] = useState(true);

  async function loadBusinessData(userId: string, userRole: AdminRole) {
    let businessId: string | null = null;

    if (userRole === 'super_admin') {
      // Super admin: load first business
      const { data: biz } = await supabase.from('businesses').select('*').limit(1).single();
      if (biz) {
        setBusiness(biz as Business);
        businessId = (biz as Business).id;
      }
    } else {
      // Partner/Business admin: find via business_admins junction
      const { data: ba } = await supabase
        .from('business_admins')
        .select('business_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (ba) {
        businessId = (ba as { business_id: string }).business_id;
        const { data: biz } = await supabase.from('businesses').select('*').eq('id', businessId).single();
        if (biz) setBusiness(biz as Business);
      }

      // If no junction record, try first business as fallback
      if (!businessId) {
        const { data: biz } = await supabase.from('businesses').select('*').limit(1).single();
        if (biz) {
          setBusiness(biz as Business);
          businessId = (biz as Business).id;
        }
      }

      // Load organization if partner
      if (userRole === 'partner_admin' && businessId) {
        const { data: biz } = await supabase.from('businesses').select('organization_id').eq('id', businessId).single();
        const orgId = (biz as { organization_id: string | null })?.organization_id;
        if (orgId) {
          const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).single();
          if (org) setOrganization(org as Organization);
        }
      }
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) setLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profileData || !mounted) {
          if (mounted) setLoading(false);
          return;
        }

        const p = {
          id: profileData.id,
          email: profileData.email || session.user.email || '',
          full_name: profileData.full_name,
          role: mapRole(profileData.role),
          created_at: profileData.created_at,
        } as Profile;

        setUser(p);
        setRole(p.role);

        await loadBusinessData(p.id, p.role);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setBusiness(null);
        setOrganization(null);
        setRole('business_admin');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: 'No session' };

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileData) {
        const p = {
          id: profileData.id,
          email: profileData.email || session.user.email || '',
          full_name: profileData.full_name,
          role: mapRole(profileData.role),
          created_at: profileData.created_at,
        } as Profile;

        setUser(p);
        setRole(p.role);
        await loadBusinessData(p.id, p.role);
      }

      return { error: null };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setBusiness(null);
    setOrganization(null);
    setRole('business_admin');
  }

  return (
    <AuthContext.Provider value={{ user, business, organization, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
