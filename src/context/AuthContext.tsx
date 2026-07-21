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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<AdminRole>('business_admin');
  const [loading, setLoading] = useState(true);

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

        const p = profileData as Profile;
        setUser(p);
        setRole(p.role || 'business_admin');

        // Load business
        if (p.role === 'super_admin') {
          const { data: biz } = await supabase.from('businesses').select('*').limit(1).single();
          if (biz && mounted) setBusiness(biz as Business);
        } else if (p.role === 'partner_admin') {
          const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', p.id).limit(1).single();
          if (biz && mounted) {
            setBusiness(biz as Business);
            const { data: org } = await supabase.from('organizations').select('*').eq('owner_id', p.id).limit(1).single();
            if (org && mounted) setOrganization(org as Organization);
          }
        } else {
          const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', p.id).limit(1).single();
          if (biz && mounted) setBusiness(biz as Business);
        }
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

      // Reload profile
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: 'No session' };

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileData) {
        const p = profileData as Profile;
        setUser(p);
        setRole(p.role || 'business_admin');

        if (p.role === 'super_admin') {
          const { data: biz } = await supabase.from('businesses').select('*').limit(1).single();
          if (biz) setBusiness(biz as Business);
        } else {
          const { data: biz } = await supabase.from('businesses').select('*').eq('owner_id', p.id).limit(1).single();
          if (biz) {
            setBusiness(biz as Business);
            if (p.role === 'partner_admin') {
              const { data: org } = await supabase.from('organizations').select('*').eq('owner_id', p.id).limit(1).single();
              if (org) setOrganization(org as Organization);
            }
          }
        }
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
