import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) { setValue(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

interface StatTileProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  hint?: string;
  accent?: "primary" | "accent" | "success" | "warning" | "error";
  delay?: number;
}

const accentMap = {
  primary: { from: "from-primary-500/15", glow: "shadow-[0_0_30px_-8px_rgba(99,102,241,0.4)]", text: "text-primary-300" },
  accent: { from: "from-accent-500/15", glow: "shadow-[0_0_30px_-8px_rgba(34,211,238,0.4)]", text: "text-accent-400" },
  success: { from: "from-success-500/15", glow: "shadow-[0_0_30px_-8px_rgba(34,197,94,0.4)]", text: "text-success-400" },
  warning: { from: "from-warning-500/15", glow: "shadow-[0_0_30px_-8px_rgba(250,204,21,0.4)]", text: "text-warning-400" },
  error: { from: "from-error-500/15", glow: "shadow-[0_0_30px_-8px_rgba(239,68,68,0.4)]", text: "text-error-400" },
};

export function StatTile({ label, value, suffix, icon, hint, accent = "primary", delay = 0 }: StatTileProps) {
  const animated = useCountUp(value);
  const a = accentMap[accent];
  return (
    <div
      className={`glass rounded-2xl p-5 relative overflow-hidden ${a.glow} hover:scale-[1.02] transition-transform duration-300 animate-fade-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${a.from} to-transparent blur-2xl`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-white mt-1.5 tabular-nums">
            {Number.isInteger(value) ? Math.round(animated) : animated.toFixed(1)}
            {suffix}
          </p>
          {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
        </div>
        <div className={`text-2xl ${a.text} opacity-80`}>{icon}</div>
      </div>
    </div>
  );
}

export function RatingDistribution({ ratings }: { ratings: number[] }) {
  const dist = [5, 4, 3, 2, 1].map((star) => ({ star, count: ratings.filter((r) => r === star).length }));
  const total = ratings.length || 1;
  return (
    <div className="space-y-2">
      {dist.map(({ star, count }) => {
        const pct = (count / total) * 100;
        return (
          <div key={star} className="flex items-center gap-3">
            <span className="text-sm text-slate-400 w-12 flex items-center gap-0.5">
              {star} <span className="text-warning-400 text-xs">{"\u2B50"}</span>
            </span>
            <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-400 transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm text-slate-300 w-8 text-right tabular-nums">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Sparkline({ data, height = 48 }: { data: number[]; height?: number }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const w = 100;
  const h = height;
  const step = w / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => `${i * step},${h - (d / max) * h}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(99,102,241,0.4)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0)" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#spark-grad)" />
      <polyline points={points} fill="none" stroke="rgba(99,102,241,0.8)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
