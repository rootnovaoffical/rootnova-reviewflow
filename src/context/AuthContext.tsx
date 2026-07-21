import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { Profile, AdminRole, Business, Organization } from "../lib/types";

interface AuthContextValue {
  user: Profile | null;
  business: Business | null;
  organization: Organization | null;
  role: AdminRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (uid: string, email: string) => {
    try {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      const p = (profile || { id: uid, full_name: email.split("@")[0], email, role: "business_admin", account_status: "active", avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) as Profile;
      setUser(p);
      const r = (p.role as AdminRole) || "business_admin";
      setRole(r);
      if (r === "super_admin") {
        const { data: biz } = await supabase.from("businesses").select("*").limit(1).maybeSingle();
        if (biz) setBusiness(biz as Business);
      } else if (r === "partner_admin") {
        const { data: biz } = await supabase.from("businesses").select("*").eq("status", "active").limit(1).maybeSingle();
        if (biz) { setBusiness(biz as Business); if ((biz as Business).organization_id) { const { data: org } = await supabase.from("organizations").select("*").eq("id", (biz as Business).organization_id!).maybeSingle(); if (org) setOrganization(org as Organization); } }
      } else {
        const { data: biz } = await supabase.from("businesses").select("*").eq("status", "active").limit(1).maybeSingle();
        if (biz) setBusiness(biz as Business);
      }
    } catch { /* non-blocking */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) loadUserData(session.user.id, session.user.email || "");
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadUserData(session.user.id, session.user.email || "");
      else { setUser(null); setBusiness(null); setOrganization(null); setRole(null); setLoading(false); }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadUserData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }, []);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); setUser(null); setBusiness(null); setOrganization(null); setRole(null); }, []);

  return <AuthContext.Provider value={{ user, business, organization, role, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
