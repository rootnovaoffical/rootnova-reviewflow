import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Business, Organization, AdminRole } from '../lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  business: Business | null;
  businesses: Business[];
  organization: Organization | null;
  role: AdminRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  switchBusiness: (businessId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<AdminRole>('business_admin');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadUserData(s.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadUserData(s.user.id);
      } else {
        setBusiness(null);
        setBusinesses([]);
        setOrganization(null);
        setRole('business_admin');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string) {
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      let mappedRole: AdminRole = 'business_admin';
      if (profile) {
        const dbRole = (profile as { role?: string }).role;
        mappedRole = dbRole === 'ROOTNOVA_SUPER_ADMIN' ? 'super_admin'
          : dbRole === 'ROOTNOVA_PARTNER_ADMIN' ? 'partner_admin'
          : 'business_admin';
        setRole(mappedRole);
      }

      if (mappedRole === 'super_admin') {
        const { data: allBiz } = await supabase.from('businesses').select('*').order('name');
        if (allBiz && allBiz.length > 0) {
          setBusinesses(allBiz as Business[]);
          setBusiness(allBiz[0] as Business);
          const biz = allBiz[0] as Business;
          if (biz.organization_id) {
            const { data: org } = await supabase.from('organizations').select('*').eq('id', biz.organization_id).single();
            if (org) setOrganization(org as Organization);
          }
        }
      } else if (mappedRole === 'partner_admin') {
        const { data: baData } = await supabase.from('business_admins').select('business_id').eq('user_id', userId);
        const bizIds = (baData as { business_id: string }[])?.map((b) => b.business_id) ?? [];
        if (bizIds.length > 0) {
          const { data: bizList } = await supabase.from('businesses').select('*').in('id', bizIds).order('name');
          if (bizList && bizList.length > 0) {
            setBusinesses(bizList as Business[]);
            setBusiness(bizList[0] as Business);
            const firstBiz = bizList[0] as Business;
            if (firstBiz.organization_id) {
              const { data: org } = await supabase.from('organizations').select('*').eq('id', firstBiz.organization_id).single();
              if (org) setOrganization(org as Organization);
            }
          }
        }
      } else {
        const { data: baData } = await supabase.from('business_admins').select('business_id').eq('user_id', userId).limit(1);
        if (baData && baData.length > 0) {
          const { data: biz } = await supabase.from('businesses').select('*').eq('id', baData[0].business_id as string).single();
          if (biz) {
            setBusiness(biz as Business);
            setBusinesses([biz as Business]);
            if ((biz as Business).organization_id) {
              const { data: org } = await supabase.from('organizations').select('*').eq('id', (biz as Business).organization_id as string).single();
              if (org) setOrganization(org as Organization);
            }
          }
        }
      }
    } catch {
      // Profile or business may not exist yet
    } finally {
      setLoading(false);
    }
  }

  function switchBusiness(businessId: string) {
    const biz = businesses.find((b) => b.id === businessId);
    if (biz) {
      setBusiness(biz);
      if (biz.organization_id) {
        supabase.from('organizations').select('*').eq('id', biz.organization_id).single().then(({ data: org }) => {
          setOrganization(org as Organization | null);
        });
      } else {
        setOrganization(null);
      }
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: fullName || null, role: 'ROOTNOVA_BUSINESS_ADMIN' });
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setBusiness(null);
    setBusinesses([]);
    setOrganization(null);
    setUser(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, business, businesses, organization, role, loading, signIn, signUp, signOut, switchBusiness }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
