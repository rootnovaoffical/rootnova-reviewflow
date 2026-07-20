// Lightweight SVG chart components — no external deps.

import { useMemo } from "react";

// Line / area chart for sessions over time.
export function AreaChart({ data, height = 180, color = "#818cf8" }: { data: { date: string; count: number }[]; height?: number; color?: string }) {
  const width = 600;
  const padding = { top: 12, right: 8, bottom: 24, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const { path, areaPath, max, points } = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.count));
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
    const points = data.map((d, i) => ({
      x: padding.left + i * stepX,
      y: padding.top + innerH - (d.count / max) * innerH,
      ...d,
    }));
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaPath = `${path} L${padding.left + innerW},${padding.top + innerH} L${padding.left},${padding.top + innerH} Z`;
    return { path, areaPath, max, points };
  }, [data, innerW, innerH]);

  if (data.length === 0 || max === 0) {
    return <div className="flex items-center justify-center text-sm text-slate-500" style={{ height }}>No data yet</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1={padding.left} x2={padding.left + innerW} y1={padding.top + innerH * t} y2={padding.top + innerH * t} stroke="#1e293b" strokeWidth="1" />
      ))}
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}
    </svg>
  );
}

// Bar chart for rating distribution.
export function BarChart({ data, height = 180, color = "#a855f7" }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
          <span className="text-xs text-slate-400 font-medium">{d.value}</span>
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: d.value > 0 ? "4px" : "0",
              background: `linear-gradient(to top, ${color}, ${color}99)`,
            }}
          />
          <span className="text-xs text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// Donut chart for sentiment split.
export function DonutChart({ data, size = 160 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = size / 2;
  const stroke = 22;
  const circ = 2 * Math.PI * (radius - stroke / 2);

  let offset = 0;
  const segments = data.map((d) => {
    const frac = total > 0 ? d.value / total : 0;
    const seg = { ...d, dash: frac * circ, gap: circ - frac * circ, offset: -offset };
    offset += frac * circ;
    return seg;
  });

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={radius} cy={radius} r={radius - stroke / 2} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        {total > 0 && segments.map((s, i) => (
          <circle
            key={i}
            cx={radius}
            cy={radius}
            r={radius - stroke / 2}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={s.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
            <span className="text-slate-300">{d.label}</span>
            <span className="text-slate-500 font-medium ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Horizontal bar list for top categories.
export function BarList({ data, color = "#818cf8" }: { data: { category: string; count: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) return <p className="text-sm text-slate-500">No data yet</p>;
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-sm text-slate-300 w-32 truncate shrink-0">{d.category}</span>
          <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.count / max) * 100}%`, background: color }} />
          </div>
          <span className="text-xs text-slate-400 font-medium w-8 text-right">{d.count}</span>
        </div>
      ))}
    </div>
  );
}
