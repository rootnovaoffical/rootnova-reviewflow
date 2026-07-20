/**
 * Skeleton — intelligent loading placeholders that match content shape.
 * Purpose: feels intentional rather than a generic spinner.
 */

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`shimmer-card rounded-2xl ${className}`} style={{ minHeight: "120px" }} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="shimmer-card rounded h-3" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="shimmer-card rounded-2xl p-5" style={{ minHeight: "110px" }}>
      <div className="shimmer-card rounded h-3 w-20 mb-3" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="shimmer-card rounded h-8 w-16" style={{ background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

export function SkeletonStatGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
    </div>
  );
}

export function SkeletonList({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="shimmer-card rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="flex items-start gap-3">
            <div className="shimmer-card rounded h-6 w-24" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="flex-1 space-y-2">
              <div className="shimmer-card rounded h-3 w-full" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="shimmer-card rounded h-3 w-2/3" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="shimmer-card rounded-2xl p-6" style={{ minHeight: "200px", background: "rgba(255,255,255,0.03)" }}>
      <div className="shimmer-card rounded h-4 w-32 mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="shimmer-card rounded h-3 w-8" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="flex-1 shimmer-card rounded h-2.5" style={{ width: `${80 - i * 12}%`, background: "rgba(255,255,255,0.06)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Intelligent loading state with context message */
export function IntelligentLoading({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative">
        <div className="w-12 h-12 border-3 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 bg-primary-500/20 rounded-full animate-pulse-glow" />
        </div>
      </div>
      <p className="text-sm text-slate-400 mt-4 animate-pulse">{message || "Loading your dashboard..."}</p>
    </div>
  );
}
