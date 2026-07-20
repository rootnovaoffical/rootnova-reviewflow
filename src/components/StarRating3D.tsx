import { useState, useRef, useEffect, useCallback } from "react";

interface StarRating3DProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

const RATING_REACTIONS: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: "\u{1F641}", label: "We hear you", color: "#94a3b8" },
  2: { emoji: "\u{1F610}", label: "Thanks for honesty", color: "#a8a29e" },
  3: { emoji: "\u{1F642}", label: "Good to know", color: "#facc15" },
  4: { emoji: "\u{1F60A}", label: "Glad you enjoyed it", color: "#fbbf24" },
  5: { emoji: "\u{1F929}", label: "Amazing!", color: "#fde047" },
};

interface Burst { id: number; x: number; y: number; }

export default function StarRating3D({ value, onChange, disabled }: StarRating3DProps) {
  const [hover, setHover] = useState(0);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstId = useRef(0);
  const reduceMotion = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const display = hover || value;
  const reaction = RATING_REACTIONS[value] || null;

  const handleSelect = useCallback((star: number, e: React.MouseEvent) => {
    if (disabled) return;
    if (reduceMotion.current) { onChange(star); return; }
    setSelecting(star);
    const rect = containerRef.current?.getBoundingClientRect();
    const starEl = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect ? starEl.left + starEl.width / 2 - rect.left : 0;
    const y = rect ? starEl.top + starEl.height / 2 - rect.top : 0;
    const id = burstId.current++;
    setBursts((b) => [...b, { id, x, y }]);
    setTimeout(() => setBursts((b) => b.filter((bu) => bu.id !== id)), 900);
    setTimeout(() => setSelecting(null), 600);
    onChange(star);
  }, [disabled, onChange]);

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-6 select-none">
      <div
        className="flex gap-2 sm:gap-4 justify-center"
        onMouseLeave={() => !disabled && setHover(0)}
        style={{ perspective: "800px" }}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= display;
          const isSelecting = selecting === star;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onMouseEnter={() => !disabled && setHover(star)}
              onClick={(e) => handleSelect(star, e)}
              onTouchStart={(e) => { if (!disabled) { e.preventDefault(); setHover(star); } }}
              className={`star3d-btn relative text-4xl sm:text-6xl transition-all duration-500 ${disabled ? "cursor-default" : "cursor-pointer"} ${active ? "star-glow" : "star-dim"}`}
              style={{
                transform: active
                  ? `perspective(600px) rotateX(${isSelecting ? 0 : 12}deg) rotateY(${isSelecting ? 0 : -8}deg) scale(${isSelecting ? 1.5 : 1.15})`
                  : "perspective(600px) rotateX(0deg) scale(1)",
                transformStyle: "preserve-3d",
                color: active ? "#fbbf24" : "#475569",
                textShadow: active ? "0 0 20px rgba(251,191,36,0.6), 0 4px 12px rgba(251,191,36,0.3)" : "none",
                animation: isSelecting ? "star-pop 0.6s cubic-bezier(0.34,1.56,0.64,1)" : active ? "star-float 3s ease-in-out infinite" : "none",
                animationDelay: active ? `${star * 0.15}s` : "0s",
              }}
            >
              <span style={{ display: "inline-block" }}>{active ? "\u2605" : "\u2606"}</span>
            </button>
          );
        })}
      </div>

      {bursts.map((b) => (
        <div key={b.id} className="star-burst" style={{ left: b.x, top: b.y }} />
      ))}

      {reaction && (
        <div
          className="flex flex-col items-center gap-1 animate-reaction-in"
          key={value}
        >
          <span
            className="text-5xl sm:text-6xl"
            style={{
              animation: "reaction-bounce 0.8s cubic-bezier(0.34,1.56,0.64,1)",
              filter: `drop-shadow(0 0 12px ${reaction.color}80)`,
            }}
          >
            {reaction.emoji}
          </span>
          <span className="text-sm font-medium text-slate-300">{reaction.label}</span>
        </div>
      )}

      {!reaction && (
        <div className="h-20 flex items-center">
          <p className="text-sm text-slate-500">Tap a star to rate your experience</p>
        </div>
      )}
    </div>
  );
}
