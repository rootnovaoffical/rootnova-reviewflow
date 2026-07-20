import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { cacheBustUrl } from "../lib/utils";
import type { PlatformAsset, FeatureFlag } from "../lib/types";

interface BrandingContextValue {
  assets: Record<string, PlatformAsset>;
  flags: Record<string, FeatureFlag>;
  upiId: string | null;
  upiQrUrl: string | null;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Record<string, PlatformAsset>>({});
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>({});

  const refresh = useCallback(async () => {
    const [{ data: assetRows }, { data: flagRows }] = await Promise.all([
      supabase.from("platform_assets").select("*").eq("is_active", true),
      supabase.from("feature_flags").select("*"),
    ]);
    const amap: Record<string, PlatformAsset> = {};
    (assetRows || []).forEach((a) => {
      amap[a.key] = { ...a, public_url: cacheBustUrl(a.public_url) } as PlatformAsset;
    });
    const fmap: Record<string, FeatureFlag> = {};
    (flagRows || []).forEach((f) => { fmap[f.key] = f as FeatureFlag; });
    setAssets(amap);
    setFlags(fmap);
  }, []);

  useEffect(() => {
    refresh();

    const sub = supabase
      .channel("branding-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_assets" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flags" }, () => refresh())
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [refresh]);

  const upiId = assets["upi_id"]?.metadata?.upi_id as string | null ?? assets["upi_id"]?.public_url ?? null;
  const upiQrUrl = assets["upi_qr"]?.public_url ?? null;

  return (
    <BrandingContext.Provider value={{ assets, flags, upiId, upiQrUrl, refresh }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("useBranding must be used within BrandingProvider");
  return ctx;
}
