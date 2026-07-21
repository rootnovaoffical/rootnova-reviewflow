import { createContext, useContext, useCallback, useState, ReactNode } from "react";
export interface Toast { id: string; message: string; type: "success" | "error" | "info"; }
interface ToastContextValue { toasts: Toast[]; showToast: (message: string, type?: Toast["type"]) => void; dismissToast: (id: string) => void; }
const ToastContext = createContext<ToastContextValue | undefined>(undefined);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => dismissToast(id), 4000);
  }, [dismissToast]);
  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg backdrop-blur-md border text-sm font-medium animate-slide-up cursor-pointer ${t.type === "success" ? "bg-success-500/20 border-success-500/40 text-success-400" : t.type === "error" ? "bg-error-500/20 border-error-500/40 text-error-400" : "bg-primary-500/20 border-primary-500/40 text-primary-300"}`} onClick={() => dismissToast(t.id)}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
