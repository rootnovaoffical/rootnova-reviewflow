import { ReactNode } from "react";

export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: size * 2 }}>
      <div
        className="animate-spin rounded-full border-2 border-slate-200 border-t-primary-600"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size={40} />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    TRIAL: "bg-blue-100 text-blue-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    INVITED: "bg-purple-100 text-purple-700",
    SUSPENDED: "bg-red-100 text-red-700",
    EXPIRED: "bg-slate-100 text-slate-600",
    CANCELLED: "bg-slate-100 text-slate-600",
    active: "bg-green-100 text-green-700",
    inactive: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`badge ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>{status}</span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        className="btn-secondary disabled:opacity-40"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </span>
      <button
        className="btn-secondary disabled:opacity-40"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
