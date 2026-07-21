// ============================================================
// MODULE 14 — MOBILE APP CONTEXT
// Manages enterprise switching, offline state, notifications
// ============================================================

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";
import { fetchUnreadCount } from "../lib/mobile-notifications";
import {
  isOnline,
  cacheGet,
  cacheSet,
  getPendingActions,
  processSyncQueue,
  type SyncHandler,
} from "../lib/mobile-offline";
import type { Business, Organization } from "../lib/types";

interface MobileContextValue {
  isOnline: boolean;
  pendingActions: number;
  selectedBusiness: Business | null;
  selectedOrg: Organization | null;
  unreadNotifications: number;
  switchBusiness: (business: Business) => void;
  switchOrg: (org: Organization) => void;
  syncQueue: () => Promise<void>;
  refreshUnread: () => Promise<void>;
}

const MobileContext = createContext<MobileContextValue | undefined>(undefined);

const DEFAULT_SYNC_HANDLER: SyncHandler = async (action) => {
  try {
    const { type, payload } = action;
    switch (type) {
      case "review_reply":
        await supabase.from("review_sessions").update({ business_response: payload.body }).eq("id", payload.reviewId);
        break;
      case "mark_action_done":
        await supabase.from("action_items").update({ status: "completed" }).eq("id", payload.actionId);
        break;
      case "create_campaign":
        await supabase.from("campaigns").insert(payload);
        break;
      default:
        return { success: false, error: `Unknown action type: ${type}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export function MobileProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [online, setOnline] = useState(isOnline());
  const [pending, setPending] = useState(getPendingActions().length);
  const [business, setBusiness] = useState<Business | null>(cacheGet("selected-business"));
  const [org, setOrg] = useState<Organization | null>(cacheGet("selected-org"));
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!profile) return;
    const count = await fetchUnreadCount();
    setUnread(count);
  }, [profile]);

  useEffect(() => {
    refreshUnread();
    const interval = setInterval(refreshUnread, 60000);
    return () => clearInterval(interval);
  }, [refreshUnread]);

  const switchBusiness = useCallback((biz: Business) => {
    setBusiness(biz);
    cacheSet("selected-business", biz, 1440);
  }, []);

  const switchOrg = useCallback((o: Organization) => {
    setOrg(o);
    cacheSet("selected-org", o, 1440);
  }, []);

  const syncQueue = useCallback(async () => {
    if (!online) return;
    const result = await processSyncQueue(DEFAULT_SYNC_HANDLER);
    setPending(getPendingActions().length);
    if (result.synced > 0) await refreshUnread();
  }, [online, refreshUnread]);

  useEffect(() => {
    if (online) syncQueue();
  }, [online, syncQueue]);

  return (
    <MobileContext.Provider value={{
      isOnline: online,
      pendingActions: pending,
      selectedBusiness: business,
      selectedOrg: org,
      unreadNotifications: unread,
      switchBusiness,
      switchOrg,
      syncQueue,
      refreshUnread,
    }}>
      {children}
    </MobileContext.Provider>
  );
}

export function useMobile() {
  const ctx = useContext(MobileContext);
  if (!ctx) throw new Error("useMobile must be used within MobileProvider");
  return ctx;
}
