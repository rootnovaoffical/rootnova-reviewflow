import { type ReactNode } from "react";

export function Modal({ open, onClose, title, children, maxWidth = 480 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; maxWidth?: number }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full overflow-hidden slide-up-fade" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, danger, confirmLabel = "Confirm", onConfirm, onCancel, onClose }: { open: boolean; title: string; message: string; danger?: boolean; confirmLabel?: string; onConfirm: () => void | Promise<void>; onCancel?: () => void; onClose?: () => void }) {
  const handleClose = onCancel || onClose || (() => {});
  return (
    <Modal open={open} onClose={handleClose} title={title} maxWidth={400}>
      <p className="text-slate-300 text-sm mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={handleClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
        <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-sm text-white ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-brand-600 hover:bg-brand-700"}`}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
