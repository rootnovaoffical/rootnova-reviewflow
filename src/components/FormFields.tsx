import { useState } from "react";
import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { useToast } from "../context/ToastContext";

interface ImageUploadFieldProps {
  label: string;
  currentUrl: string | null;
  bucket: string;
  path: string;
  onUploaded: (url: string) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
  aspect?: "square" | "wide";
  hint?: string;
}

export function ImageUploadField({
  label,
  currentUrl,
  onUploaded,
  onRemove,
  aspect = "square",
  hint,
}: ImageUploadFieldProps) {
  const { show } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const url = URL.createObjectURL(file);
      setPreview(url);
      await onUploaded(url);
      setFile(null);
      setPreview(null);
      show(`${label} updated`, "success");
    } catch (err) {
      show(`Upload failed: ${err instanceof Error ? err.message : "unknown"}`, "error");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block text-sm text-slate-300 mb-2">{label}</label>
      <div className="flex items-start gap-4">
        <div
          className={`relative bg-slate-800 border border-slate-700 rounded-xl overflow-hidden ${
            aspect === "square" ? "w-24 h-24" : "w-40 h-24"
          }`}
        >
          {preview || currentUrl ? (
            <img
              src={preview || currentUrl || ""}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium cursor-pointer transition-colors">
            Choose file
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <button
              onClick={submit}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {busy ? "Uploading…" : "Upload"}
            </button>
          )}
          {currentUrl && onRemove && (
            <button
              onClick={onRemove}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
            >
              Remove
            </button>
          )}
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  busy?: boolean;
}

export function FormModal({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = "Save",
  busy = false,
}: FormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {children}
        {onSubmit && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white transition-colors"
            >
              {busy ? "Saving…" : submitLabel}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
