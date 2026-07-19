import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export function useQRCode(text: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const lastRef = useRef<string | null>(null);
  useEffect(() => {
    if (!text || text === lastRef.current) return;
    lastRef.current = text;
    QRCode.toDataURL(text, { width: 256, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } }).then(setUrl).catch(() => setUrl(null));
  }, [text]);
  return url;
}

export function QRCodeImage({ text, size = 200, className = "" }: { text: string | null; size?: number; className?: string }) {
  const url = useQRCode(text);
  if (!text) return <div style={{ width: size, height: size }} className={`bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 text-xs ${className}`}>No URL</div>;
  if (!url) return <div style={{ width: size, height: size }} className={`bg-slate-800 rounded-lg animate-pulse ${className}`} />;
  return <img src={url} alt="QR Code" width={size} height={size} className={`rounded-lg ${className}`} />;
}
