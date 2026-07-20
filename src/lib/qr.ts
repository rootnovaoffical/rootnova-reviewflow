import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function useQRCode(text: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!text) { setUrl(null); return; }
    QRCode.toDataURL(text, { width: 256, margin: 2, color: { dark: "#6366f1", light: "#0f172a" } })
      .then(setUrl)
      .catch(() => setUrl(null));
  }, [text]);
  return url;
}

export async function generateQRDataUrl(text: string, width = 512): Promise<string> {
  return QRCode.toDataURL(text, { width, margin: 2, color: { dark: "#0a0a0f", light: "#ffffff" } });
}

export function downloadQR(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export async function downloadQRCode(text: string, filename: string, width = 1024): Promise<void> {
  const dataUrl = await generateQRDataUrl(text, width);
  downloadQR(dataUrl, filename);
}
