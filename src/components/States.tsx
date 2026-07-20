export function Loading({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-primary-500/20 rounded-full animate-pulse-glow" />
          </div>
        </div>
        {message && <p className="text-sm text-slate-400">{message}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ title, subtitle, message, action }: { title: string; subtitle?: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {(subtitle || message) && <p className="text-sm text-slate-400 mt-1">{subtitle || message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-error-500/20 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h3 className="text-lg font-semibold text-white">Something went wrong</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-md">{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors">Try again</button>}
    </div>
  );
}
