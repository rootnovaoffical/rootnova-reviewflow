import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { fetchProfile } from "../lib/auth";
import type { Profile } from "../lib/types";
import type { Session } from "@supabase/supabase-js";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  organization: { id: string; name: string } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const updateProfile = useCallback(async (patch: Record<string, unknown>) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", session.user.id);
    if (error) throw error;
    await refreshProfile();
  }, [session?.user?.id]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const p = await fetchProfile(session.user.id);
    setProfile(p);
    if (p) {
      const { data: member } = await supabase.from("organization_members").select("organization:organizations(id, name)").eq("user_id", session.user.id).maybeSingle();
      const org = (member as { organization: { id: string; name: string } | null } | null)?.organization;
      setOrganization(org ?? null);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        fetchProfile(data.session.user.id).then((p) => {
          if (mounted) { setProfile(p); setLoading(false); }
        });
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user?.id) {
        const p = await fetchProfile(newSession.user.id);
        if (mounted) setProfile(p);
      } else {
        setProfile(null);
        setOrganization(null);
      }
    });

    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id, email, full_name: fullName, role: "BUSINESS_ADMIN", account_status: "ACTIVE",
      }, { onConflict: "id" });
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setOrganization(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, organization, loading, signIn, signUp, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
