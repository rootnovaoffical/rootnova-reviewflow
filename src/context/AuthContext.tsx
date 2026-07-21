import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { uploadAvatar } from '../lib/storage';
import type { Profile, Business, Organization, UserRole } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  businesses: Business[];
  business: Business | null;
  organization: Organization | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  switchBusiness: (businessId: string) => void;
  updateAvatar: (file: File) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBusinesses = useCallback(async (p: Profile) => {
    let businessList: Business[] = [];
    if (p.role === 'ROOTNOVA_SUPER_ADMIN' || p.role === 'ROOTNOVA_ADMIN') {
      const { data, error } = await supabase.from('businesses').select('*').order('name');
      if (error) { setBusinesses([]); setBusiness(null); return; }
      businessList = (data as Business[]) || [];
    } else {
      const { data: adminRows, error: adminErr } = await supabase.from('business_admins').select('business_id').eq('user_id', p.id);
      if (adminErr || !adminRows || adminRows.length === 0) { setBusinesses([]); setBusiness(null); return; }
      const businessIds = adminRows.map((r) => (r as { business_id: string }).business_id);
      const { data: bizData, error: bizErr } = await supabase.from('businesses').select('*').in('id', businessIds).order('name');
      if (bizErr || !bizData) { setBusinesses([]); setBusiness(null); return; }
      businessList = bizData as Business[];
    }
    setBusinesses(businessList);
    const stored = localStorage.getItem('selectedBusinessId');
    const target = businessList.find((b) => b.id === stored) || businessList[0] || null;
    setBusiness(target);
    if (target) localStorage.setItem('selectedBusinessId', target.id);
    if (target?.organization_id) {
      const { data: org } = await supabase.from('organizations').select('*').eq('id', target.organization_id).maybeSingle();
      setOrganization(org as Organization | null);
    } else { setOrganization(null); }
  }, []);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error || !data) return null;
    return data as Profile;
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) {
        const p = await loadProfile(s.user.id);
        if (p && mounted) { setProfile(p); await loadBusinesses(p); }
      }
      if (mounted) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) {
        const p = await loadProfile(s.user.id);
        if (p && mounted) { setProfile(p); await loadBusinesses(p); }
      } else { setProfile(null); setBusinesses([]); setBusiness(null); setOrganization(null); }
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [loadProfile, loadBusinesses]);

  const switchBusiness = useCallback(async (businessId: string) => {
    const b = businesses.find((x) => x.id === businessId);
    if (b) {
      setBusiness(b); localStorage.setItem('selectedBusinessId', b.id);
      if (b.organization_id) {
        const { data: org } = await supabase.from('organizations').select('*').eq('id', b.organization_id).maybeSingle();
        setOrganization(org as Organization | null);
      } else { setOrganization(null); }
    }
  }, [businesses]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) return { error: error.message };
    if (data.user) { await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: fullName, role: 'BUSINESS_ADMIN' }); }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('selectedBusinessId');
    setProfile(null); setBusinesses([]); setBusiness(null); setOrganization(null);
  }, []);

  const updateAvatar = useCallback(async (file: File) => {
    if (!user) return { error: 'Not authenticated' };
    const url = await uploadAvatar(user.id, file);
    if (!url) return { error: 'Failed to upload image' };
    const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
    if (error) return { error: error.message };
    setProfile((prev) => prev ? { ...prev, avatar_url: url } : prev);
    return { error: null };
  }, [user]);

  return (
    <AuthContext.Provider value={{ session, user, profile, businesses, business, organization, role: profile?.role ?? 'BUSINESS_ADMIN', loading, signIn, signUp, signOut, switchBusiness, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
