import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string; }
interface ToastContextType { showToast: (type: ToastType, message: string) => void; }

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg backdrop-blur-md text-sm font-medium max-w-sm ${
              t.type === 'success' ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-200'
              : t.type === 'error' ? 'bg-red-500/20 border border-red-400/30 text-red-200'
              : 'bg-blue-500/20 border border-blue-400/30 text-blue-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
