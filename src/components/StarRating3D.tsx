import { useState, useRef, useCallback } from "react";

export interface RatingOption {
  value: number;
  label: string;
  emoji: string;
  glow: string;
}

export const RATING_OPTIONS: RatingOption[] = [
  { value: 1, label: "Terrible", emoji: "\uD83D\uDE21", glow: "rgba(239, 68, 68, 0.6)" },
  { value: 2, label: "Bad", emoji: "\uD83D\uDE15", glow: "rgba(249, 115, 22, 0.6)" },
  { value: 3, label: "Okay", emoji: "\uD83D\uDE10", glow: "rgba(234, 179, 8, 0.6)" },
  { value: 4, label: "Good", emoji: "\uD83D\uDE0A", glow: "rgba(59, 130, 246, 0.6)" },
  { value: 5, label: "Amazing", emoji: "\uD83E\uDD29", glow: "rgba(168, 85, 247, 0.6)" },
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
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback((rating: number) => {
    if (disabled) return;
    onChange(rating);
    setBurstRating(rating);
    onSelect?.(rating);
    setTimeout(() => setBurstRating(0), 800);
  }, [disabled, onChange, onSelect]);

  return (
    <div ref={containerRef} className="flex gap-2 sm:gap-3 justify-center items-end" onMouseLeave={() => setHover(0)}>
      {RATING_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        const isHovered = hover === opt.value;
        const showBurst = burstRating === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHover(opt.value)}
            onClick={() => handleSelect(opt.value)}
            className={`emoji-card relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border w-[18%] max-w-[90px] ${
              isSelected
                ? "emoji-card-selected glass-card"
                : "glass"
            } ${disabled ? "cursor-default opacity-50" : "cursor-pointer"}`}
            style={isSelected || isHovered ? {
              borderColor: isSelected ? `${opt.glow.replace("0.6", "0.8")}` : "rgba(255,255,255,0.15)",
              boxShadow: `0 0 30px ${opt.glow}, 0 10px 30px rgba(0,0,0,0.4)`,
            } : undefined}
            aria-label={opt.label}
          >
            {/* Glow halo */}
            {(isSelected || isHovered) && (
              <div
                className="glow-halo glow-halo-active"
                style={{ background: opt.glow }}
              />
            )}

            {/* Particle burst on selection */}
            {showBurst && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 8 }).map((_, i) => {
                  const angle = (i / 8) * Math.PI * 2;
                  const tx = Math.cos(angle) * 60;
                  const ty = Math.sin(angle) * 60;
                  return (
                    <div
                      key={i}
                      className="particle-burst"
                      style={{
                        left: "50%",
                        top: "50%",
                        background: opt.glow.replace("0.6", "1"),
                        ["--tx" as string]: `${tx}px`,
                        ["--ty" as string]: `${ty}px`,
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Emoji */}
            <span
              className={`text-3xl sm:text-4xl mb-1 transition-transform duration-300 ${isSelected ? "scale-125" : isHovered ? "scale-110" : "scale-100"}`}
              style={{ filter: isSelected || isHovered ? `drop-shadow(0 4px 12px ${opt.glow})` : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
            >
              {opt.emoji}
            </span>

            {/* Label */}
            <span className={`text-[10px] sm:text-xs font-semibold transition-colors ${isSelected || isHovered ? "text-white" : "text-slate-500"}`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
