import QRCode from "qrcode";

export async function generateQRDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 256, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } });
}
