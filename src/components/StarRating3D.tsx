import { useState, useCallback } from "react";
import { Star } from "lucide-react";

export interface RatingOption {
  value: number;
  label: string;
  emoji: string;
  reaction: string;
  glow: string;
  accent: string;
}

export const RATING_OPTIONS: RatingOption[] = [
  { value: 1, label: "Terrible", emoji: "\uD83D\uDE21", reaction: "We hear you", glow: "rgba(239, 68, 68, 0.6)", accent: "#ef4444" },
  { value: 2, label: "Bad", emoji: "\uD83D\uDE15", reaction: "Noted, thanks", glow: "rgba(249, 115, 22, 0.6)", accent: "#f97316" },
  { value: 3, label: "Okay", emoji: "\uD83D\uDE10", reaction: "Good to know", glow: "rgba(234, 179, 8, 0.6)", accent: "#eab308" },
  { value: 4, label: "Good", emoji: "\uD83D\uDE0A", reaction: "Love that!", glow: "rgba(59, 130, 246, 0.6)", accent: "#3b82f6" },
  { value: 5, label: "Amazing", emoji: "\uD83E\uDD29", reaction: "Amazing!", glow: "rgba(168, 85, 247, 0.6)", accent: "#a855f7" },
];

interface EmojiRating3DProps {
  value: number;
  onChange: (rating: number) => void;
  onSelect?: (rating: number) => void;
  disabled?: boolean;
}

export default function EmojiRating3D({ value, onChange, onSelect, disabled }: EmojiRating3DProps) {
  const [hover, setHover] = useState(0);
  const [burstRating, setBurstRating] = useState(0);

  const handleSelect = useCallback((rating: number) => {
    if (disabled) return;
    onChange(rating);
    setBurstRating(rating);
    onSelect?.(rating);
    setTimeout(() => setBurstRating(0), 800);
  }, [disabled, onChange, onSelect]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 3D Star + Emoji buttons */}
      <div className="flex gap-2 sm:gap-3 justify-center items-end" onMouseLeave={() => setHover(0)}>
        {RATING_OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          const isHovered = hover === opt.value;
          const showBurst = burstRating === opt.value;
          const active = isSelected || isHovered;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onMouseEnter={() => !disabled && setHover(opt.value)}
              onClick={() => handleSelect(opt.value)}
              className={`emoji-card relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border w-[18%] max-w-[90px] ${
                isSelected ? "emoji-card-selected glass-card" : "glass"
              } ${disabled ? "cursor-default opacity-50" : "cursor-pointer"}`}
              style={active ? {
                borderColor: opt.accent,
                boxShadow: `0 0 30px ${opt.glow}, 0 10px 30px rgba(0,0,0,0.4)`,
              } : undefined}
              aria-label={opt.label}
            >
              {active && (
                <div className="glow-halo glow-halo-active" style={{ background: opt.glow }} />
              )}

              {showBurst && (
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    return (
                      <div
                        key={i}
                        className="particle-burst"
                        style={{
                          left: "50%",
                          top: "50%",
                          background: opt.accent,
                          ["--tx" as string]: `${Math.cos(angle) * 60}px`,
                          ["--ty" as string]: `${Math.sin(angle) * 60}px`,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              <Star
                className={`w-7 h-7 sm:w-8 sm:h-8 mb-1 transition-all duration-300 ${active ? "fill-current" : ""}`}
                style={{ color: active ? opt.accent : "#475569" }}
              />
              <span className={`text-[10px] sm:text-xs font-semibold transition-colors ${active ? "text-white" : "text-slate-500"}`}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dynamic emoji + reaction text */}
      {(hover || value) > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl glass animate-spring-in" style={{ boxShadow: `0 0 25px ${RATING_OPTIONS[(hover || value) - 1]?.glow}` }}>
          <span className="text-4xl">{RATING_OPTIONS[(hover || value) - 1]?.emoji}</span>
          <span className="text-lg font-bold" style={{ color: RATING_OPTIONS[(hover || value) - 1]?.accent }}>
            {RATING_OPTIONS[(hover || value) - 1]?.reaction}
          </span>
        </div>
      )}
    </div>
  );
}
